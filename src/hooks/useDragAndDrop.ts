import { useState } from 'react'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { useToastContext } from '../contexts/ToastContext'
import { useAuthContext } from '../contexts/AuthContext'
import { updateLeadStage } from '../services/leadService'
import { supabase } from '../services/supabaseClient'
import type { Lead } from '../types'

// Dados de um movimento pendente (aguardando confirmação do modal)
export interface PendingStageMove {
  leadId: string
  leadName: string
  fromStageId: string
  toStageId: string
}

interface UseDragAndDropProps {
  leadsByStage: { [key: string]: Lead[] }
  setLeadsByStage: React.Dispatch<React.SetStateAction<{ [key: string]: Lead[] }>>
  requireStageChangeNotes?: boolean
  onStageChangePending?: (pending: PendingStageMove) => void
}

// Função para verificar autenticação
async function verifyAuthentication() {
  const { data: { user } } = await supabase.auth.getUser()
  return {
    authenticated: !!user,
    user
  }
}

// Regra de autorização client-side para movimentação no Kanban.
// Admins podem mover qualquer lead; vendedores só podem mover leads dos quais
// são responsáveis ou que ainda não têm responsável (pool do pipeline).
function canUserModifyLead(user: { id?: string } | null, isAdmin: boolean, lead: Lead) {
  if (isAdmin) return true
  if (!user?.id) return false
  if (!lead.responsible_uuid) return true
  return lead.responsible_uuid === user.id
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

export function useDragAndDrop({
  leadsByStage,
  setLeadsByStage,
  requireStageChangeNotes = false,
  onStageChangePending,
}: UseDragAndDropProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { showError, showInfo } = useToastContext()
  const { isAdmin } = useAuthContext()

  const handleDragStart = (event: DragStartEvent) => {
    const leadId = event.active.id as string
    console.log('🚀 handleDragStart chamado para lead:', leadId)
    setActiveId(leadId)
  }

  const handleDragOver = () => {
    // Lógica para drag over se necessário
  }

  // Executa o movimento real (otimistic update + banco)
  const executeStageMove = async (leadId: string, fromStageId: string, toStageId: string, stageChangeNotes?: string) => {
    const leadToMove = leadsByStage[fromStageId]?.find(lead => lead.id === leadId)
    
    if (!leadToMove) {
      console.error('❌ Lead a ser movido não encontrado')
      return
    }

    // Guard defensivo: antes do optimistic update, validar autorização local.
    // Evita feedback falso-positivo ao vendedor que não possui o lead.
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!canUserModifyLead(authUser, isAdmin, leadToMove)) {
      showError('Sem permissão', 'Você não é responsável por este lead.')
      return
    }

    // Atualizar estado local imediatamente (otimistic update)
    setLeadsByStage(prev => {
      const newState = {
        ...prev,
        [fromStageId]: prev[fromStageId].filter(lead => lead.id !== leadId),
        [toStageId]: [{ ...leadToMove, stage_id: toStageId }, ...(prev[toStageId] || [])]
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
      
      // Verificar permissão usando helper (revalida após refresh do authCheck)
      if (!canUserModifyLead(authCheck.user, isAdmin, leadToMove)) {
        throw new Error('Você não tem permissão para mover este lead.')
      }
      
      console.log(`👤 Verificação completa - Usuário: ${authCheck.user.id}, Lead: ${leadToMove.responsible_uuid}`)
      
      // Tentar atualizar no banco
      await updateLeadStage(leadId, toStageId, stageChangeNotes)
      console.log('✅ Lead atualizado no banco com sucesso')
    } catch (error) {
      console.error('❌ Erro ao mover lead no banco:', error)
      
      // Reverter estado local em caso de erro
      setLeadsByStage(prev => {
        const revertState = {
          ...prev,
          [toStageId]: prev[toStageId].filter(lead => lead.id !== leadId),
          [fromStageId]: [...(prev[fromStageId] || []), leadToMove]
        }
        console.log('🔄 Estado local revertido devido a erro')
        return revertState
      })
      
      // Tratamento inteligente de erros
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('💥 Erro detalhado:', error)
      
      if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('🎯 handleDragEnd chamado:', { activeId: active.id, overId: over?.id })
    
    if (!over) {
      console.log('📍 Não há área de drop válida')
      setActiveId(null)
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
      setActiveId(null)
      return
    }
    
    console.log(`📍 Lead está em: ${currentStageId}, target detectado: ${newStageId}`)
    
    // Se o lead foi solto na mesma etapa, limpar activeId e retornar
    if (currentStageId === newStageId) {
      console.log('📌 Lead solto na mesma etapa, nenhuma alteração necessária')
      setActiveId(null)
      return
    }
    
    setActiveId(null)
    
    console.log(`🔄 Movendo lead ${leadId} de ${currentStageId} para ${newStageId}`)
    
    const leadToMove = leadsByStage[currentStageId].find(lead => lead.id === leadId)
    
    if (!leadToMove) {
      console.error('❌ Lead a ser movido não encontrado')
      return
    }

    // Se pipeline exige notas na mudança de estágio, delegar para o modal
    if (requireStageChangeNotes && onStageChangePending) {
      onStageChangePending({
        leadId,
        leadName: leadToMove.name,
        fromStageId: currentStageId,
        toStageId: newStageId,
      })
      return
    }

    // Caso contrário, executar normalmente
    await executeStageMove(leadId, currentStageId, newStageId)
  }

  return {
    activeId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    executeStageMove,
  }
}
