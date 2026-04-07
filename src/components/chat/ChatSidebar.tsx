import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon, TrashIcon, EyeIcon, PlusIcon, ArrowPathIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatConversation, WhatsAppInstance, Lead } from '../../types'
import { getChatConversations, getWhatsAppInstances, deleteChatConversation, linkConversationToLead } from '../../services/chatService'
import { getAllowedInstanceIdsForCurrentUser } from '../../services/instancePermissionService'
import { getLeadByPhone, getLeadById } from '../../services/leadService'
import { useAuthContext } from '../../contexts/AuthContext'
import { getPipelines } from '../../services/pipelineService'
import { LeadDetailModal } from '../leads/LeadDetailModal'
import { NewLeadModal } from '../kanban/modals/NewLeadModal'
import { ReconnectInstanceModal } from './ReconnectInstanceModal'
import { InstanceDropdown, InstanceSelectorButton } from './InstanceFilterModal'
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
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all')

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

  useEffect(() => { loadData() }, [])

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

      try {
        const { data: allowed } = await getAllowedInstanceIdsForCurrentUser()
        setAllowedInstanceIds(allowed)
        if (!isAdmin) {
          if (allowed && allowed.length > 0) {
            setSelectedInstanceId(prev => (prev === 'ALL' ? allowed[0] : prev))
          } else {
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

  useEffect(() => {
    const t = setTimeout(() => { loadData() }, 300)
    return () => clearTimeout(t)
  }, [selectedInstanceId, searchTerm])

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

  const filteredInstances = instances.filter(inst => isAdmin || (allowedInstanceIds && allowedInstanceIds.includes(inst.id)))
  const selectedInstanceName = selectedInstanceId === 'ALL'
    ? 'Todas as instâncias'
    : (instances.find(i => i.id === selectedInstanceId)?.display_name || instances.find(i => i.id === selectedInstanceId)?.name || 'Todas as instâncias')

  // Filtragem local de conversas
  const displayedConversations = conversations.filter(conv => {
    if (conversationFilter === 'unread') return hasUnseen(conv)
    if (conversationFilter === 'with_lead') return !!conv.lead_id
    if (conversationFilter === 'without_lead') return !conv.lead_id
    return true
  })

  const isFilterActive = conversationFilter !== 'all'

  return (
    <div className="w-full bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Conversas</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* Seletor de instância */}
          <div className="relative" ref={instanceSelectorRef}>
            <InstanceSelectorButton
              label={selectedInstanceName}
              onClick={() => { setShowInstanceDropdown(prev => !prev); setShowFilterDropdown(false) }}
              hasFilter={selectedInstanceId !== 'ALL'}
            />
            <InstanceDropdown
              isOpen={showInstanceDropdown}
              onClose={() => setShowInstanceDropdown(false)}
              instances={filteredInstances}
              selectedInstanceId={selectedInstanceId}
              onSelectInstance={(id) => { setSelectedInstanceId(id); setShowInstanceDropdown(false) }}
              showAllOption={isAdmin && (!allowedInstanceIds || allowedInstanceIds.length === 0)}
              onReconnect={(instance) => {
                setShowInstanceDropdown(false)
                setInstanceToReconnect(instance)
                setShowReconnectModal(true)
              }}
            />
          </div>

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
          <div className="relative" ref={filterDropdownRef}>
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

            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
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
              </div>
            )}
          </div>
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
        ) : displayedConversations.length === 0 ? (
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
                onClick={() => setConversationFilter('all')}
                className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Limpar filtro
              </button>
            )}
          </div>
        ) : (
          <div>
            {displayedConversations.map((conversation) => {
              const unseen = hasUnseen(conversation)
              const isSelected = selectedConversation?.id === conversation.id
              const initial = (conversation.lead_name || '?').charAt(0).toUpperCase()

              return (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 ${
                    isSelected
                      ? 'bg-[#f0f2f5]'
                      : 'hover:bg-[#f5f6f6]'
                  }`}
                  onClick={() => { markAsOpened(conversation.id); setConversations(prev => [...prev]); onSelectConversation(conversation) }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                      isSelected ? 'bg-primary-500' : 'bg-gray-300'
                    }`}>
                      {initial}
                    </div>
                    {unseen && !isSelected && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[15px] truncate ${unseen && !isSelected ? 'font-bold text-gray-900' : 'font-normal text-gray-900'}`}>
                        {conversation.lead_name}
                      </h4>
                      <span className={`text-xs flex-shrink-0 ml-2 ${unseen && !isSelected ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>
                        {conversation.last_message_time ? formatLastMessageTime(conversation.last_message_time) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[13px] text-gray-500 truncate">
                        {conversation.Nome_Whatsapp || conversation.lead_company || conversation.lead_phone || ''}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {conversation.lead_tags && conversation.lead_tags.length > 0 && (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            {conversation.lead_tags.length}
                          </span>
                        )}
                        {(unseen || conversation.unread_count > 0) && !isSelected && (
                          <span className="bg-primary-500 text-white text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                            {conversation.unread_count > 0 ? conversation.unread_count : ''}
                          </span>
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
                      onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conversation.id) }}
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
