import { useState } from 'react'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { useToastContext } from '../contexts/ToastContext'
import { updateLeadStage } from '../services/leadService'
import { supabase } from '../services/supabaseClient'
import type { Lead } from '../types'

interface UseDragAndDropProps {
  leadsByStage: { [key: string]: Lead[] }
  setLeadsByStage: React.Dispatch<React.SetStateAction<{ [key: string]: Lead[] }>>
}

// Função para verificar autenticação
async function verifyAuthentication() {
  const { data: { user } } = await supabase.auth.getUser()
  return {
    authenticated: !!user,
    user
  }
}

// Permitir que usuários autenticados (inclui vendedores) movam leads entre etapas.
// A autorização fina deve ser garantida pelo backend (RLS) em updateLeadStage.
function canUserModifyLead(_user: any, _lead: Lead) {
  return true
}

// Função para refresh do token
async function refreshAuthToken() {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    return {
      success: !error,
      data,
      error
    }
  } catch (error) {
    return {
      success: false,
      error
    }
  }
}

export function useDragAndDrop({ leadsByStage, setLeadsByStage }: UseDragAndDropProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { showError, showInfo } = useToastContext()

  const handleDragStart = (event: DragStartEvent) => {
    const leadId = event.active.id as string
    console.log('🚀 handleDragStart chamado para lead:', leadId)
    setActiveId(leadId)
  }

  const handleDragOver = () => {
    // Lógica para drag over se necessário
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('🎯 handleDragEnd chamado:', { activeId: active.id, overId: over?.id })
    
    if (!over) {
      console.log('📍 Não há área de drop válida')
      setActiveId(null) // Limpar apenas se não há área válida
      return
    }
    
    const leadId = active.id as string
    
    // CORRIGIDO: over.id pode ser stage.id OU lead.id
    // Se over.id é um lead, encontrar a stage desse lead
    let newStageId = over.id as string
    
    // Verificar se over.id é um lead ID (não stage ID)
    const isOverIdALead = Object.values(leadsByStage).some(stageLeads => 
      stageLeads.some(lead => lead.id === newStageId)
    )
    
    if (isOverIdALead) {
      // over.id é um lead, encontrar a stage desse lead
      const foundStageId = Object.keys(leadsByStage).find(stageId => 
        leadsByStage[stageId].some(lead => lead.id === newStageId)
      )
      if (foundStageId) {
        newStageId = foundStageId
        console.log(`🔄 over.id era um lead (${over.id}), convertido para stage: ${newStageId}`)
      }
    }
    
    console.log(`📍 Target final: ${newStageId} (${isOverIdALead ? 'era lead' : 'era stage'})`)
    
    // Encontrar etapa atual do lead
    const currentStageId = Object.keys(leadsByStage).find(stageId => 
      leadsByStage[stageId].some(lead => lead.id === leadId)
    )
    
    if (!currentStageId) {
      console.error('❌ Etapa atual do lead não encontrada')
      setActiveId(null) // Limpar apenas em caso de erro
      return
    }
    
    console.log(`📍 Lead está em: ${currentStageId}, target detectado: ${newStageId}`)
    
    // Se o lead foi solto na mesma etapa, limpar activeId e retornar
    if (currentStageId === newStageId) {
      console.log('📌 Lead solto na mesma etapa, nenhuma alteração necessária')
      setActiveId(null) // CORRIGIDO: Limpar activeId aqui para mesma etapa
      return
    }
    
    // CORRIGIDO: Só limpar activeId quando realmente vai processar o movimento
    setActiveId(null)
    
    console.log(`🔄 Movendo lead ${leadId} de ${currentStageId} para ${newStageId}`)
    
    // Fazer atualização otimista primeiro
    const leadToMove = leadsByStage[currentStageId].find(lead => lead.id === leadId)
    
    if (!leadToMove) {
      console.error('❌ Lead a ser movido não encontrado')
      return
    }
    
    // Atualizar estado local imediatamente (otimistic update)
    setLeadsByStage(prev => {
      const newState = {
        ...prev,
        [currentStageId]: prev[currentStageId].filter(lead => lead.id !== leadId),
        [newStageId]: [...(prev[newStageId] || []), { ...leadToMove, stage_id: newStageId }]
      }
      console.log('✅ Estado local atualizado otimisticamente')
      return newState
    })
    
    try {
      // Verificação robusta de autenticação
      const authCheck = await verifyAuthentication()
      if (!authCheck.authenticated || !authCheck.user) {
        throw new Error('Usuário não autenticado. Faça login novamente.')
      }
      
      // Verificar permissão usando helper
      if (!canUserModifyLead(authCheck.user, leadToMove)) {
        throw new Error('Você não tem permissão para mover este lead.')
      }
      
      console.log(`👤 Verificação completa - Usuário: ${authCheck.user.id}, Lead: ${leadToMove.responsible_uuid}`)
      
      // Tentar atualizar no banco
      await updateLeadStage(leadId, newStageId)
      console.log('✅ Lead atualizado no banco com sucesso')
    } catch (error) {
      console.error('❌ Erro ao mover lead no banco:', error)
      
      // Reverter estado local em caso de erro
      setLeadsByStage(prev => {
        const revertState = {
          ...prev,
          [newStageId]: prev[newStageId].filter(lead => lead.id !== leadId),
          [currentStageId]: [...(prev[currentStageId] || []), leadToMove]
        }
        console.log('🔄 Estado local revertido devido a erro')
        return revertState
      })
      
      // Tratamento inteligente de erros
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('💥 Erro detalhado:', error)
      
      if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
        // Tentar refresh do token e retry
        console.log('🔄 Tentando refresh do token...')
        const refreshResult = await refreshAuthToken()
        
        if (refreshResult.success) {
          showInfo('Token atualizado', 'Tente mover o lead novamente.')
        } else {
          showError('Sessão expirada', 'Faça login novamente.')
          setTimeout(() => window.location.href = '/', 1000)
        }
      } else if (errorMessage.includes('não autenticado')) {
        showError('Sessão expirada', 'Redirecionando para login...')
        setTimeout(() => window.location.href = '/', 1000)
      } else {
        showError('Erro ao mover lead', errorMessage)
      }
    }
  }

  return {
    activeId,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  }
} 