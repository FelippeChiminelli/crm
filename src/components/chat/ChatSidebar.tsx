import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon, TrashIcon, EyeIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatConversation, WhatsAppInstance, Lead } from '../../types'
import { getChatConversations, getWhatsAppInstances, deleteChatConversation, linkConversationToLead } from '../../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../../services/instancePermissionService'
import { getLeadByPhone, getLeadById } from '../../services/leadService'
import { useAuthContext } from '../../contexts/AuthContext'
import { getPipelines } from '../../services/pipelineService'
// import { ConnectInstanceModal } from './ConnectInstanceModal'
import { LeadDetailModal } from '../leads/LeadDetailModal'
import { NewLeadModal } from '../kanban/modals/NewLeadModal'
import { ReconnectInstanceModal } from './ReconnectInstanceModal'
import { useToastContext } from '../../contexts/ToastContext'
import { useConfirm } from '../../hooks/useConfirm'

interface ChatSidebarProps {
  selectedConversation: ChatConversation | null
  onSelectConversation: (conversation: ChatConversation | null) => void
}

export function ChatSidebar({ 
  selectedConversation, 
  onSelectConversation
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [allowedInstanceIds, setAllowedInstanceIds] = useState<string[] | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  // const [showConnectModal, setShowConnectModal] = useState(false)
  // Removido: exclusão de instância agora apenas na página de Admin
  
  // Estados para o modal de lead
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [currentLead, setCurrentLead] = useState<Lead | null>(null)
  const [conversationForLead, setConversationForLead] = useState<ChatConversation | null>(null)
  
  // Estados para NewLeadModal
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)
  const [pipelines, setPipelines] = useState<any[]>([])

  // Estados para modal de reconexão
  const [showReconnectModal, setShowReconnectModal] = useState(false)
  const [instanceToReconnect, setInstanceToReconnect] = useState<WhatsAppInstance | null>(null)

  const { showError } = useToastContext()
  const { confirm } = useConfirm()
  const { isAdmin } = useAuthContext()
  // Helpers para não lidas (baseado em última abertura x último evento)
  const lastOpenKey = (conversationId: string) => `conv_last_open_ts_${conversationId}`
  const hasUnseen = (conversation: ChatConversation): boolean => {
    try {
      const lastEventTs = conversation.last_message_time || (conversation as any).updated_at
      if (!lastEventTs) return false
      const lastOpenTs = localStorage.getItem(lastOpenKey(conversation.id))
      if (!lastOpenTs) return true
      return new Date(lastEventTs).getTime() > new Date(lastOpenTs).getTime()
    } catch {
      return false
    }
  }
  const markAsOpened = (conversationId: string) => {
    try { localStorage.setItem(lastOpenKey(conversationId), new Date().toISOString()) } catch {}
  }



  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [conversationsData, instancesData] = await Promise.all([
        getChatConversations({ search: searchTerm, instance_id: selectedInstanceId === 'ALL' ? undefined : selectedInstanceId }),
        getWhatsAppInstances()
      ])
      
      const sorted = [...conversationsData].sort((a: any, b: any) => {
        const ta = new Date(a.last_message_time || a.updated_at || 0).getTime()
        const tb = new Date(b.last_message_time || b.updated_at || 0).getTime()
        return tb - ta
      })
      setConversations(sorted)
      setInstances(instancesData)
      // Carregar permissões de instância do usuário
      try {
        const { data: allowed } = await getAllowedInstanceIdsForCurrentUser()
        setAllowedInstanceIds(allowed)
        if (!isAdmin) {
          if (allowed && allowed.length > 0) {
            setSelectedInstanceId(prev => (prev === 'ALL' ? allowed[0] : prev))
          } else {
            // Sem permissões: ocultar todas as instâncias e não selecionar nada
            setSelectedInstanceId('ALL')
          }
        }
      } catch {}
    } catch (error) {
      console.error('Erro ao carregar dados do chat:', error)
    } finally {
      setLoading(false)
    }
  }

  // Recarregar quando filtro de instância ou busca mudarem (com debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      loadData()
    }, 300)
    return () => clearTimeout(t)
  }, [selectedInstanceId, searchTerm])

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return ''
    
    // parseISO garante que timestamps UTC sejam interpretados corretamente
    const date = parseISO(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm', { locale: ptBR })
    } else if (diffInHours < 48) {
      return 'Ontem'
    } else {
      return format(date, 'dd/MM', { locale: ptBR })
    }
  }

  // Conexão de instância agora é feita na Administração

  // Removido: exclusão de instância agora apenas na página de Admin

  const handleDeleteConversation = async (conversationId: string) => {
    const confirmed = await confirm({
      title: 'Excluir Conversa',
      message: 'Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita e todas as mensagens serão perdidas.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    
    if (!confirmed) {
      return
    }

    try {
      // Remover a conversa da lista local imediatamente (otimisticamente)
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      
      // Se a conversa deletada era a selecionada, limpar a seleção
      if (selectedConversation?.id === conversationId) {
        onSelectConversation(null) // Passar null em vez de objeto vazio
      }
      
      // Deletar no backend
      await deleteChatConversation(conversationId)
      
    } catch (error) {
      console.error('Erro ao deletar conversa:', error)
      showError('Erro ao deletar conversa. Tente novamente.')
      
      // Recarregar dados em caso de erro
      loadData()
    }
  }

  const handleViewLead = async (conversation: ChatConversation) => {
    try {
      // Verificar se a conversa tem os dados necessários
      if (!conversation || !conversation.id) {
        showError('Dados da conversa inválidos')
        return
      }
      
      if (!conversation.lead_phone) {
        showError('Conversa sem número de telefone')
        return
      }
      
      setConversationForLead(conversation)
      
      // Se a conversa já tem um lead vinculado, buscar os dados do lead
      if (conversation.lead_id) {
        // Buscar o lead pelo ID em vez do telefone
        const { data: lead, error } = await getLeadById(conversation.lead_id)
        
        if (error || !lead) {
          // Se não encontrou o lead por ID, tentar por telefone
          const { data: leadByPhone, error: phoneError } = await getLeadByPhone(conversation.lead_phone)
          
          if (phoneError || !leadByPhone) {
            // Se não encontrou lead, criar um novo com dados da conversa
            const newLead: Lead = {
              id: 'temp-' + Date.now(),
              name: conversation.lead_name,
              phone: conversation.lead_phone,
              email: '',
              company: '',
              value: 0,
              status: '',
              origin: 'WhatsApp',
              notes: `Conversa iniciada via WhatsApp\nNome no WhatsApp: ${conversation.Nome_Whatsapp || 'Não informado'}`,
              pipeline_id: '',
              stage_id: '',
              empresa_id: '',
              created_at: new Date().toISOString()
            }
            setCurrentLead(newLead)
            setShowLeadModal(true)
          } else {
            // Se encontrou lead por telefone, mostrar modal de detalhes
            setCurrentLead(leadByPhone)
            setShowLeadModal(true)
          }
        } else {
          // Se encontrou lead por ID, mostrar modal de detalhes
          setCurrentLead(lead)
          setShowLeadModal(true)
        }
      } else {
        // Se não tem lead vinculado, buscar por telefone
        const { data: leadByPhone, error: phoneError } = await getLeadByPhone(conversation.lead_phone)
        
        if (phoneError || !leadByPhone) {
          // Se não encontrou lead, abrir modal para criar novo
          setShowNewLeadModal(true)
        } else {
          // Se encontrou lead, mostrar modal de detalhes
          setCurrentLead(leadByPhone)
          setShowLeadModal(true)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar lead:', error)
      showError('Erro ao buscar informações do lead. Tente novamente.')
    }
  }

  const handleLeadUpdate = (updatedLead: Lead) => {
    setCurrentLead(updatedLead)
    setShowLeadModal(false)
    setConversationForLead(null)
    
    // Atualizar a lista de conversas localmente se a conversa foi vinculada
    if (conversationForLead && updatedLead) {
      setConversations(prev => prev.map(conv => 
        conv.id === conversationForLead.id 
          ? { ...conv, lead_id: updatedLead.id, lead_name: updatedLead.name }
          : conv
      ))
    }
  }

  // Função para abrir modal de novo lead
  const handleCreateNewLead = () => {
    setShowNewLeadModal(true)
  }



  // Carregar pipelines
  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const { data: pipelinesData, error } = await getPipelines()
        if (error) throw error
        setPipelines(pipelinesData || [])
      } catch (error) {
        console.error('Erro ao carregar pipelines:', error)
        setPipelines([])
      }
    }
    
    if (showNewLeadModal) {
      loadPipelines()
    }
  }, [showNewLeadModal])

  // Log dos estados dos modais
  useEffect(() => {
    // Removido logs excessivos que causam re-renderizações
  }, [showLeadModal, currentLead, conversationForLead])

  return (
    <div className="w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm h-full">
      {/* Header */}
      <div className="p-3 lg:p-4 bg-gradient-to-r from-primary-500 to-primary-600 border-b border-primary-400">
        <div className="flex items-center justify-between mb-2 lg:mb-3">
          <h2 className="text-base lg:text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-7 h-7 lg:w-8 lg:h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <span className="hidden sm:inline">Chat WhatsApp</span>
            <span className="sm:hidden">Conversas</span>
          </h2>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Atualizar conversas"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Campo de busca */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/30 transition-all duration-200 text-sm"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Carregando conversas...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-center">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => {
              const unseen = hasUnseen(conversation);
              return (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-primary-50 border-primary-200 shadow-sm'
                    : (unseen && selectedConversation?.id !== conversation.id)
                      ? 'bg-primary-50/60 border-primary-200'
                      : 'bg-white hover:bg-gray-50 border-transparent hover:border-gray-200'
                }`}
                onClick={() => { markAsOpened(conversation.id); setConversations(prev => [...prev]); onSelectConversation(conversation) }}
              >
                {(unseen && selectedConversation?.id !== conversation.id) && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r" />
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className={`text-sm ${
                        (unseen && selectedConversation?.id !== conversation.id)
                          ? 'font-extrabold text-gray-900'
                          : 'font-semibold text-gray-900'
                      } truncate`}>
                        {conversation.lead_name}
                      </h4>
                      {(unseen && selectedConversation?.id !== conversation.id) && (
                        <span className="inline-flex w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                      )}
                      {conversation.lead_company && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {conversation.lead_company}
                        </span>
                      )}
                    </div>
                    
                    {/* Nome do WhatsApp */}
                    {conversation.Nome_Whatsapp && (
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {conversation.Nome_Whatsapp}
                      </p>
                    )}
                    
                    {/* Tags do lead */}
                    {conversation.lead_id && conversation.lead_tags && conversation.lead_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {conversation.lead_tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 truncate max-w-[80px]"
                            title={tag}
                          >
                            {tag}
                          </span>
                        ))}
                        {conversation.lead_tags.length > 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                            +{conversation.lead_tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {conversation.last_message_time ? formatLastMessageTime(conversation.last_message_time) : ''}
                        </span>
                        {conversation.unread_count > 0 && (
                          <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {conversation.lead_id ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewLead(conversation)
                        }}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                        title="Ver detalhes do lead"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConversationForLead(conversation)
                          handleCreateNewLead()
                        }}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                        title="Criar novo lead"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteConversation(conversation.id)
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Excluir conversa"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Aviso se lead sem pipeline - canto inferior direito */}
                {conversation.lead_id && !conversation.lead_pipeline_id && (
                  <div className="absolute bottom-2 right-2">
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                      Lead não atribuído a nenhuma pipeline
                    </span>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Status das instâncias */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 max-h-[30vh]">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Instâncias WhatsApp</h3>
        <div className="space-y-2 overflow-y-auto max-h-[calc(30vh-3rem)]">
          {(isAdmin && (!allowedInstanceIds || allowedInstanceIds.length === 0)) && (
            <div
              onClick={() => setSelectedInstanceId('ALL')}
              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${selectedInstanceId === 'ALL' ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'}`}
            >
              <span className="text-sm">Todas as instâncias</span>
            </div>
          )}
          {instances
            .filter(inst => isAdmin || (allowedInstanceIds && allowedInstanceIds.includes(inst.id)))
            .map((instance) => {
              const isDisconnected = instance.status === 'disconnected' || instance.status === 'close'
              const isConnected = instance.status === 'connected' || instance.status === 'open'
              const isConnecting = instance.status === 'connecting'
              
              return (
                <div
                  key={instance.id}
                  onClick={() => {
                    // Se estiver desconectada ou conectando, abrir modal de reconexão
                    if (isDisconnected || isConnecting) {
                      setInstanceToReconnect(instance)
                      setShowReconnectModal(true)
                    } else {
                      // Se estiver conectada ou outros status, apenas selecionar para filtrar conversas
                      setSelectedInstanceId(instance.id)
                    }
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedInstanceId === instance.id ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'
                  } ${isDisconnected ? 'hover:bg-red-50 hover:border-red-200' : isConnected ? 'hover:bg-gray-50' : isConnecting ? 'hover:bg-yellow-50 hover:border-yellow-200' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      (instance.status === 'open' || instance.status === 'connected')
                        ? 'bg-green-500'
                        : instance.status === 'connecting'
                          ? 'bg-yellow-500'
                          : (instance.status === 'close' || instance.status === 'disconnected')
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                    }`} />
                    <span className="text-sm text-gray-700">{instance.display_name || instance.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(instance.status === 'connected' || instance.status === 'open') && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Conectado</span>
                    )}
                    {instance.status === 'connecting' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Conectando</span>
                    )}
                    {(instance.status === 'disconnected' || instance.status === 'close') && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Desconectado</span>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Modais */}
      {/* ConnectInstanceModal removido: migrou para Administração */}

      <ReconnectInstanceModal
        isOpen={showReconnectModal}
        onClose={() => {
          setShowReconnectModal(false)
          setInstanceToReconnect(null)
        }}
        instance={instanceToReconnect}
        onReconnected={() => {
          // Recarregar dados após reconexão bem-sucedida
          loadData()
        }}
      />

      <LeadDetailModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        lead={currentLead}
        onLeadUpdate={handleLeadUpdate}
      />

      <NewLeadModal
        isOpen={showNewLeadModal}
        onClose={() => setShowNewLeadModal(false)}
        onSubmit={async (leadData, customFieldValues) => {
          // Usar a mesma lógica do KanbanPage
          const { createLead } = await import('../../services/leadService')
          
          const { data } = await createLead(leadData)
          
          // Se há campos personalizados, criar suas values
          if (customFieldValues && Object.keys(customFieldValues).length > 0) {
            const leadCustomValueService = await import('../../services/leadCustomValueService')
            for (const [fieldId, value] of Object.entries(customFieldValues)) {
              if (value !== null && value !== undefined && value !== '') {
                await leadCustomValueService.createCustomValue({
                  lead_id: data.id,
                  field_id: fieldId,
                  value: Array.isArray(value) ? value.join(',') : String(value)
                })
              }
            }
          }
          
          return data
        }}
        pipelines={pipelines}
        onLeadCreated={(lead) => {
          (async () => {
            try {
              if (conversationForLead?.id && lead?.id) {
                await linkConversationToLead(conversationForLead.id, lead.id)
              }
            } catch (err) {
              console.error('Erro ao vincular conversa ao lead recém-criado:', err)
            } finally {
              // Recarregar conversas após criação e possível vínculo
              await loadData()
              console.log('✅ Lead criado e conversa atualizada (se aplicável):', lead)
            }
          })()
        }}
      />
    </div>
  )
} 