import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon, TrashIcon, EyeIcon, PlusIcon, ArrowPathIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { FaWhatsapp } from 'react-icons/fa'
import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatConversation, WhatsAppInstance, Lead, ChatMessage, ChatFilters } from '../../types'
import { getChatConversations, getWhatsAppInstances, deleteChatConversation, linkConversationToLead, getConversationById, subscribeToInstanceMessages } from '../../services/chatService'
import { getEmpresaUsers } from '../../services/empresaService'
import { getAllowedInstanceIdsForCurrentUser } from '../../services/instancePermissionService'
import { StyledSelect } from '../ui/StyledSelect'
import { getLeadByPhone, getLeadById } from '../../services/leadService'
import { useAuthContext } from '../../contexts/AuthContext'
import { getPipelines } from '../../services/pipelineService'
import { LeadDetailModal } from '../leads/LeadDetailModal'
import { NewLeadModal } from '../kanban/modals/NewLeadModal'
import { ReconnectInstanceModal } from './ReconnectInstanceModal'
import { InstanceDropdown, InstanceSelectorButton } from './InstanceFilterModal'
import {
  groupConversationsByContact,
  isGroupSelected,
  isConversationUnread,
  pickDeleteConversation,
} from '../../utils/chatConversationGroups'
import { useToastContext } from '../../contexts/ToastContext'
import { useConfirm } from '../../hooks/useConfirm'

type ConversationFilter = 'all' | 'unread' | 'with_lead' | 'without_lead'

const FILTER_OPTIONS: { value: ConversationFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Não lidas' },
  { value: 'with_lead', label: 'Com lead' },
  { value: 'without_lead', label: 'Sem lead' },
]

interface ChatSidebarProps {
  selectedConversation: ChatConversation | null
  onSelectConversation: (conversation: ChatConversation | null, preferredInstanceId?: string) => void
  repliedConversationId?: string | null
  refreshToken?: number
}

/** Não lida quando a última mensagem é do cliente (outbound). */
const isUnread = isConversationUnread

const bumpConversation = (
  conversations: ChatConversation[],
  conversationId: string,
  patch: Partial<ChatConversation>
): ChatConversation[] => {
  const index = conversations.findIndex(c => c.id === conversationId)
  if (index === -1) return conversations
  const updated = { ...conversations[index], ...patch }
  return [updated, ...conversations.filter(c => c.id !== conversationId)]
}

export function ChatSidebar({ 
  selectedConversation, 
  onSelectConversation,
  repliedConversationId = null,
  refreshToken = 0,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [allowedInstanceIds, setAllowedInstanceIds] = useState<string[] | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInstanceId, setSelectedInstanceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all')
  const [responsibleFilter, setResponsibleFilter] = useState<string | undefined>(undefined)
  const [empresaUsers, setEmpresaUsers] = useState<Array<{ uuid: string; full_name: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const deepLinkResolvedRef = useRef(false)

  const [showLeadModal, setShowLeadModal] = useState(false)
  const [currentLead, setCurrentLead] = useState<Lead | null>(null)
  const [conversationForLead, setConversationForLead] = useState<ChatConversation | null>(null)
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)
  const [pipelines, setPipelines] = useState<any[]>([])
  const [showReconnectModal, setShowReconnectModal] = useState(false)
  const [instanceToReconnect, setInstanceToReconnect] = useState<WhatsAppInstance | null>(null)

  const [showInstanceDropdown, setShowInstanceDropdown] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const instanceSelectorRef = useRef<HTMLDivElement>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  const { showError } = useToastContext()
  const { confirm } = useConfirm()
  const { isAdmin } = useAuthContext()

  // Fechar dropdown de filtro ao clicar fora
  useEffect(() => {
    if (!showFilterDropdown) return
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFilterDropdown])

  const filterInstances = (
    allInstances: WhatsAppInstance[],
    allowed: string[] | null
  ): WhatsAppInstance[] =>
    allInstances.filter(inst => isAdmin || (allowed && allowed.includes(inst.id)))

  const resolveActiveInstanceId = (
    currentId: string,
    filtered: WhatsAppInstance[],
    deepLinkInstanceId?: string | null
  ): string => {
    if (deepLinkInstanceId && filtered.some(i => i.id === deepLinkInstanceId)) {
      return deepLinkInstanceId
    }
    if (currentId && filtered.some(i => i.id === currentId)) {
      return currentId
    }
    return filtered[0]?.id ?? ''
  }

  const buildApiFilters = (instanceId: string, search: string, responsible?: string): ChatFilters => {
    const filters: ChatFilters = { search, instance_id: instanceId }
    if (responsible === 'unassigned') {
      filters.unassigned_only = true
    } else if (responsible) {
      filters.assigned_user_id = responsible
    }
    return filters
  }

  const loadConversations = async (instanceId: string, search: string, responsible?: string) => {
    const conversationsData = await getChatConversations(buildApiFilters(instanceId, search, responsible))
    const sorted = [...conversationsData].sort((a, b) => {
      const ta = new Date(a.last_message_time || a.updated_at || 0).getTime()
      const tb = new Date(b.last_message_time || b.updated_at || 0).getTime()
      return tb - ta
    })
    setConversations(sorted)
  }

  const loadData = async () => {
    if (!selectedInstanceId) return
    try {
      setLoading(true)
      await loadConversations(selectedInstanceId, searchTerm, responsibleFilter)
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false

    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        const usersData = await getEmpresaUsers()
        if (cancelled) return
        setEmpresaUsers(
          (usersData || []).map((u: { uuid: string; full_name?: string }) => ({
            uuid: u.uuid,
            full_name: u.full_name || 'Sem nome',
          })),
        )
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
        if (!cancelled) setEmpresaUsers([])
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }

    loadUsers()
    return () => { cancelled = true }
  }, [isAdmin])

  const clearAllFilters = () => {
    setConversationFilter('all')
    setResponsibleFilter(undefined)
  }

  // Montagem: resolve instância padrão (uma vez)
  useEffect(() => {
    let cancelled = false

    const initInstances = async () => {
      try {
        setLoading(true)

        const [instancesData, allowedResult] = await Promise.all([
          getWhatsAppInstances(),
          getAllowedInstanceIdsForCurrentUser().catch(() => ({ data: null as string[] | null })),
        ])
        if (cancelled) return

        const allowed = allowedResult.data
        setInstances(instancesData)
        setAllowedInstanceIds(allowed)

        const filtered = filterInstances(instancesData, allowed)

        let deepLinkInstanceId: string | null = null
        const conversationId = new URLSearchParams(window.location.search).get('conversation')
        if (conversationId) {
          try {
            const conversation = await getConversationById(conversationId)
            if (conversation?.instance_id) {
              deepLinkInstanceId = conversation.instance_id
            }
          } catch {}
        }
        deepLinkResolvedRef.current = true

        const activeInstanceId = resolveActiveInstanceId('', filtered, deepLinkInstanceId)
        setSelectedInstanceId(activeInstanceId)
        if (!activeInstanceId) {
          setConversations([])
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro ao carregar instâncias do chat:', error)
        if (!cancelled) setLoading(false)
      }
    }

    initInstances()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!repliedConversationId) return
    setConversations(prev => bumpConversation(prev, repliedConversationId, {
      last_message_direction: 'inbound',
      last_message_time: new Date().toISOString(),
    }))
  }, [repliedConversationId])

  useEffect(() => {
    if (!selectedInstanceId) return
    const channel = subscribeToInstanceMessages(selectedInstanceId, (message: ChatMessage) => {
      setConversations(prev => bumpConversation(prev, message.conversation_id, {
        last_message_direction: message.direction,
        last_message_time: message.timestamp,
      }))
    })
    return () => { channel.unsubscribe() }
  }, [selectedInstanceId])

  useEffect(() => {
    if (!selectedInstanceId) return

    let cancelled = false
    const delay = searchTerm ? 300 : 0

    const t = setTimeout(async () => {
      try {
        setLoading(true)
        await loadConversations(selectedInstanceId, searchTerm, responsibleFilter)
      } catch (error) {
        console.error('Erro ao carregar conversas:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, delay)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [selectedInstanceId, searchTerm, refreshToken, responsibleFilter])

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return ''
    const date = parseISO(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    if (diffInHours < 24) return format(date, 'HH:mm', { locale: ptBR })
    if (diffInHours < 48) return 'Ontem'
    return format(date, 'dd/MM', { locale: ptBR })
  }

  const handleDeleteConversation = async (conversationId: string) => {
    const confirmed = await confirm({
      title: 'Excluir Conversa',
      message: 'Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita e todas as mensagens serão perdidas.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    if (!confirmed) return

    try {
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      if (selectedConversation?.id === conversationId) onSelectConversation(null)
      await deleteChatConversation(conversationId)
    } catch (error) {
      console.error('Erro ao deletar conversa:', error)
      showError('Erro ao deletar conversa. Tente novamente.')
      loadData()
    }
  }

  const handleViewLead = async (conversation: ChatConversation) => {
    try {
      if (!conversation?.id) { showError('Dados da conversa inválidos'); return }
      if (!conversation.lead_phone) { showError('Conversa sem número de telefone'); return }
      setConversationForLead(conversation)

      if (conversation.lead_id) {
        const { data: lead, error } = await getLeadById(conversation.lead_id)
        if (error || !lead) {
          const { data: leadByPhone, error: phoneError } = await getLeadByPhone(conversation.lead_phone)
          if (phoneError || !leadByPhone) {
            const newLead: Lead = {
              id: 'temp-' + Date.now(), name: conversation.lead_name, phone: conversation.lead_phone,
              email: '', company: '', value: 0, status: '', origin: 'WhatsApp',
              notes: `Conversa iniciada via WhatsApp\nNome no WhatsApp: ${conversation.Nome_Whatsapp || 'Não informado'}`,
              pipeline_id: '', stage_id: '', empresa_id: '', created_at: new Date().toISOString()
            }
            setCurrentLead(newLead)
            setShowLeadModal(true)
          } else {
            setCurrentLead(leadByPhone)
            setShowLeadModal(true)
          }
        } else {
          setCurrentLead(lead)
          setShowLeadModal(true)
        }
      } else {
        const { data: leadByPhone, error: phoneError } = await getLeadByPhone(conversation.lead_phone)
        if (phoneError || !leadByPhone) {
          setShowNewLeadModal(true)
        } else {
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
    if (conversationForLead && updatedLead) {
      setConversations(prev => prev.map(conv =>
        conv.id === conversationForLead.id
          ? { ...conv, lead_id: updatedLead.id, lead_name: updatedLead.name }
          : conv
      ))
    }
  }

  useEffect(() => {
    if (!showNewLeadModal) return
    const loadPipelines = async () => {
      try {
        const { data: pipelinesData, error } = await getPipelines()
        if (error) throw error
        setPipelines(pipelinesData || [])
      } catch { setPipelines([]) }
    }
    loadPipelines()
  }, [showNewLeadModal])

  const filteredInstances = filterInstances(instances, allowedInstanceIds)
  const selectedInstance = instances.find(i => i.id === selectedInstanceId)
  const selectedInstanceName = selectedInstance
    ? (selectedInstance.display_name || selectedInstance.name)
    : 'Selecionar instância'

  const handleSelectInstance = (id: string) => {
    if (id === selectedInstanceId) {
      setShowInstanceDropdown(false)
      return
    }
    setSelectedInstanceId(id)
    setShowInstanceDropdown(false)
    if (selectedConversation) {
      onSelectConversation(selectedConversation, id)
    }
  }

  // Filtragem local de conversas
  const displayedConversations = conversations.filter(conv => {
    if (conversationFilter === 'unread') return isUnread(conv)
    if (conversationFilter === 'with_lead') return !!conv.lead_id
    if (conversationFilter === 'without_lead') return !conv.lead_id
    return true
  })

  const isFilterActive = conversationFilter !== 'all' || !!responsibleFilter
  const contactGroups = groupConversationsByContact(displayedConversations)

  const responsibleSelectValue = responsibleFilter === 'unassigned'
    ? 'unassigned'
    : responsibleFilter || ''

  const responsibleFilterLabel = responsibleFilter
    ? responsibleFilter === 'unassigned'
      ? 'Sem responsável'
      : empresaUsers.find(u => u.uuid === responsibleFilter)?.full_name
    : null

  return (
    <div className="w-full bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <FaWhatsapp className="w-5 h-5 text-white" aria-hidden />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Conversas</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* Reload */}
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors disabled:opacity-50"
            title="Atualizar conversas"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Filtro de conversas */}
          <div className="relative flex flex-col items-end" ref={filterDropdownRef}>
            <button
              onClick={() => { setShowFilterDropdown(prev => !prev); setShowInstanceDropdown(false) }}
              className={`relative p-2 rounded-full transition-colors ${
                isFilterActive
                  ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/60'
              }`}
              title="Filtrar conversas"
            >
              <FunnelIcon className="w-5 h-5" />
              {isFilterActive && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>

            {isAdmin && responsibleFilterLabel && (
              <p
                className="text-[10px] font-medium text-primary-700 max-w-[140px] truncate text-right mt-0.5 px-0.5"
                title={responsibleFilterLabel}
              >
                {responsibleFilterLabel}
              </p>
            )}

            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                {FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setConversationFilter(opt.value); setShowFilterDropdown(false) }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      conversationFilter === opt.value
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}

                {isAdmin && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Responsável
                      </p>
                      <StyledSelect
                        value={responsibleSelectValue}
                        onChange={(value) => {
                          if (!value) {
                            setResponsibleFilter(undefined)
                          } else if (value === 'unassigned') {
                            setResponsibleFilter('unassigned')
                          } else {
                            setResponsibleFilter(value)
                          }
                        }}
                        options={[
                          { value: '', label: 'Todos' },
                          ...empresaUsers.map(user => ({
                            value: user.uuid,
                            label: user.full_name,
                          })),
                          { value: 'unassigned', label: 'Sem responsável' },
                        ]}
                        placeholder="Selecionar"
                        disabled={loadingUsers}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seletor de instância */}
      <div className="px-3 pt-2 pb-1 bg-[#f0f2f5]">
        <div className="relative" ref={instanceSelectorRef}>
          <InstanceSelectorButton
            label={selectedInstanceName}
            status={selectedInstance?.status}
            isOpen={showInstanceDropdown}
            onClick={() => { setShowInstanceDropdown(prev => !prev); setShowFilterDropdown(false) }}
          />
          <InstanceDropdown
            isOpen={showInstanceDropdown}
            onClose={() => setShowInstanceDropdown(false)}
            instances={filteredInstances}
            selectedInstanceId={selectedInstanceId}
            onSelectInstance={handleSelectInstance}
            onReconnect={(instance) => {
              setShowInstanceDropdown(false)
              setInstanceToReconnect(instance)
              setShowReconnectModal(true)
            }}
          />
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 bg-[#f0f2f5] border-b border-gray-200">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar ou começar uma nova conversa"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-300 transition-all"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Carregando...</p>
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-gray-400">
            <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4 text-gray-200" />
            <p className="text-sm text-center">Nenhuma instância disponível</p>
          </div>
        ) : contactGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-gray-400">
            <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4 text-gray-200" />
            <p className="text-sm text-center">
              {isFilterActive
                ? 'Nenhuma conversa para este filtro'
                : searchTerm
                  ? 'Nenhuma conversa encontrada'
                  : 'Nenhuma conversa disponível'}
            </p>
            {isFilterActive && (
              <button
                onClick={clearAllFilters}
                className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Limpar filtro
              </button>
            )}
          </div>
        ) : (
          <div>
            {contactGroups.map((group) => {
              const conversation = group.representative
              const unread = group.isUnread
              const isSelected = isGroupSelected(group, selectedConversation?.id)
              const initial = (group.leadName || '?').charAt(0).toUpperCase()
              const multiCount = group.conversations.length

              return (
                <div
                  key={group.key}
                  className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 ${
                    isSelected
                      ? 'bg-[#f0f2f5]'
                      : 'hover:bg-[#f5f6f6]'
                  }`}
                  onClick={() => onSelectConversation(conversation, selectedInstanceId)}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                      isSelected ? 'bg-primary-500' : 'bg-gray-300'
                    }`}>
                      {initial}
                    </div>
                    {unread && !isSelected && (
                      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-green-500 rounded-full ring-1 ring-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[15px] truncate ${unread && !isSelected ? 'font-bold text-gray-900' : 'font-normal text-gray-900'}`}>
                        {group.leadName}
                        {multiCount > 1 && (
                          <span className="ml-1.5 text-[11px] font-normal text-gray-400">· {multiCount} conversas</span>
                        )}
                      </h4>
                      <span className={`text-xs flex-shrink-0 ml-2 ${unread && !isSelected ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                        {group.latestTime ? formatLastMessageTime(group.latestTime) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[13px] text-gray-500 truncate">
                        {conversation.Nome_Whatsapp || conversation.lead_company || group.leadPhone || ''}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {conversation.lead_tags && conversation.lead_tags.length > 0 && (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            {conversation.lead_tags.length}
                          </span>
                        )}
                        {unread && !isSelected && (
                          <span className="bg-green-500 text-white text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center leading-none" />
                        )}
                      </div>
                    </div>

                    {conversation.lead_id && !conversation.lead_pipeline_id && (
                      <p className="text-[10px] text-amber-600 mt-0.5 truncate">Sem pipeline atribuída</p>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {conversation.lead_id ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewLead(conversation) }}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                        title="Ver lead"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConversationForLead(conversation); setShowNewLeadModal(true) }}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                        title="Criar lead"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const toDelete = pickDeleteConversation(group, selectedInstanceId)
                        if (toDelete) handleDeleteConversation(toDelete.id)
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Excluir conversa"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      <ReconnectInstanceModal
        isOpen={showReconnectModal}
        onClose={() => { setShowReconnectModal(false); setInstanceToReconnect(null) }}
        instance={instanceToReconnect}
        onReconnected={() => loadData()}
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
          const { createLead } = await import('../../services/leadService')
          const { data } = await createLead(leadData)
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
              await loadData()
            }
          })()
        }}
      />
    </div>
  )
}
