import { useCallback, useEffect, useState } from 'react'
import type { AutomationRule, CreateAutomationRuleData, Pipeline, Stage, TaskType, LeadCustomField, LossReason, WhatsAppInstance } from '../../types'
import { getAllProfiles } from '../../services/profileService'
import { StyledSelect } from '../ui/StyledSelect'
import { listAutomations, createAutomation, updateAutomation, deleteAutomation } from '../../services/automationService'
import { getPipelines } from '../../services/pipelineService'
import { getStagesByPipeline } from '../../services/stageService'
import { getTaskTypes } from '../../services/taskService'
import { getCustomFieldsByPipeline } from '../../services/leadCustomFieldService'
import { getLossReasons } from '../../services/lossReasonService'
import { getWhatsAppInstances } from '../../services/chatService'
import { getAllLeadOrigins, getAllLeadTags } from '../../services/leadService'
import { XMarkIcon, PlusIcon, DocumentDuplicateIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { formatTaskTypeName } from '../../utils/taskTypeDisplay'

type WhatsAppMessageType = 'text' | 'image' | 'video' | 'audio'

const LEAD_STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'quente', label: 'Quente' },
  { value: 'morno', label: 'Morno' },
  { value: 'frio', label: 'Frio' },
]

const TASK_PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

// MultiSelect removido (não usado)

function PipelineSingleSelect({
  pipelines,
  value,
  placeholder,
  onChange
}: {
  pipelines: Pipeline[]
  value: string
  placeholder?: string
  onChange: (next: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const containerRef = (useState(null) as any)[0] as React.RefObject<HTMLDivElement> || ({} as React.RefObject<HTMLDivElement>)
  const _setRef = (el: HTMLDivElement | null) => {
    ;(containerRef as any).current = el
  }
  const recalcPlacement = () => {
    try {
      const rect = (containerRef as any)?.current?.getBoundingClientRect?.()
      if (!rect) return
      const spaceBelow = window.innerHeight - rect.bottom
      const estimated = Math.min(360, Math.max(200, pipelines.length * 36))
      setOpenUp(spaceBelow < estimated)
    } catch {}
  }
  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      recalcPlacement()
      try {
        window.requestAnimationFrame(recalcPlacement)
        window.addEventListener('resize', recalcPlacement, { passive: true })
        window.addEventListener('scroll', recalcPlacement, { passive: true })
      } catch {}
    } else {
      try {
        window.removeEventListener('resize', recalcPlacement)
        window.removeEventListener('scroll', recalcPlacement)
      } catch {}
    }
  }
  const current = pipelines.find(p => p.id === value)
  return (
    <div ref={_setRef} className="relative" tabIndex={0} onBlur={(e) => { if (!(e.currentTarget as any).contains(e.relatedTarget)) setOpen(false) }}>
      <div
        className="border rounded px-3 py-2 w-full cursor-pointer flex items-center justify-between bg-white"
        onClick={handleToggle}
      >
        <span className="text-sm text-gray-900 truncate">
          {current ? current.name : (placeholder || 'Selecione')}
        </span>
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
      </div>
      {open && (
        <div className={`${openUp ? 'absolute bottom-full mb-1' : 'absolute mt-1'} z-50 w-full max-h-[60vh] overflow-auto bg-white border rounded shadow-lg p-2`}>
          {pipelines.map(p => (
            <button
              key={p.id}
              type="button"
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${p.id === value ? 'bg-gray-50' : ''}`}
              onClick={() => { onChange(p.id); setOpen(false) }}
            >
              <span className="text-sm text-gray-900">{p.name}</span>
            </button>
          ))}
          {pipelines.length === 0 && (
            <div className="px-2 py-1 text-sm text-gray-500">Nenhum pipeline</div>
          )}
        </div>
      )}
    </div>
  )}

function StageSingleSelect({
  stages,
  value,
  placeholder,
  allowEmpty,
  onChange
}: {
  stages: Stage[]
  value: string
  placeholder?: string
  allowEmpty?: boolean
  onChange: (next: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const containerRef = (useState(null) as any)[0] as React.RefObject<HTMLDivElement> || ({} as React.RefObject<HTMLDivElement>)
  const _setRef = (el: HTMLDivElement | null) => {
    ;(containerRef as any).current = el
  }
  const recalcPlacement = () => {
    try {
      const rect = (containerRef as any)?.current?.getBoundingClientRect?.()
      if (!rect) return
      const spaceBelow = window.innerHeight - rect.bottom
      const estimated = Math.min(360, Math.max(200, stages.length * 36))
      setOpenUp(spaceBelow < estimated)
    } catch {}
  }
  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      recalcPlacement()
      try {
        window.requestAnimationFrame(recalcPlacement)
        window.addEventListener('resize', recalcPlacement, { passive: true })
        window.addEventListener('scroll', recalcPlacement, { passive: true })
      } catch {}
    } else {
      try {
        window.removeEventListener('resize', recalcPlacement)
        window.removeEventListener('scroll', recalcPlacement)
      } catch {}
    }
  }
  const current = stages.find(s => s.id === value)
  return (
    <div ref={_setRef} className="relative" tabIndex={0} onBlur={(e) => { if (!(e.currentTarget as any).contains(e.relatedTarget)) setOpen(false) }}>
      <div
        className="border rounded px-3 py-2 w-full cursor-pointer flex items-center justify-between bg-white"
        onClick={handleToggle}
      >
        <span className="text-sm text-gray-900 truncate">
          {current ? current.name : (placeholder || (allowEmpty ? 'Qualquer' : 'Selecione'))}
        </span>
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
      </div>
      {open && (
        <div className={`${openUp ? 'absolute bottom-full mb-1' : 'absolute mt-1'} z-50 w-full max-h-[60vh] overflow-auto bg-white border rounded shadow-lg p-2`}>
          {allowEmpty && (
            <button
              type="button"
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${value === '' ? 'bg-gray-50' : ''}`}
              onClick={() => { onChange(''); setOpen(false) }}
            >
              <span className="text-sm text-gray-900">Qualquer</span>
            </button>
          )}
          {stages.map(s => (
            <button
              key={s.id}
              type="button"
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${s.id === value ? 'bg-gray-50' : ''}`}
              onClick={() => { onChange(s.id); setOpen(false) }}
            >
              <span className="text-sm text-gray-900">{s.name}</span>
            </button>
          ))}
          {stages.length === 0 && (
            <div className="px-2 py-1 text-sm text-gray-500">Nenhuma etapa</div>
          )}
        </div>
      )}
    </div>
  )
}

const DEFAULT_AUTOMATION_ACTION: Record<string, any> = {
  type: 'move_lead',
  target_pipeline_id: '',
  target_stage_id: ''
}

export function AutomationsAdminTab() {
  const [items, setItems] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<AutomationRule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [form, setForm] = useState<CreateAutomationRuleData>({
    name: '',
    description: '',
    event_type: 'lead_stage_changed',
    active: true,
    condition: {},
    action: { ...DEFAULT_AUTOMATION_ACTION }
  })
  const [actionQueue, setActionQueue] = useState<Record<string, any>[]>([{ ...DEFAULT_AUTOMATION_ACTION }])
  const [activeActionIndex, setActiveActionIndex] = useState(0)

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [fromStages, setFromStages] = useState<Stage[]>([])
  const [toStages, setToStages] = useState<Stage[]>([])
  const [targetStages, setTargetStages] = useState<Stage[]>([])
  const [idleStages, setIdleStages] = useState<Stage[]>([])
  const [stageIndex, setStageIndex] = useState<Record<string, Stage>>({})
  const [profiles, setProfiles] = useState<{ uuid: string; full_name: string; email: string }[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])
  const [whatsappInstances, setWhatsappInstances] = useState<WhatsAppInstance[]>([])
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [waUploading, setWaUploading] = useState(false)
  const [waUploadError, setWaUploadError] = useState<string | null>(null)
  const [waMediaPreview, setWaMediaPreview] = useState<string | null>(null)

  useEffect(() => { load(); loadPipelines(); loadProfiles(); loadTaskTypes(); loadCustomFields(); loadLossReasons(); loadWhatsappInstances(); loadOrigins(); loadTags() }, [])

  useEffect(() => {
    setActionQueue(prev => {
      const next = prev.length > 0 ? [...prev] : [{ ...DEFAULT_AUTOMATION_ACTION }]
      const currentAction = (form.action as Record<string, any> | undefined) || { ...DEFAULT_AUTOMATION_ACTION }
      const current = next[activeActionIndex] || {}
      if (JSON.stringify(current) === JSON.stringify(currentAction)) {
        return prev
      }
      next[activeActionIndex] = currentAction
      return next
    })
  }, [form.action, activeActionIndex])

  function getEffectiveActions(currentActionOverride?: Record<string, any>) {
    const currentAction = currentActionOverride || (form.action as Record<string, any> | undefined) || { ...DEFAULT_AUTOMATION_ACTION }
    const base = actionQueue.length > 0 ? [...actionQueue] : [{ ...DEFAULT_AUTOMATION_ACTION }]
    base[activeActionIndex] = currentAction
    return base.filter(action => !!action && typeof action === 'object')
  }

  function getActionTypeLabel(actionType?: string): string {
    switch (actionType) {
      case 'move_lead':
        return 'Mover lead'
      case 'create_task':
        return 'Criar tarefa'
      case 'assign_responsible':
        return 'Atribuir responsável'
      case 'mark_as_sold':
        return 'Marcar vendido'
      case 'mark_as_lost':
        return 'Marcar perdido'
      case 'call_webhook':
        return 'Acionar webhook'
      case 'send_whatsapp':
        return 'Enviar WhatsApp'
      default:
        return 'Ação'
    }
  }

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await listAutomations()
      if (error) throw error
      setItems(data)
    } catch (e: any) {
      setError('Erro ao carregar automações')
    } finally {
      setLoading(false)
    }
  }

  async function loadPipelines() {
    try {
      const { data } = await getPipelines()
      setPipelines(data || [])
      // Após carregar pipelines, criar índice de etapas para exibição dos nomes nas regras
      if (data && data.length > 0) {
        try {
          const results = await Promise.all((data || []).map(p => getStagesByPipeline(p.id)))
          const index: Record<string, Stage> = {}
          for (const r of results) {
            const list = (r.data || []) as unknown as Stage[]
            for (const s of list) index[s.id] = s
          }
          setStageIndex(index)
        } catch {}
      } else {
        setStageIndex({})
      }
    } catch {}
  }

  async function loadProfiles() {
    try {
      const { data } = await getAllProfiles()
      setProfiles(data || [])
    } catch {}
  }

  async function loadTaskTypes() {
    try {
      const types = await getTaskTypes()
      setTaskTypes(types || [])
    } catch (err) {
      console.error('Erro ao carregar tipos de tarefa:', err)
      setTaskTypes([])
    }
  }

  async function loadCustomFields() {
    try {
      // Carregar campos personalizados globais (pipeline_id = null)
      const { data } = await getCustomFieldsByPipeline('null')
      setCustomFields(data || [])
    } catch (err) {
      console.error('Erro ao carregar campos personalizados:', err)
      setCustomFields([])
    }
  }

  async function loadLossReasons() {
    try {
      const { data, error } = await getLossReasons()
      if (!error && data) {
        setLossReasons(data as LossReason[])
      }
    } catch (err) {
      console.error('Erro ao carregar motivos de perda:', err)
      setLossReasons([])
    }
  }

  async function loadWhatsappInstances() {
    try {
      const instances = await getWhatsAppInstances()
      setWhatsappInstances(instances || [])
    } catch (err) {
      console.error('Erro ao carregar instâncias WhatsApp:', err)
      setWhatsappInstances([])
    }
  }

  async function loadOrigins() {
    try {
      const origins = await getAllLeadOrigins()
      setAvailableOrigins(origins || [])
    } catch {
      setAvailableOrigins([])
    }
  }

  async function loadTags() {
    try {
      const tags = await getAllLeadTags()
      setAvailableTags(tags || [])
    } catch {
      setAvailableTags([])
    }
  }

  function handleWaMessageTypeChange(nextType: WhatsAppMessageType) {
    setWaMediaPreview(null)
    setWaUploadError(null)
    setForm(prev => ({
      ...prev,
      action: {
        ...prev.action,
        wa_message_type: nextType,
        media_url: nextType === 'text' ? undefined : (prev.action as any)?.media_url,
        media_filename: nextType === 'text' ? undefined : (prev.action as any)?.media_filename,
        media_size_bytes: nextType === 'text' ? undefined : (prev.action as any)?.media_size_bytes,
      }
    }))
  }

  const handleWaFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const currentType = ((form.action as any)?.wa_message_type || 'text') as WhatsAppMessageType
    const validTypes: Record<WhatsAppMessageType, string[]> = {
      text: [],
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/quicktime', 'video/webm'],
      audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp3'],
    }

    if (currentType !== 'text' && !validTypes[currentType].includes(file.type)) {
      setWaUploadError(`Tipo de arquivo inválido. Aceitos: ${validTypes[currentType].join(', ')}`)
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setWaUploadError('Arquivo muito grande. Máximo: 50MB')
      return
    }

    setWaUploadError(null)

    if (currentType === 'image') {
      const reader = new FileReader()
      reader.onload = (ev) => setWaMediaPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }

    try {
      setWaUploading(true)
      const { supabase } = await import('../../services/supabaseClient')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('uuid', user.id)
        .single()
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada')

      const WEBHOOK_URL = import.meta.env.VITE_GREETING_UPLOAD_WEBHOOK_URL
        || 'https://n8n.advcrm.com.br/webhook/greeting-upload'
      const randomKey = Math.floor(100000 + Math.random() * 900000).toString()

      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)
      formData.append('content_type', file.type || 'application/octet-stream')
      formData.append('size', file.size.toString())
      formData.append('user_id', user.id)
      formData.append('empresa_id', profile.empresa_id)
      formData.append('random_key', randomKey)

      const response = await fetch(WEBHOOK_URL, { method: 'POST', body: formData })
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido')
        throw new Error(`Erro no upload: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      if (!result.url) throw new Error('Webhook não retornou URL válida')

      setWaMediaPreview(result.url)
      setForm(prev => ({
        ...prev,
        action: {
          ...prev.action,
          media_url: result.url,
          media_filename: file.name,
          media_size_bytes: file.size,
        }
      }))
    } catch (error: any) {
      setWaUploadError(error.message || 'Erro ao fazer upload')
      setForm(prev => ({
        ...prev,
        action: { ...prev.action, media_url: undefined, media_filename: undefined, media_size_bytes: undefined }
      }))
    } finally {
      setWaUploading(false)
    }
  }, [form.action])

  async function loadStagesFor(pipelineIdOrIds: string | string[], kind: 'from' | 'to' | 'target' | 'idle') {
    const ids = Array.isArray(pipelineIdOrIds)
      ? pipelineIdOrIds.filter(Boolean)
      : (pipelineIdOrIds ? [pipelineIdOrIds] : [])

    if (!ids.length) {
      if (kind === 'from') setFromStages([])
      if (kind === 'to') setToStages([])
      if (kind === 'target') setTargetStages([])
      if (kind === 'idle') setIdleStages([])
      return
    }
    try {
      const results = await Promise.all(ids.map(id => getStagesByPipeline(id)))
      const merged: Record<string, Stage> = {}
      for (const r of results) {
        const list = (r.data || []) as unknown as Stage[]
        for (const s of list) merged[s.id] = s
      }
      const final = Object.values(merged)
      if (kind === 'from') setFromStages(final)
      if (kind === 'to') setToStages(final)
      if (kind === 'target') setTargetStages(final)
      if (kind === 'idle') setIdleStages(final)
    } catch {}
  }

  function formatUniversalConditions(cond: any): string[] {
    const parts: string[] = []
    const statuses = cond.statuses as string[] | undefined
    if (statuses?.length) {
      const labels = statuses.map(s => LEAD_STATUS_OPTIONS.find(o => o.value === s)?.label || s)
      parts.push(`Status: ${labels.join(', ')}`)
    }
    const origins = cond.origins as string[] | undefined
    if (origins?.length) {
      parts.push(`Origem: ${origins.join(', ')}`)
    }
    const tags = cond.tags as string[] | undefined
    if (tags?.length) {
      parts.push(`Tags: ${tags.join(', ')}`)
    }
    return parts
  }

  function formatConditions(rule: AutomationRule): string | null {
    const cond: any = rule.condition || {}
    const eventType = rule.event_type

    if (eventType === 'conversation_created') {
      const parts: string[] = []
      const instanceIds = cond.instance_ids as string[] | undefined
      if (instanceIds?.length) {
        const names = instanceIds
          .map(id => whatsappInstances.find(i => i.id === id)?.name || id)
          .join(', ')
        parts.push(`Instância: ${names}`)
      }
      if (cond.has_lead === true) parts.push('Com lead vinculado')
      if (cond.has_lead === false) parts.push('Sem lead vinculado')
      const assignedIds = cond.assigned_user_ids as string[] | undefined
      if (assignedIds?.length) {
        const names = assignedIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Atribuído a: ${names}`)
      }
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'task_created') {
      const parts: string[] = []
      const taskTypeIds = cond.task_type_ids as string[] | undefined
      if (taskTypeIds?.length) {
        const names = taskTypeIds
          .map(id => formatTaskTypeName(taskTypes.find(t => t.id === id)?.name) || id)
          .join(', ')
        parts.push(`Tipo: ${names}`)
      }
      const priorities = cond.priorities as string[] | undefined
      if (priorities?.length) {
        const labels = priorities
          .map(p => TASK_PRIORITY_OPTIONS.find(o => o.value === p)?.label || p)
          .join(', ')
        parts.push(`Prioridade: ${labels}`)
      }
      const assignedIds = cond.assigned_to_ids as string[] | undefined
      if (assignedIds?.length) {
        const names = assignedIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Responsável: ${names}`)
      }
      const createdByIds = cond.created_by_ids as string[] | undefined
      if (createdByIds?.length) {
        const names = createdByIds
          .map(id => profiles.find(p => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Criador: ${names}`)
      }
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'lead_idle_in_stage') {
      const parts: string[] = []
      const idleValue = cond.idle_time_value as number | undefined
      const idleUnit = cond.idle_time_unit as string | undefined
      if (idleValue) {
        const unitLabel = idleUnit === 'days' ? (idleValue === 1 ? 'dia' : 'dias') : idleUnit === 'minutes' ? (idleValue === 1 ? 'minuto' : 'minutos') : (idleValue === 1 ? 'hora' : 'horas')
        parts.push(`Parado há ${idleValue} ${unitLabel}`)
      }
      const pipeIds = cond.pipeline_ids as string[] | undefined
      if (pipeIds?.length) {
        const names = pipeIds.map(id => pipelines.find(p => p.id === id)?.name || id).join(', ')
        parts.push(`Pipeline: ${names}`)
      }
      const stIds = cond.stage_ids as string[] | undefined
      if (stIds?.length) {
        const names = stIds.map(id => stageIndex[id]?.name || id).join(', ')
        parts.push(`Estágio: ${names}`)
      }
      if (cond.is_recurring) {
        const recurValue = cond.recurring_interval_value as number | undefined
        const recurUnit = cond.recurring_interval_unit as string | undefined
        if (recurValue) {
          const rUnitLabel = recurUnit === 'days' ? (recurValue === 1 ? 'dia' : 'dias') : recurUnit === 'minutes' ? (recurValue === 1 ? 'minuto' : 'minutos') : (recurValue === 1 ? 'hora' : 'horas')
          parts.push(`Repete a cada ${recurValue} ${rUnitLabel}`)
        }
      } else {
        parts.push('Disparo único')
      }
      parts.push(...formatUniversalConditions(cond))
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'lead_responsible_assigned') {
      const parts: string[] = []
      const pipelineId = cond.pipeline_id as string | undefined
      if (pipelineId) {
        const pipeName = pipelines.find(p => p.id === pipelineId)?.name || pipelineId
        parts.push(`Pipeline: ${pipeName}`)
      }

      const responsibleIds = ((cond.responsible_uuids as string[] | undefined) || [])
        .filter(Boolean)
      const singleResponsible = (cond.responsible_uuid as string | undefined)?.trim()
      const normalizedResponsibleIds = responsibleIds.length > 0
        ? responsibleIds
        : (singleResponsible ? [singleResponsible] : [])

      if (normalizedResponsibleIds.length > 0) {
        const names = normalizedResponsibleIds
          .map((id) => profiles.find((p) => p.uuid === id)?.full_name || id)
          .join(', ')
        parts.push(`Responsável: ${names}`)
      }

      parts.push(...formatUniversalConditions(cond))
      return parts.length > 0 ? parts.join(' • ') : null
    }

    if (eventType === 'lead_marked_sold' || eventType === 'lead_marked_lost') {
      const parts: string[] = []
      const pipelineId = cond.pipeline_id as string | undefined
      if (pipelineId) {
        const pipeName = pipelines.find(p => p.id === pipelineId)?.name || pipelineId
        parts.push(`Pipeline: ${pipeName}`)
      }
      const lossReasonIds = cond.loss_reason_ids as string[] | undefined
      if (eventType === 'lead_marked_lost' && lossReasonIds && lossReasonIds.length > 0) {
        const reasonNames = lossReasonIds
          .map(id => lossReasons.find(r => r.id === id)?.name || id)
          .join(', ')
        parts.push(`Motivos: ${reasonNames}`)
      }
      parts.push(...formatUniversalConditions(cond))
      return parts.length > 0 ? parts.join(' • ') : null
    }

    const fromPipeId = cond.from_pipeline_id as string | undefined
    const fromStageId = cond.from_stage_id as string | undefined
    const toPipeId = cond.to_pipeline_id as string | undefined
    const toStageId = cond.to_stage_id as string | undefined

    const getPipeName = (id?: string) => (id ? (pipelines.find(p => p.id === id)?.name || id) : undefined)
    const getStageName = (id?: string) => (id ? (stageIndex[id]?.name || id) : undefined)

    const parts: string[] = []
    if (fromPipeId || fromStageId) {
      const fp = getPipeName(fromPipeId)
      const fs = getStageName(fromStageId)
      parts.push(`De ${[fp, fs].filter(Boolean).join(' > ')}`)
    }
    if (toPipeId || toStageId) {
      const tp = getPipeName(toPipeId)
      const ts = getStageName(toStageId)
      parts.push(`Para ${[tp, ts].filter(Boolean).join(' > ')}`)
    }
    parts.push(...formatUniversalConditions(cond))
    if (parts.length === 0) return null
    return parts.join(' • ')
  }

  function formatEventType(eventType: string): string {
    switch (eventType) {
      case 'lead_stage_changed':
        return 'Mudança de etapa'
      case 'lead_marked_sold':
        return 'Lead vendido'
      case 'lead_marked_lost':
        return 'Lead perdido'
      case 'lead_responsible_assigned':
        return 'Responsável atribuído'
      case 'conversation_created':
        return 'Nova conversa criada'
      case 'lead_idle_in_stage':
        return 'Lead parado por tempo'
      case 'task_created':
        return 'Tarefa criada'
      default:
        return eventType
    }
  }

  function getDefaultConditionText(eventType: string): string {
    switch (eventType) {
      case 'lead_stage_changed':
        return 'Qualquer mudança de etapa'
      case 'lead_marked_sold':
        return 'Qualquer pipeline'
      case 'lead_marked_lost':
        return 'Qualquer pipeline'
      case 'lead_responsible_assigned':
        return 'Qualquer responsável'
      case 'conversation_created':
        return 'Qualquer nova conversa'
      case 'lead_idle_in_stage':
        return 'Configuração de tempo pendente'
      case 'task_created':
        return 'Qualquer tarefa criada'
      default:
        return 'Sem condição específica'
    }
  }

  function getPipelineName(id?: string) {
    if (!id) return undefined
    return pipelines.find(p => p.id === id)?.name || id
  }

  function formatAction(rule: AutomationRule): string {
    const actions = (rule.actions && rule.actions.length > 0)
      ? rule.actions
      : (rule.action ? [rule.action] : [])
    if (actions.length > 1) {
      return actions
        .map((action, index) => `${index + 1}) ${formatSingleAction(action as any)}`)
        .join(' • ')
    }
    const action: any = actions[0] || {}
    return formatSingleAction(action)
  }

  function formatSingleAction(action: any): string {
    const type = action.type as string
    if (type === 'move_lead') {
      const pName = getPipelineName(action.target_pipeline_id)
      const sName = stageIndex[action.target_stage_id]?.name || action.target_stage_id || ''
      const path = [pName, sName].filter(Boolean).join(' > ')
      return path ? `Mover lead para ${path}` : 'Mover lead'
    }
    if (type === 'create_task') {
      const title = action.title ? `: "${action.title}"` : ''
      const intervalUnit = action.task_interval_unit === 'months' ? 'mensal' : ''
      const count = action.task_count > 1
        ? ` (${action.task_count} tarefas${intervalUnit ? `, ${intervalUnit}` : ''})`
        : ''
      const mode = action.due_date_mode === 'fixed' ? ' [Data fixa]' : ' [Data manual]'
      const rawAssigneeMode = action.assignee_mode as 'auto' | 'fixed' | 'manual' | undefined
      const assigneeMode = rawAssigneeMode || ((action.assigned_to || '').trim() ? 'fixed' : 'auto')
      const assigneeLabel = assigneeMode === 'manual' ? ' [Resp. manual]' : ''
      return `Criar tarefa${title}${count}${mode}${assigneeLabel}`
    }
    if (type === 'assign_responsible') {
      const responsibleId = (action.responsible_uuid as string) || ''
      const responsibleName = profiles.find(p => p.uuid === responsibleId)?.full_name || responsibleId
      return responsibleName ? `Atribuir responsável: ${responsibleName}` : 'Atribuir responsável'
    }
    if (type === 'mark_as_sold') {
      return 'Marcar lead como vendido (abre modal)'
    }
    if (type === 'mark_as_lost') {
      return 'Marcar lead como perdido (abre modal)'
    }
    if (type === 'call_webhook') {
      const url = action.webhook_url as string
      const method = action.webhook_method || 'POST'
      const truncatedUrl = url && url.length > 40 ? url.substring(0, 40) + '...' : url
      return truncatedUrl ? `Webhook ${method}: ${truncatedUrl}` : 'Acionar webhook'
    }
    if (type === 'send_whatsapp') {
      const waType = (action.wa_message_type as string) || 'text'
      const template = (action.message_template as string) || ''
      const preview = template.length > 50 ? template.substring(0, 50) + '...' : template
      const instanceId = action.instance_id as string
      const instanceName = whatsappInstances.find(i => i.id === instanceId)?.display_name 
        || whatsappInstances.find(i => i.id === instanceId)?.name 
        || ''
      const instanceLabel = instanceName ? ` (${instanceName})` : ''
      const typeLabels: Record<string, string> = { text: '', image: ' [Imagem]', video: ' [Vídeo]', audio: ' [Áudio]' }
      const typeLabel = typeLabels[waType] || ''
      if (waType !== 'text') {
        const filename = action.media_filename as string
        return `WhatsApp${instanceLabel}${typeLabel}${filename ? `: ${filename}` : ''}${preview ? ` — "${preview}"` : ''}`
      }
      return preview ? `WhatsApp${instanceLabel}: "${preview}"` : 'Enviar mensagem WhatsApp'
    }
    if (type === 'send_message') {
      return 'Enviar mensagem (template/configuração aplicada)'
    }
    if (type === 'send_notification') {
      return 'Enviar notificação interna'
    }
    return 'Ação personalizada'
  }

  function resetForm() {
    setForm({
      name: '', description: '', event_type: 'lead_stage_changed', active: true,
      condition: {}, action: { ...DEFAULT_AUTOMATION_ACTION }, actions: [{ ...DEFAULT_AUTOMATION_ACTION }]
    })
    setActionQueue([{ ...DEFAULT_AUTOMATION_ACTION }])
    setActiveActionIndex(0)
    setEditingId(null)
    setFromStages([])
    setToStages([])
    setTargetStages([])
    setError(null)
  }

  function handleOpenCreate() {
    resetForm()
    setModalOpen(true)
  }

  async function handleEdit(item: AutomationRule) {
    setEditingId(item.id)
    setError(null)
    
    // Preencher formulário com dados da automação
    const actionList = (item.actions && item.actions.length > 0)
      ? item.actions
      : (item.action ? [item.action] : [{ ...DEFAULT_AUTOMATION_ACTION }])
    const action: any = actionList[0] || { ...DEFAULT_AUTOMATION_ACTION }
    setForm({
      name: item.name || '',
      description: item.description || '',
      event_type: item.event_type || 'lead_stage_changed',
      active: item.active ?? true,
      condition: item.condition || {},
      action,
      actions: actionList
    })
    setActionQueue(actionList as Record<string, any>[])
    setActiveActionIndex(0)

    // Carregar stages para os pipelines selecionados
    const cond: any = item.condition || {}
    if (cond.from_pipeline_id) {
      await loadStagesFor(cond.from_pipeline_id, 'from')
    }
    if (cond.to_pipeline_id) {
      await loadStagesFor(cond.to_pipeline_id, 'to')
    }
    if (action.target_pipeline_id) {
      await loadStagesFor(action.target_pipeline_id, 'target')
    }
    const idlePipeIds = cond.pipeline_ids as string[] | undefined
    if (idlePipeIds?.length) {
      await loadStagesFor(idlePipeIds, 'idle')
    }

    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    resetForm()
  }
  
  useEscapeKey(modalOpen, handleCloseModal)
  useEscapeKey(!!deleteConfirmItem, handleCancelDelete)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      setCreating(true)
      // Validações mínimas
      const actions = getEffectiveActions()
      for (const action of actions) {
        if (action?.type === 'create_task') {
          const title = (action.title || '').trim()
          if (!title) {
            setError('Informe um título para todas as tarefas automáticas configuradas')
            setCreating(false)
            return
          }
        }
      }
      const payload: CreateAutomationRuleData = {
        ...form,
        action: actions[0] || { ...DEFAULT_AUTOMATION_ACTION },
        actions
      }
      
      if (editingId) {
        // Atualizar automação existente
        const { error } = await updateAutomation(editingId, payload)
        if (error) throw error
      } else {
        // Criar nova automação
        const { error } = await createAutomation(payload)
        if (error) throw error
      }
      
      resetForm()
      setModalOpen(false)
      await load()
    } catch (e: any) {
      setError(editingId ? 'Erro ao atualizar automação' : 'Erro ao criar automação')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(item: AutomationRule) {
    const { error } = await updateAutomation(item.id, { active: !item.active })
    if (!error) load()
  }

  // Modal de confirmação de exclusão
  function handleDeleteClick(item: AutomationRule) {
    setDeleteConfirmItem(item)
  }

  function handleCancelDelete() {
    setDeleteConfirmItem(null)
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmItem) return
    try {
      setDeleting(true)
      const { error } = await deleteAutomation(deleteConfirmItem.id)
      if (!error) {
        setDeleteConfirmItem(null)
        await load()
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handleDuplicate(item: AutomationRule) {
    try {
      setDuplicating(item.id)
      const sourceActions = (item.actions && item.actions.length > 0)
        ? item.actions
        : (item.action ? [item.action] : [{ ...DEFAULT_AUTOMATION_ACTION }])
      const duplicatedData: CreateAutomationRuleData = {
        name: `${item.name} (cópia)`,
        description: item.description || '',
        event_type: item.event_type,
        active: false, // Cópia começa desativada para evitar execuções acidentais
        condition: item.condition || {},
        action: sourceActions[0] || { ...DEFAULT_AUTOMATION_ACTION },
        actions: sourceActions
      }
      const { error } = await createAutomation(duplicatedData)
      if (!error) {
        await load()
      }
    } finally {
      setDuplicating(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Lista de automações */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Criar automação
        </button>
      </div>

      {/* Modal de criar/editar automação */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleCloseModal}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Editar regra de automação' : 'Criar regra de automação'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Conteúdo do formulário */}
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nome da automação"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <div className="md:col-span-2 min-w-0">
            <StyledSelect
              className="min-w-[300px]"
              options={[
              { value: 'lead_stage_changed', label: 'Quando lead mudar de etapa' },
              { value: 'lead_idle_in_stage', label: 'Lead parado no estágio por tempo' },
              { value: 'lead_marked_sold', label: 'Lead marcado como vendido' },
              { value: 'lead_marked_lost', label: 'Lead marcado como perdido' },
              { value: 'lead_responsible_assigned', label: 'Quando responsável for atribuído' },
              { value: 'conversation_created', label: 'Quando nova conversa for criada' },
              { value: 'task_created', label: 'Quando uma tarefa for criada' }
            ]}
            value={form.event_type}
            onChange={(val) => {
              if (val === 'lead_marked_sold' || val === 'lead_marked_lost') {
                setForm(prev => ({ 
                  ...prev, 
                  event_type: val as any,
                  condition: {}
                }))
              } else if (val === 'lead_responsible_assigned') {
                setForm(prev => ({
                  ...prev,
                  event_type: val as any,
                  condition: {}
                }))
              } else if (val === 'conversation_created') {
                setForm(prev => ({
                  ...prev,
                  event_type: val as any,
                  condition: {}
                }))
              } else if (val === 'lead_idle_in_stage') {
                setForm(prev => ({
                  ...prev,
                  event_type: val as any,
                  condition: { idle_time_value: 24, idle_time_unit: 'hours', is_recurring: false }
                }))
              } else if (val === 'task_created') {
                setForm(prev => ({
                  ...prev,
                  event_type: val as any,
                  condition: {}
                }))
              } else {
                setForm(prev => ({ ...prev, event_type: val as any }))
              }
            }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Ativa</label>
            <input type="checkbox" checked={!!form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} />
          </div>

          <input
            className="border rounded px-3 py-2 md:col-span-4"
            placeholder="Descrição (opcional)"
            value={form.description || ''}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          />

          {/* Condições para evento de mudança de etapa */}
          {form.event_type === 'lead_stage_changed' && (
            <div className="md:col-span-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">De pipeline</label>
                  <PipelineSingleSelect
                    pipelines={pipelines}
                    value={((form.condition as any).from_pipeline_id || '') as string}
                    placeholder="Selecione"
                    onChange={async (value) => {
                      setForm(prev => ({ ...prev, condition: { ...prev.condition, from_pipeline_id: value, from_stage_id: '' } }))
                      await loadStagesFor(value, 'from')
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">De etapa</label>
                  <StageSingleSelect
                    stages={fromStages}
                    value={(form.condition as any).from_stage_id || ''}
                    allowEmpty
                    placeholder="Qualquer"
                    onChange={(v) => setForm(prev => ({ ...prev, condition: { ...prev.condition, from_stage_id: v } }))}
                  />
                </div>
                <div></div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Para pipeline</label>
                  <PipelineSingleSelect
                    pipelines={pipelines}
                    value={((form.condition as any).to_pipeline_id || '') as string}
                    placeholder="Selecione"
                    onChange={async (value) => {
                      setForm(prev => ({ ...prev, condition: { ...prev.condition, to_pipeline_id: value, to_stage_id: '' } }))
                      await loadStagesFor(value, 'to')
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Para etapa</label>
                  <StageSingleSelect
                    stages={toStages}
                    value={(form.condition as any).to_stage_id || ''}
                    allowEmpty
                    placeholder="Qualquer"
                    onChange={(v) => setForm(prev => ({ ...prev, condition: { ...prev.condition, to_stage_id: v } }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Condições para eventos de vendido/perdido */}
          {(form.event_type === 'lead_marked_sold' || form.event_type === 'lead_marked_lost') && (
            <div className="md:col-span-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Pipeline</label>
                  <PipelineSingleSelect
                    pipelines={[{ id: '', name: 'Qualquer pipeline' } as Pipeline, ...pipelines]}
                    value={((form.condition as any).pipeline_id || '') as string}
                    placeholder="Qualquer pipeline"
                    onChange={(value) => {
                      setForm(prev => ({ 
                        ...prev, 
                        condition: { 
                          ...prev.condition,
                          pipeline_id: value || undefined 
                        } 
                      }))
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Filtrar automação para um pipeline específico ou deixar vazio para todos.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className={`p-3 rounded-lg ${form.event_type === 'lead_marked_sold' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm ${form.event_type === 'lead_marked_sold' ? 'text-green-700' : 'text-red-700'}`}>
                      {form.event_type === 'lead_marked_sold' 
                        ? 'Esta automação será executada quando um lead for marcado como vendido (pelo botão ou por outra automação).'
                        : 'Esta automação será executada quando um lead for marcado como perdido (pelo botão ou por outra automação).'
                      }
                    </p>
                  </div>
                </div>

                {/* Motivos de perda - apenas para lead_marked_lost */}
                {form.event_type === 'lead_marked_lost' && lossReasons.length > 0 && (
                  <div className="md:col-span-3">
                    <label className="block text-sm text-gray-700 mb-1.5">Motivos de perda específicos</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Selecione um ou mais motivos para restringir quando esta automação é executada. Deixe vazio para disparar em qualquer motivo.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lossReasons.map(reason => {
                        const selectedIds: string[] = ((form.condition as any).loss_reason_ids as string[]) || []
                        const isSelected = selectedIds.includes(reason.id)
                        return (
                          <button
                            key={reason.id}
                            type="button"
                            onClick={() => {
                              const current: string[] = ((form.condition as any).loss_reason_ids as string[]) || []
                              const next = isSelected
                                ? current.filter(id => id !== reason.id)
                                : [...current, reason.id]
                              setForm(prev => ({
                                ...prev,
                                condition: {
                                  ...prev.condition,
                                  loss_reason_ids: next.length > 0 ? next : undefined
                                }
                              }))
                            }}
                            className={`
                              px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                              ${isSelected
                                ? 'bg-red-100 text-red-700 ring-2 ring-offset-1 ring-red-500'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }
                            `}
                          >
                            {reason.name}
                          </button>
                        )
                      })}
                    </div>
                    {(((form.condition as any).loss_reason_ids as string[]) || []).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        {((form.condition as any).loss_reason_ids as string[]).length} motivo(s) selecionado(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Condições para evento de responsável atribuído */}
          {form.event_type === 'lead_responsible_assigned' && (
            <div className="md:col-span-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Pipeline</label>
                  <PipelineSingleSelect
                    pipelines={[{ id: '', name: 'Qualquer pipeline' } as Pipeline, ...pipelines]}
                    value={((form.condition as any).pipeline_id || '') as string}
                    placeholder="Qualquer pipeline"
                    onChange={(value) => {
                      setForm(prev => ({
                        ...prev,
                        condition: {
                          ...prev.condition,
                          pipeline_id: value || undefined
                        }
                      }))
                    }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1.5">Responsável(is) que disparam</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Selecione um ou mais responsáveis. Deixe vazio para disparar quando qualquer responsável for atribuído.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map(profile => {
                      const currentIds: string[] = ((form.condition as any).responsible_uuids as string[]) || []
                      const isSelected = currentIds.includes(profile.uuid)
                      return (
                        <button
                          key={profile.uuid}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? currentIds.filter(id => id !== profile.uuid)
                              : [...currentIds, profile.uuid]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                responsible_uuids: next.length > 0 ? next : undefined,
                                responsible_uuid: undefined
                              }
                            }))
                          }}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {profile.full_name || profile.email}
                        </button>
                      )
                    })}
                  </div>
                  {(((form.condition as any).responsible_uuids as string[]) || []).length > 0 && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      {((form.condition as any).responsible_uuids as string[]).length} responsável(eis) selecionado(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Condições para gatilho de tempo (lead parado no estágio) */}
          {form.event_type === 'lead_idle_in_stage' && (
            <div className="md:col-span-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Configuração de tempo</h4>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                <p className="text-sm text-amber-700">
                  Esta automação é executada server-side a cada 5 minutos. Funciona mesmo com o CRM fechado. Dispara quando um lead permanece no mesmo estágio pelo tempo configurado.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Pipeline(s)</label>
                  <p className="text-xs text-gray-500 mb-2">Selecione em quais pipelines monitorar. Deixe vazio para todos.</p>
                  <div className="flex flex-wrap gap-2">
                    {pipelines.map(pipeline => {
                      const currentIds: string[] = ((form.condition as any).pipeline_ids as string[]) || []
                      const isSelected = currentIds.includes(pipeline.id)
                      return (
                        <button
                          key={pipeline.id}
                          type="button"
                          onClick={async () => {
                            const next = isSelected
                              ? currentIds.filter(id => id !== pipeline.id)
                              : [...currentIds, pipeline.id]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                pipeline_ids: next.length > 0 ? next : undefined,
                                stage_ids: undefined,
                              }
                            }))
                            await loadStagesFor(next, 'idle')
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-amber-100 text-amber-700 ring-2 ring-offset-1 ring-amber-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {pipeline.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Estágio(s)</label>
                  <p className="text-xs text-gray-500 mb-2">Selecione estágios específicos. Deixe vazio para qualquer estágio.</p>
                  <div className="flex flex-wrap gap-2">
                    {idleStages.map(stage => {
                      const currentIds: string[] = ((form.condition as any).stage_ids as string[]) || []
                      const isSelected = currentIds.includes(stage.id)
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? currentIds.filter(id => id !== stage.id)
                              : [...currentIds, stage.id]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                stage_ids: next.length > 0 ? next : undefined,
                              }
                            }))
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-amber-100 text-amber-700 ring-2 ring-offset-1 ring-amber-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {stage.name}
                        </button>
                      )
                    })}
                    {idleStages.length === 0 && (
                      <span className="text-xs text-gray-400">
                        {((form.condition as any).pipeline_ids as string[] | undefined)?.length
                          ? 'Carregando estágios...'
                          : 'Selecione um pipeline primeiro'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tempo de inatividade</label>
                  <input
                    type="number"
                    min={(form.condition as any).idle_time_unit === 'minutes' ? 10 : 1}
                    step={(form.condition as any).idle_time_unit === 'minutes' ? 10 : 1}
                    className="border rounded px-3 py-2 w-full"
                    value={(form.condition as any).idle_time_value ?? 24}
                    onChange={e => {
                      const isMin = (form.condition as any).idle_time_unit === 'minutes'
                      const raw = Number(e.target.value) || (isMin ? 10 : 1)
                      const val = isMin ? Math.max(10, Math.round(raw / 10) * 10) : Math.max(1, raw)
                      setForm(prev => ({ ...prev, condition: { ...prev.condition, idle_time_value: val } }))
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Unidade</label>
                  <StyledSelect
                    options={[
                      { value: 'minutes', label: 'Minutos (mín. 10)' },
                      { value: 'hours', label: 'Horas' },
                      { value: 'days', label: 'Dias' },
                    ]}
                    value={(form.condition as any).idle_time_unit || 'hours'}
                    onChange={val => setForm(prev => {
                      const currentVal = (prev.condition as any).idle_time_value ?? 24
                      const adjustedVal = val === 'minutes' ? Math.max(10, Math.round(currentVal / 10) * 10 || 10) : currentVal
                      return { ...prev, condition: { ...prev.condition, idle_time_unit: val, idle_time_value: adjustedVal } }
                    })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Modo de disparo</label>
                  <div className="flex gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        condition: { ...prev.condition, is_recurring: false }
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        !(form.condition as any).is_recurring
                          ? 'bg-amber-100 text-amber-700 ring-2 ring-offset-1 ring-amber-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Disparo único
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        condition: { ...prev.condition, is_recurring: true, recurring_interval_value: (prev.condition as any).idle_time_value || 24, recurring_interval_unit: (prev.condition as any).idle_time_unit || 'hours' }
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        (form.condition as any).is_recurring
                          ? 'bg-amber-100 text-amber-700 ring-2 ring-offset-1 ring-amber-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Recorrente
                    </button>
                  </div>
                </div>

                {(form.condition as any).is_recurring && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Repetir a cada</label>
                      <input
                        type="number"
                        min={(form.condition as any).recurring_interval_unit === 'minutes' ? 10 : 1}
                        step={(form.condition as any).recurring_interval_unit === 'minutes' ? 10 : 1}
                        className="border rounded px-3 py-2 w-full"
                        value={(form.condition as any).recurring_interval_value ?? 24}
                        onChange={e => {
                          const isMin = (form.condition as any).recurring_interval_unit === 'minutes'
                          const raw = Number(e.target.value) || (isMin ? 10 : 1)
                          const val = isMin ? Math.max(10, Math.round(raw / 10) * 10) : Math.max(1, raw)
                          setForm(prev => ({ ...prev, condition: { ...prev.condition, recurring_interval_value: val } }))
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Unidade</label>
                      <StyledSelect
                        options={[
                          { value: 'minutes', label: 'Minutos (mín. 10)' },
                          { value: 'hours', label: 'Horas' },
                          { value: 'days', label: 'Dias' },
                        ]}
                        value={(form.condition as any).recurring_interval_unit || 'hours'}
                        onChange={val => setForm(prev => {
                          const currentVal = (prev.condition as any).recurring_interval_value ?? 24
                          const adjustedVal = val === 'minutes' ? Math.max(10, Math.round(currentVal / 10) * 10 || 10) : currentVal
                          return { ...prev, condition: { ...prev.condition, recurring_interval_unit: val, recurring_interval_value: adjustedVal } }
                        })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Condições para evento de nova conversa criada */}
          {form.event_type === 'conversation_created' && (
            <div className="md:col-span-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                <p className="text-sm text-blue-700">
                  Esta automação é executada server-side sempre que uma nova conversa for criada — inclusive por sistemas externos (n8n, API, etc.), mesmo com o CRM fechado.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm text-gray-700 mb-1.5">Instância(s) de WhatsApp</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Filtre por instância específica. Deixe vazio para disparar em qualquer instância.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {whatsappInstances.map(instance => {
                      const currentIds: string[] = ((form.condition as any).instance_ids as string[]) || []
                      const isSelected = currentIds.includes(instance.id)
                      return (
                        <button
                          key={instance.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? currentIds.filter(id => id !== instance.id)
                              : [...currentIds, instance.id]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                instance_ids: next.length > 0 ? next : undefined
                              }
                            }))
                          }}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {instance.name}
                        </button>
                      )
                    })}
                    {whatsappInstances.length === 0 && (
                      <span className="text-xs text-gray-400">Nenhuma instância configurada</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Lead vinculado</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Qualquer', value: undefined },
                      { label: 'Apenas com lead', value: true },
                      { label: 'Apenas sem lead', value: false }
                    ].map(opt => {
                      const currentHasLead = (form.condition as any).has_lead
                      const isSelected = currentHasLead === opt.value
                      return (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                has_lead: opt.value
                              }
                            }))
                          }}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left
                            ${isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1.5">Responsável atribuído</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Filtre pelo responsável inicial da conversa. Deixe vazio para qualquer responsável.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map(profile => {
                      const currentIds: string[] = ((form.condition as any).assigned_user_ids as string[]) || []
                      const isSelected = currentIds.includes(profile.uuid)
                      return (
                        <button
                          key={profile.uuid}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? currentIds.filter(id => id !== profile.uuid)
                              : [...currentIds, profile.uuid]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                assigned_user_ids: next.length > 0 ? next : undefined
                              }
                            }))
                          }}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {profile.full_name || profile.email}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Condições para evento de tarefa criada */}
          {form.event_type === 'task_created' && (
            <div className="md:col-span-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                <p className="text-sm text-blue-700">
                  Esta automação é executada server-side sempre que uma nova tarefa for criada — inclusive por sistemas externos (n8n, API) ou outras automações, mesmo com o CRM fechado.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3 flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Atenção: como a regra dispara para qualquer tarefa criada (incluindo tarefas criadas por outras automações), use os filtros abaixo para evitar disparos em cascata. Ações que dependem de lead vinculado serão ignoradas quando a tarefa não tiver lead.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Tipo da tarefa</label>
                  <p className="text-xs text-gray-500 mb-2">Filtre por tipos específicos. Deixe vazio para qualquer tipo.</p>
                  <div className="flex flex-wrap gap-2">
                    {taskTypes.map(type => {
                      const currentIds: string[] = ((form.condition as any).task_type_ids as string[]) || []
                      const isSelected = currentIds.includes(type.id)
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? currentIds.filter(id => id !== type.id)
                              : [...currentIds, type.id]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                task_type_ids: next.length > 0 ? next : undefined
                              }
                            }))
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {formatTaskTypeName(type.name)}
                        </button>
                      )
                    })}
                    {taskTypes.length === 0 && (
                      <span className="text-xs text-gray-400">Nenhum tipo de tarefa cadastrado</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Prioridade</label>
                  <p className="text-xs text-gray-500 mb-2">Filtre por prioridade. Deixe vazio para qualquer prioridade.</p>
                  <div className="flex flex-wrap gap-2">
                    {TASK_PRIORITY_OPTIONS.map(opt => {
                      const currentIds: string[] = ((form.condition as any).priorities as string[]) || []
                      const isSelected = currentIds.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? currentIds.filter(v => v !== opt.value)
                              : [...currentIds, opt.value]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                priorities: next.length > 0 ? next : undefined
                              }
                            }))
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Responsável atribuído</label>
                  <p className="text-xs text-gray-500 mb-2">Filtre pelo responsável da tarefa. Deixe vazio para qualquer responsável.</p>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map(profile => {
                      const currentIds: string[] = ((form.condition as any).assigned_to_ids as string[]) || []
                      const isSelected = currentIds.includes(profile.uuid)
                      return (
                        <button
                          key={profile.uuid}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? currentIds.filter(id => id !== profile.uuid)
                              : [...currentIds, profile.uuid]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                assigned_to_ids: next.length > 0 ? next : undefined
                              }
                            }))
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {profile.full_name || profile.email}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Criador</label>
                  <p className="text-xs text-gray-500 mb-2">Filtre por quem criou a tarefa. Deixe vazio para qualquer criador.</p>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map(profile => {
                      const currentIds: string[] = ((form.condition as any).created_by_ids as string[]) || []
                      const isSelected = currentIds.includes(profile.uuid)
                      return (
                        <button
                          key={profile.uuid}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? currentIds.filter(id => id !== profile.uuid)
                              : [...currentIds, profile.uuid]
                            setForm(prev => ({
                              ...prev,
                              condition: {
                                ...prev.condition,
                                created_by_ids: next.length > 0 ? next : undefined
                              }
                            }))
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {profile.full_name || profile.email}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Condições universais: Status, Origem e Tags (aplicáveis a eventos de lead) */}
          {form.event_type !== 'conversation_created' && form.event_type !== 'task_created' && <div className="md:col-span-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Condições do lead (opcional)</h4>
            <p className="text-xs text-gray-500 mb-3">
              Restrinja a automação com base em atributos do lead. Deixe vazio para disparar para qualquer valor.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Status</label>
                <div className="flex flex-wrap gap-2">
                  {LEAD_STATUS_OPTIONS.map(opt => {
                    const selectedStatuses: string[] = ((form.condition as any).statuses as string[]) || []
                    const isSelected = selectedStatuses.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? selectedStatuses.filter(s => s !== opt.value)
                            : [...selectedStatuses, opt.value]
                          setForm(prev => ({
                            ...prev,
                            condition: {
                              ...prev.condition,
                              statuses: next.length > 0 ? next : undefined
                            }
                          }))
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${isSelected
                            ? 'bg-purple-100 text-purple-700 ring-2 ring-offset-1 ring-purple-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Origem */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Origem</label>
                <div className="flex flex-wrap gap-2">
                  {availableOrigins.length > 0 ? availableOrigins.map(origin => {
                    const selectedOrigins: string[] = ((form.condition as any).origins as string[]) || []
                    const isSelected = selectedOrigins.includes(origin)
                    return (
                      <button
                        key={origin}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? selectedOrigins.filter(o => o !== origin)
                            : [...selectedOrigins, origin]
                          setForm(prev => ({
                            ...prev,
                            condition: {
                              ...prev.condition,
                              origins: next.length > 0 ? next : undefined
                            }
                          }))
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${isSelected
                            ? 'bg-teal-100 text-teal-700 ring-2 ring-offset-1 ring-teal-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {origin}
                      </button>
                    )
                  }) : (
                    <p className="text-xs text-gray-400">Nenhuma origem encontrada nos leads.</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.length > 0 ? availableTags.map(tag => {
                    const selectedTags: string[] = ((form.condition as any).tags as string[]) || []
                    const isSelected = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? selectedTags.filter(t => t !== tag)
                            : [...selectedTags, tag]
                          setForm(prev => ({
                            ...prev,
                            condition: {
                              ...prev.condition,
                              tags: next.length > 0 ? next : undefined
                            }
                          }))
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${isSelected
                            ? 'bg-amber-100 text-amber-700 ring-2 ring-offset-1 ring-amber-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {tag}
                      </button>
                    )
                  }) : (
                    <p className="text-xs text-gray-400">Nenhuma tag encontrada nos leads.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Resumo das condições selecionadas */}
            {(((form.condition as any).statuses as string[])?.length > 0 ||
              ((form.condition as any).origins as string[])?.length > 0 ||
              ((form.condition as any).tags as string[])?.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {((form.condition as any).statuses as string[])?.length > 0 && (
                  <span className="text-xs text-purple-600">
                    Status: {((form.condition as any).statuses as string[]).length} selecionado(s)
                  </span>
                )}
                {((form.condition as any).origins as string[])?.length > 0 && (
                  <span className="text-xs text-teal-600">
                    {((form.condition as any).statuses as string[])?.length > 0 ? ' • ' : ''}Origem: {((form.condition as any).origins as string[]).length} selecionada(s)
                  </span>
                )}
                {((form.condition as any).tags as string[])?.length > 0 && (
                  <span className="text-xs text-amber-600">
                    {(((form.condition as any).statuses as string[])?.length > 0 || ((form.condition as any).origins as string[])?.length > 0) ? ' • ' : ''}Tags: {((form.condition as any).tags as string[]).length} selecionada(s)
                  </span>
                )}
              </div>
            )}
          </div>}

          <div className="md:col-span-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Ação</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm text-gray-700 mb-1">Ações configuradas</label>
                <div className="flex flex-wrap items-center gap-2">
                  {getEffectiveActions().map((action, index) => (
                    <button
                      key={`${index}-${action.type || 'action'}`}
                      type="button"
                      onClick={() => {
                        setActiveActionIndex(index)
                        setForm(prev => ({ ...prev, action }))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        index === activeActionIndex
                          ? 'bg-primary-100 text-primary-700 ring-2 ring-offset-1 ring-primary-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}. {getActionTypeLabel(action?.type)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const nextAction = { ...DEFAULT_AUTOMATION_ACTION }
                      const actions = [...getEffectiveActions(), nextAction]
                      setActionQueue(actions)
                      setActiveActionIndex(actions.length - 1)
                      setForm(prev => ({ ...prev, action: nextAction }))
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    + Adicionar ação
                  </button>
                  {getEffectiveActions().length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const actions = getEffectiveActions().filter((_, idx) => idx !== activeActionIndex)
                        const nextIndex = Math.max(0, Math.min(activeActionIndex, actions.length - 1))
                        const nextAction = actions[nextIndex] || { ...DEFAULT_AUTOMATION_ACTION }
                        setActionQueue(actions)
                        setActiveActionIndex(nextIndex)
                        setForm(prev => ({ ...prev, action: nextAction }))
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Remover ação atual
                    </button>
                  )}
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm text-gray-700 mb-1">Tipo de ação</label>
                <StyledSelect
                  options={[
                    { value: 'move_lead', label: 'Mover lead para pipeline/etapa' },
                    { value: 'create_task', label: 'Criar tarefa' },
                    { value: 'assign_responsible', label: 'Atribuir responsável' },
                    ...(form.event_type !== 'conversation_created' && form.event_type !== 'task_created' ? [
                      { value: 'mark_as_sold', label: 'Marcar lead como vendido' },
                      { value: 'mark_as_lost', label: 'Marcar lead como perdido' }
                    ] : []),
                    { value: 'call_webhook', label: 'Acionar webhook' },
                    { value: 'send_whatsapp', label: 'Enviar mensagem WhatsApp' }
                  ]}
                  value={(form.action as any).type || 'move_lead'}
                  onChange={(nextType) => {
                    if (nextType === 'move_lead') {
                      setForm(prev => ({ ...prev, action: { type: 'move_lead', target_pipeline_id: '', target_stage_id: '' } }))
                    } else if (nextType === 'create_task') {
                      setForm(prev => ({ ...prev, action: { 
                        type: 'create_task', 
                        title: '', 
                        priority: 'media', 
                        task_type_id: '', 
                        assign_to_responsible: true,
                        assignee_mode: 'auto',
                        assigned_to: '',
                        task_count: 1,
                        due_date_mode: 'manual',
                        due_in_days: undefined,
                        due_time: undefined,
                        task_interval_days: 0,
                        task_interval_unit: 'days'
                      } }))
                    } else if (nextType === 'assign_responsible') {
                      setForm(prev => ({ ...prev, action: { type: 'assign_responsible', responsible_uuid: '' } }))
                    } else if (nextType === 'mark_as_sold') {
                      setForm(prev => ({ ...prev, action: { type: 'mark_as_sold' } }))
                    } else if (nextType === 'mark_as_lost') {
                      setForm(prev => ({ ...prev, action: { type: 'mark_as_lost' } }))
                    } else if (nextType === 'call_webhook') {
                      setForm(prev => ({ ...prev, action: { 
                        type: 'call_webhook',
                        webhook_url: '',
                        webhook_method: 'POST',
                        webhook_headers: [],
                        webhook_fields: ['id', 'name', 'email', 'phone', 'value', 'status', 'pipeline_id', 'stage_id']
                      } }))
                    } else if (nextType === 'send_whatsapp') {
                      setWaMediaPreview(null)
                      setWaUploadError(null)
                      setForm(prev => ({ ...prev, action: { 
                        type: 'send_whatsapp',
                        instance_id: whatsappInstances.length === 1 ? whatsappInstances[0].id : '',
                        message_template: '',
                        wa_message_type: 'text',
                      } }))
                    } else {
                      setForm(prev => ({ ...prev, action: { type: nextType as any } }))
                    }
                  }}
                />
              </div>

              {(form.action as any).type === 'move_lead' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Pipeline destino</label>
                    <PipelineSingleSelect
                      pipelines={pipelines}
                      value={(form.action as any).target_pipeline_id || ''}
                      placeholder="Selecione"
                      onChange={async (value) => {
                        setForm(prev => ({ ...prev, action: { ...prev.action, target_pipeline_id: value, target_stage_id: '' } }))
                        await loadStagesFor(value, 'target')
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Etapa destino</label>
                    <StageSingleSelect
                      stages={targetStages}
                      value={(form.action as any).target_stage_id || ''}
                      placeholder="Selecione"
                      onChange={(v) => setForm(prev => ({ ...prev, action: { ...prev.action, target_stage_id: v } }))}
                    />
                  </div>
                </>
              )}

              {(form.action as any).type === 'create_task' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Título da tarefa</label>
                    <input
                      className="border rounded px-3 py-2 w-full"
                      placeholder="Ex.: Fazer follow-up"
                      value={(form.action as any).title || ''}
                      onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, title: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Tipo de tarefa</label>
                    <select
                      className="border rounded px-3 py-2 w-full"
                      value={(form.action as any).task_type_id || ''}
                      onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, task_type_id: e.target.value } }))}
                    >
                      <option value="">Selecione um tipo</option>
                      {taskTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {formatTaskTypeName(type.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Prioridade</label>
                    <select
                      className="border rounded px-3 py-2 w-full"
                      value={(form.action as any).priority || 'media'}
                      onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, priority: e.target.value } }))}
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Quantidade de tarefas</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="border rounded px-3 py-2 w-full"
                      placeholder="1"
                      value={(form.action as any).task_count || 1}
                      onChange={e => {
                        const count = parseInt(e.target.value) || 1
                        setForm(prev => ({ 
                          ...prev, 
                          action: { 
                            ...prev.action, 
                            task_count: Math.max(1, Math.min(10, count))
                          } 
                        }))
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Número de tarefas a serem criadas automaticamente (1-10)</p>
                    
                    {((form.action as any).task_count > 1) && (() => {
                      const intervalUnit: 'days' | 'months' =
                        (form.action as any).task_interval_unit === 'months' ? 'months' : 'days'
                      return (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 mb-1">
                            Intervalo entre tarefas ({intervalUnit === 'months' ? 'meses' : 'dias'})
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              step={intervalUnit === 'months' ? '1' : '0.1'}
                              className="border rounded px-3 py-2 flex-1"
                              placeholder={intervalUnit === 'months' ? 'Ex.: 1 (todo mês)' : 'Ex.: 0.1 (1h), 1 (1 dia)...'}
                              value={(form.action as any).task_interval_days ?? 0}
                              onChange={e => {
                                const value = e.target.value
                                if (value === '') {
                                  setForm(prev => ({
                                    ...prev,
                                    action: {
                                      ...prev.action,
                                      task_interval_days: 0
                                    }
                                  }))
                                  return
                                }

                                if (intervalUnit === 'months') {
                                  // Em meses só aceita inteiros
                                  const interval = parseInt(value, 10)
                                  if (!Number.isFinite(interval) || interval < 0) return
                                  setForm(prev => ({
                                    ...prev,
                                    action: {
                                      ...prev.action,
                                      task_interval_days: interval
                                    }
                                  }))
                                  return
                                }

                                const interval = parseFloat(value)
                                if (!isNaN(interval) && interval >= 0) {
                                  // Verificar se as horas calculadas são válidas (máximo 23 horas)
                                  let isValid = true
                                  if (interval < 1 && interval > 0) {
                                    const decimalStr = value.split('.')[1] || ''
                                    const hours = decimalStr.length === 1
                                      ? Math.round(interval * 10)
                                      : Math.round(interval * 100)
                                    if (hours > 23) {
                                      isValid = false
                                    }
                                  } else if (interval >= 1) {
                                    const decimalPart = interval % 1
                                    if (decimalPart > 0) {
                                      const decimalStr = value.split('.')[1] || ''
                                      const hours = decimalStr.length === 1
                                        ? Math.round(decimalPart * 10)
                                        : Math.round(decimalPart * 100)
                                      if (hours > 23) {
                                        isValid = false
                                      }
                                    }
                                  }

                                  if (!isValid) return

                                  setForm(prev => ({
                                    ...prev,
                                    action: {
                                      ...prev.action,
                                      task_interval_days: interval
                                    }
                                  }))
                                }
                              }}
                            />
                            <select
                              className="border rounded px-2 py-2"
                              value={intervalUnit}
                              onChange={e => {
                                const next = e.target.value as 'days' | 'months'
                                setForm(prev => {
                                  const prevAction = prev.action as any
                                  const nextAction = { ...prevAction, task_interval_unit: next }
                                  if (next === 'months') {
                                    const current = typeof prevAction.task_interval_days === 'number' ? prevAction.task_interval_days : 0
                                    nextAction.task_interval_days = Math.max(1, Math.round(current || 1))
                                  }
                                  return { ...prev, action: nextAction }
                                })
                              }}
                            >
                              <option value="days">Dias</option>
                              <option value="months">Meses</option>
                            </select>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {intervalUnit === 'months'
                              ? 'As tarefas serão criadas no mesmo dia dos meses subsequentes (ex.: 10/06, 10/07, 10/08).'
                              : '0 = mesmo dia, 0.1 = 1h, 0.23 = 23h, 1 = 1 dia, etc.'}
                          </p>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">Data e horário</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                        <input
                          type="radio"
                          name="due-date-mode"
                          checked={((form.action as any).due_date_mode || 'manual') === 'manual'}
                          onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, due_date_mode: 'manual' } }))}
                        />
                        <span className="text-sm text-gray-800">Manual (abre modal)</span>
                      </label>
                      <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                        <input
                          type="radio"
                          name="due-date-mode"
                          checked={((form.action as any).due_date_mode) === 'fixed'}
                          onChange={() => setForm(prev => {
                            const prevAction = prev.action as any
                            const nextAction: Record<string, any> = { ...prevAction, due_date_mode: 'fixed' }
                            if (prevAction.assignee_mode === 'manual') {
                              nextAction.assignee_mode = 'auto'
                              nextAction.assigned_to = ''
                            }
                            return { ...prev, action: nextAction }
                          })}
                        />
                        <span className="text-sm text-gray-800">Fixo (calculado automaticamente)</span>
                      </label>
                    </div>

                    {((form.action as any).due_date_mode === 'fixed') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Dias/Horas para vencimento</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="border rounded px-3 py-2 w-full"
                            placeholder="Ex.: 0 (hoje), 0.1 (1h), 0.23 (23h), 1 (1 dia), 2.10 (2 dias + 10h)..."
                            value={(form.action as any).due_in_days ?? ''}
                            onChange={e => {
                              const value = e.target.value
                              if (value === '') {
                                setForm(prev => ({ 
                                  ...prev, 
                                  action: { 
                                    ...prev.action, 
                                    due_in_days: undefined,
                                    due_time: undefined // Limpar horário quando valor for vazio
                                  } 
                                }))
                                return
                              }
                              const numValue = parseFloat(value)
                              if (!isNaN(numValue) && numValue >= 0) {
                                // Verificar se as horas calculadas são válidas (máximo 23 horas)
                                // Detectar quantas casas decimais: 1 casa (0.1) = *10, 2 casas (0.12) = *100
                                let isValid = true
                                if (numValue < 1 && numValue > 0) {
                                  // Detectar casas decimais
                                  const decimalStr = value.split('.')[1] || ''
                                  const hours = decimalStr.length === 1 
                                    ? Math.round(numValue * 10)  // 1 casa: 0.1 = 1h
                                    : Math.round(numValue * 100) // 2 casas: 0.12 = 12h
                                  if (hours > 23) {
                                    isValid = false
                                  }
                                } else if (numValue >= 1) {
                                  // Dias + horas
                                  const decimalPart = numValue % 1
                                  if (decimalPart > 0) {
                                    const decimalStr = value.split('.')[1] || ''
                                    const hours = decimalStr.length === 1
                                      ? Math.round(decimalPart * 10)  // 1 casa: 0.1 = 1h
                                      : Math.round(decimalPart * 100) // 2 casas: 0.12 = 12h
                                    if (hours > 23) {
                                      isValid = false
                                    }
                                  }
                                }
                                
                                if (!isValid) {
                                  return // Não permitir mais de 23 horas
                                }
                                
                                setForm(prev => ({ 
                                  ...prev, 
                                  action: { 
                                    ...prev.action, 
                                    due_in_days: numValue,
                                    // Se tiver parte decimal (< 1 ou >= 1 com decimal), remover horário fixo (será calculado automaticamente)
                                    due_time: (numValue < 1 || (numValue >= 1 && numValue % 1 > 0)) ? undefined : (prev.action as any)?.due_time
                                  } 
                                }))
                              }
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-1">0 = hoje, 0.1 = 1h, 0.23 = 23h, 1 = 1 dia, 2.10 = 2 dias + 10h, etc.</p>
                        </div>
                        {(() => {
                          const dueInDays = (form.action as any).due_in_days
                          const hasDecimal = dueInDays && ((dueInDays < 1 && dueInDays > 0) || (dueInDays >= 1 && dueInDays % 1 > 0))
                          
                          if (hasDecimal) {
                            // Calcular a descrição do valor digitado
                            let description = ''
                            if (dueInDays < 1 && dueInDays > 0) {
                              // Detectar casas decimais: 1 casa (0.1) = *10, 2 casas (0.12) = *100
                              const dueInDaysStr = String(dueInDays)
                              const decimalStr = dueInDaysStr.split('.')[1] || ''
                              const hours = decimalStr.length === 1
                                ? Math.round(dueInDays * 10)  // 1 casa: 0.1 = 1h
                                : Math.round(dueInDays * 100) // 2 casas: 0.12 = 12h
                              description = `${dueInDays} = ${hours} hora${hours !== 1 ? 's' : ''} após a criação`
                            } else if (dueInDays >= 1) {
                              // Dias + horas: detectar casas decimais
                              const days = Math.floor(dueInDays)
                              const decimalPart = dueInDays % 1
                              if (decimalPart > 0) {
                                const dueInDaysStr = String(dueInDays)
                                const decimalStr = dueInDaysStr.split('.')[1] || ''
                                const hours = decimalStr.length === 1
                                  ? Math.round(decimalPart * 10)  // 1 casa: 0.1 = 1h
                                  : Math.round(decimalPart * 100) // 2 casas: 0.12 = 12h
                                description = `${dueInDays} = ${days} dia${days !== 1 ? 's' : ''} e ${hours} hora${hours !== 1 ? 's' : ''} após a criação`
                              } else {
                                description = `${dueInDays} = ${days} dia${days !== 1 ? 's' : ''} após a criação`
                              }
                            }
                            
                            return (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Horário</label>
                                <div className="border rounded px-3 py-2 w-full bg-gray-50 text-gray-700 text-sm flex items-center h-[42px]">
                                  {description || 'Será calculado automaticamente'}
                                </div>
                              </div>
                            )
                          }
                          
                          return (
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Horário (HH:mm)</label>
                              <input
                                type="time"
                                className="border rounded px-3 py-2 w-full"
                                value={(form.action as any).due_time || ''}
                                onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, due_time: e.target.value } }))}
                              />
                              <p className="text-xs text-gray-500 mt-1">Opcional: se vazio, não terá horário específico</p>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">Selecionar responsável</label>
                    {(() => {
                      const action = form.action as any
                      const dueDateMode = (action.due_date_mode || 'manual') as 'manual' | 'fixed'
                      const rawMode = action.assignee_mode as 'auto' | 'fixed' | 'manual' | undefined
                      const inferredMode: 'auto' | 'fixed' | 'manual' = rawMode
                        || ((action.assigned_to || '').trim() ? 'fixed' : 'auto')
                      const showManualOption = dueDateMode === 'manual'
                      const currentMode: 'auto' | 'fixed' | 'manual' = inferredMode === 'manual' && !showManualOption ? 'auto' : inferredMode
                      return (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                              <input
                                type="radio"
                                name="auto-assign"
                                checked={currentMode === 'auto'}
                                onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, assignee_mode: 'auto', assigned_to: '' } }))}
                              />
                              <span className="text-sm text-gray-800">Automático (quem disparou)</span>
                            </label>
                            <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                              <input
                                type="radio"
                                name="auto-assign"
                                checked={currentMode === 'fixed'}
                                onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, assignee_mode: 'fixed' } }))}
                              />
                              <span className="text-sm text-gray-800">Fixo (usuário definido)</span>
                            </label>
                            {showManualOption && (
                              <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="auto-assign"
                                  checked={currentMode === 'manual'}
                                  onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, assignee_mode: 'manual', assigned_to: '' } }))}
                                />
                                <span className="text-sm text-gray-800">Definir manualmente (no modal)</span>
                              </label>
                            )}
                          </div>
                          {currentMode === 'fixed' && (
                            <div className="mt-2">
                              <select
                                className="border rounded px-3 py-2 w-full"
                                value={(form.action as any).assigned_to || ''}
                                onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, assigned_to: e.target.value } }))}
                              >
                                <option value="">Selecionar usuário específico</option>
                                {profiles.map(p => (
                                  <option key={p.uuid} value={p.uuid}>{p.full_name || p.email}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {currentMode === 'auto' && 'O responsável será o usuário que disparou a automação.'}
                            {currentMode === 'fixed' && 'O usuário selecionado será sempre o responsável das tarefas criadas.'}
                            {currentMode === 'manual' && 'Ao disparar a automação, o modal pedirá data, horário e responsável.'}
                          </p>
                        </>
                      )
                    })()}
                  </div>
                </>
              )}

              {(form.action as any).type === 'assign_responsible' && (
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Novo responsável</label>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={(form.action as any).responsible_uuid || ''}
                    onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, responsible_uuid: e.target.value } }))}
                  >
                    <option value="">Selecione um usuário</option>
                    {profiles.map(p => (
                      <option key={p.uuid} value={p.uuid}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ao disparar esta automação, o lead será atribuído ao usuário selecionado.
                  </p>
                </div>
              )}

              {(form.action as any).type === 'mark_as_sold' && (
                <div className="md:col-span-3">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-green-800">Marcar como vendido</h5>
                        <p className="text-sm text-green-700 mt-1">
                          Quando esta automação for executada, um modal será aberto solicitando o valor final da venda e observações.
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          O valor estimado do lead será sugerido automaticamente no modal.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(form.action as any).type === 'mark_as_lost' && (
                <div className="md:col-span-3">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-red-800">Marcar como perdido</h5>
                        <p className="text-sm text-red-700 mt-1">
                          Quando esta automação for executada, um modal será aberto solicitando o motivo da perda e observações.
                        </p>
                        <p className="text-xs text-red-600 mt-2">
                          Os motivos de perda cadastrados para o pipeline serão exibidos no modal.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(form.action as any).type === 'call_webhook' && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">URL do webhook *</label>
                    <input
                      className="border rounded px-3 py-2 w-full"
                      placeholder="https://exemplo.com/webhook"
                      value={(form.action as any).webhook_url || ''}
                      onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, webhook_url: e.target.value } }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">URL que receberá a requisição quando a automação for executada</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Método HTTP</label>
                    <select
                      className="border rounded px-3 py-2 w-full"
                      value={(form.action as any).webhook_method || 'POST'}
                      onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, webhook_method: e.target.value } }))}
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm text-gray-700 mb-2">Headers customizados (opcional)</label>
                    <div className="space-y-2">
                      {((form.action as any).webhook_headers || []).map((header: { key: string; value: string }, index: number) => (
                        <div key={index} className="flex gap-2">
                          <input
                            className="border rounded px-3 py-2 flex-1"
                            placeholder="Nome do header (ex: Authorization)"
                            value={header.key || ''}
                            onChange={e => {
                              const newHeaders = [...((form.action as any).webhook_headers || [])]
                              newHeaders[index] = { ...newHeaders[index], key: e.target.value }
                              setForm(prev => ({ ...prev, action: { ...prev.action, webhook_headers: newHeaders } }))
                            }}
                          />
                          <input
                            className="border rounded px-3 py-2 flex-1"
                            placeholder="Valor (ex: Bearer token123)"
                            value={header.value || ''}
                            onChange={e => {
                              const newHeaders = [...((form.action as any).webhook_headers || [])]
                              newHeaders[index] = { ...newHeaders[index], value: e.target.value }
                              setForm(prev => ({ ...prev, action: { ...prev.action, webhook_headers: newHeaders } }))
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newHeaders = ((form.action as any).webhook_headers || []).filter((_: any, i: number) => i !== index)
                              setForm(prev => ({ ...prev, action: { ...prev.action, webhook_headers: newHeaders } }))
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newHeaders = [...((form.action as any).webhook_headers || []), { key: '', value: '' }]
                          setForm(prev => ({ ...prev, action: { ...prev.action, webhook_headers: newHeaders } }))
                        }}
                        className="text-sm text-primary-600 hover:text-primary-500"
                      >
                        + Adicionar header
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm text-gray-700 mb-2">Campos do lead a enviar no payload *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {[
                        { value: 'id', label: 'ID' },
                        { value: 'name', label: 'Nome' },
                        { value: 'email', label: 'Email' },
                        { value: 'phone', label: 'Telefone' },
                        { value: 'company', label: 'Empresa' },
                        { value: 'value', label: 'Valor' },
                        { value: 'status', label: 'Status' },
                        { value: 'origin', label: 'Origem' },
                        { value: 'pipeline_id', label: 'Pipeline ID' },
                        { value: 'stage_id', label: 'Etapa ID' },
                        { value: 'tags', label: 'Tags' },
                        { value: 'notes', label: 'Notas' },
                        { value: 'responsible_uuid', label: 'Responsável ID' },
                        { value: 'created_at', label: 'Data criação' },
                        { value: 'sold_value', label: 'Valor venda' },
                        { value: 'sale_notes', label: 'Notas venda' },
                        { value: 'loss_reason_category', label: 'Motivo perda' },
                        { value: 'loss_reason_notes', label: 'Notas perda' }
                      ].map(field => (
                        <label key={field.value} className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={((form.action as any).webhook_fields || []).includes(field.value)}
                            onChange={e => {
                              const currentFields = (form.action as any).webhook_fields || []
                              const newFields = e.target.checked
                                ? [...currentFields, field.value]
                                : currentFields.filter((f: string) => f !== field.value)
                              setForm(prev => ({ ...prev, action: { ...prev.action, webhook_fields: newFields } }))
                            }}
                          />
                          <span className="text-gray-700">{field.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Selecione os campos que serão enviados no payload do webhook</p>
                  </div>

                  {/* Campos Personalizados */}
                  {customFields.length > 0 && (
                    <div className="md:col-span-3">
                      <label className="block text-sm text-gray-700 mb-2">Campos personalizados</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {customFields.map(field => {
                          const fieldKey = `custom_field_${field.id}`
                          return (
                            <label key={field.id} className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={((form.action as any).webhook_fields || []).includes(fieldKey)}
                                onChange={e => {
                                  const currentFields = (form.action as any).webhook_fields || []
                                  const newFields = e.target.checked
                                    ? [...currentFields, fieldKey]
                                    : currentFields.filter((f: string) => f !== fieldKey)
                                  setForm(prev => ({ ...prev, action: { ...prev.action, webhook_fields: newFields } }))
                                }}
                              />
                              <span className="text-gray-700">{field.name}</span>
                              <span className="text-xs text-gray-400">({field.type})</span>
                            </label>
                          )
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Os campos personalizados serão enviados dentro de "custom_fields" no payload</p>
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-blue-800">Estrutura do payload</h5>
                          <p className="text-sm text-blue-700 mt-1">
                            O webhook receberá um JSON com: event_type, automation_name, timestamp, os campos do lead selecionados e campos personalizados (se selecionados).
                          </p>
                          <pre className="text-xs text-blue-600 mt-2 bg-blue-100 p-2 rounded overflow-x-auto">
{`{
  "event_type": "lead_stage_changed",
  "automation_name": "Nome da automação",
  "timestamp": "2026-01-19T12:00:00Z",
  "lead": { /* campos selecionados */ },
  "custom_fields": { /* campos personalizados (se selecionados) */ }
}`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(form.action as any).type === 'send_whatsapp' && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-sm text-gray-700 mb-1">Instância WhatsApp *</label>
                    <select
                      className="border rounded px-3 py-2 w-full"
                      value={(form.action as any).instance_id || ''}
                      onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, instance_id: e.target.value } }))}
                    >
                      <option value="">Selecione uma instância</option>
                      {whatsappInstances.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.display_name || inst.name} {inst.phone_number ? `(${inst.phone_number})` : ''} — {inst.status === 'open' ? 'Conectada' : inst.status || 'Desconhecido'}
                        </option>
                      ))}
                    </select>
                    {whatsappInstances.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">Nenhuma instância WhatsApp encontrada. Conecte uma instância na seção de Chat.</p>
                    )}
                  </div>

                  {/* Tipo de mensagem */}
                  <div className="md:col-span-3">
                    <label className="block text-sm text-gray-700 mb-2">Tipo de mensagem</label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { type: 'text', label: 'Texto', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                        { type: 'image', label: 'Imagem', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                        { type: 'video', label: 'Vídeo', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
                        { type: 'audio', label: 'Áudio', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
                      ] as { type: WhatsAppMessageType; label: string; icon: string }[]).map(item => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleWaMessageTypeChange(item.type)}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                            ((form.action as any).wa_message_type || 'text') === item.type
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                          <span className="text-xs font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload de mídia */}
                  {((form.action as any).wa_message_type || 'text') !== 'text' && (
                    <div className="md:col-span-3">
                      <label className="block text-sm text-gray-700 mb-1">Arquivo de mídia *</label>
                      <input
                        type="file"
                        onChange={handleWaFileUpload}
                        disabled={waUploading}
                        accept={
                          (form.action as any).wa_message_type === 'image' ? 'image/*' :
                          (form.action as any).wa_message_type === 'video' ? 'video/*' :
                          'audio/*'
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {waUploading && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                          <span>Fazendo upload...</span>
                        </div>
                      )}
                      {waUploadError && (
                        <p className="mt-2 text-sm text-red-600">{waUploadError}</p>
                      )}
                      {(form.action as any).media_url && !waUploading && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                          <span className="truncate">Arquivo: {(form.action as any).media_filename || 'Enviado'}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Máximo: 50MB</p>
                      {(form.action as any).wa_message_type === 'image' && waMediaPreview && !waUploading && (
                        <div className="mt-2">
                          <img src={waMediaPreview} alt="Preview" className="max-w-[200px] rounded-lg border border-gray-200" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <label className="block text-sm text-gray-700 mb-1">
                      {((form.action as any).wa_message_type || 'text') === 'text' ? 'Mensagem *' : 'Legenda (opcional)'}
                    </label>
                    <textarea
                      className="border rounded px-3 py-2 w-full min-h-[100px] resize-y"
                      placeholder="Digite a mensagem. Use variáveis como {primeiro_nome}, {nome_lead}, {empresa_lead}, etc."
                      value={(form.action as any).message_template || ''}
                      onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, message_template: e.target.value } }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Clique nas variáveis abaixo para inserir no texto:</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { var: '{nome_lead}', label: 'Nome' },
                        { var: '{primeiro_nome}', label: 'Primeiro Nome' },
                        { var: '{empresa_lead}', label: 'Empresa' },
                        { var: '{telefone}', label: 'Telefone' },
                        { var: '{email}', label: 'Email' },
                        { var: '{valor}', label: 'Valor' },
                        { var: '{origem}', label: 'Origem' },
                        { var: '{notas}', label: 'Notas' },
                      ].map(v => (
                        <button
                          key={v.var}
                          type="button"
                          onClick={() => {
                            const current = (form.action as any).message_template || ''
                            setForm(prev => ({ ...prev, action: { ...prev.action, message_template: current + v.var } }))
                          }}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors font-mono"
                        >
                          {v.var} <span className="text-green-500 font-sans">({v.label})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-green-800">Envio automático de WhatsApp</h5>
                          <p className="text-sm text-green-700 mt-1">
                            A mensagem será enviada para o telefone do lead via WhatsApp. Se o lead não tiver telefone cadastrado, a ação será ignorada silenciosamente.
                          </p>
                          <p className="text-xs text-green-600 mt-2">
                            Uma conversa será criada automaticamente se ainda não existir para este lead.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {(() => {
            const action: any = form.action || {}
            const allActions = getEffectiveActions(action)
            const needsTitle = action?.type === 'create_task'
            const titleOk = !needsTitle || ((action.title || '').trim().length > 0)
            const needsResponsible = action?.type === 'assign_responsible'
            const responsibleOk = !needsResponsible || ((action.responsible_uuid || '').trim().length > 0)
            const isFixedMode = action?.due_date_mode === 'fixed'
            const dueDaysInvalid = isFixedMode && (() => {
              if (typeof action?.due_in_days !== 'number' || action.due_in_days < 0 || isNaN(action.due_in_days)) {
                return true
              }
              // Verificar se as horas calculadas são válidas (máximo 23 horas)
              // Detectar casas decimais: 1 casa (0.1) = *10, 2 casas (0.12) = *100
              if (action.due_in_days < 1 && action.due_in_days > 0) {
                const decimalPart = action.due_in_days % 1
                const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                const hours = isSingleDecimal
                  ? Math.round(action.due_in_days * 10)  // 1 casa: 0.1 = 1h
                  : Math.round(action.due_in_days * 100) // 2 casas: 0.12 = 12h
                return hours > 23
              }
              if (action.due_in_days >= 1) {
                const decimalPart = action.due_in_days % 1
                if (decimalPart > 0) {
                  const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                  const hours = isSingleDecimal
                    ? Math.round(decimalPart * 10)  // 1 casa: 0.1 = 1h
                    : Math.round(decimalPart * 100) // 2 casas: 0.12 = 12h
                  return hours > 23
                }
              }
              return false
            })()
            const intervalInvalid = isFixedMode && action?.task_count > 1 && (() => {
              if (typeof action?.task_interval_days !== 'number' || action.task_interval_days < 0) {
                return true
              }
              // Em recorrência mensal não há limite de horas; só exige inteiro >= 1
              if (action?.task_interval_unit === 'months') {
                return !(action.task_interval_days >= 1 && action.task_interval_days % 1 === 0)
              }
              // Verificar se as horas calculadas são válidas (máximo 23 horas)
              // Detectar casas decimais: 1 casa (0.1) = *10, 2 casas (0.12) = *100
              if (action.task_interval_days < 1 && action.task_interval_days > 0) {
                const decimalPart = action.task_interval_days % 1
                const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                const hours = isSingleDecimal
                  ? Math.round(action.task_interval_days * 10)  // 1 casa: 0.1 = 1h
                  : Math.round(action.task_interval_days * 100) // 2 casas: 0.12 = 12h
                return hours > 23
              }
              if (action.task_interval_days >= 1) {
                const decimalPart = action.task_interval_days % 1
                if (decimalPart > 0) {
                  const isSingleDecimal = Math.abs(decimalPart * 10 - Math.round(decimalPart * 10)) < 0.001
                  const hours = isSingleDecimal
                    ? Math.round(decimalPart * 10)  // 1 casa: 0.1 = 1h
                    : Math.round(decimalPart * 100) // 2 casas: 0.12 = 12h
                  return hours > 23
                }
              }
              return false
            })()
            const needsDueDays = dueDaysInvalid
            const needsInterval = intervalInvalid
            // Validação do webhook
            const isWebhook = action?.type === 'call_webhook'
            const webhookUrlValid = !isWebhook || (action.webhook_url && action.webhook_url.trim().match(/^https?:\/\/.+/))
            const webhookFieldsValid = !isWebhook || (action.webhook_fields && action.webhook_fields.length > 0)
            // Validação do WhatsApp
            const isWhatsapp = action?.type === 'send_whatsapp'
            const waMessageType = action?.wa_message_type || 'text'
            const whatsappInstanceValid = !isWhatsapp || !!(action.instance_id && action.instance_id.trim())
            const whatsappTemplateValid = !isWhatsapp || waMessageType !== 'text' || !!(action.message_template && action.message_template.trim())
            const whatsappMediaValid = !isWhatsapp || waMessageType === 'text' || !!(action.media_url && action.media_url.trim())
            const hasInvalidActionInQueue = allActions.some((actionItem) => {
              if (actionItem?.type === 'create_task' && !(actionItem.title || '').trim()) return true
              if (actionItem?.type === 'assign_responsible' && !(actionItem.responsible_uuid || '').trim()) return true
              if (actionItem?.type === 'call_webhook') {
                const urlOk = !!(actionItem.webhook_url && String(actionItem.webhook_url).trim().match(/^https?:\/\/.+/))
                const fieldsOk = Array.isArray(actionItem.webhook_fields) && actionItem.webhook_fields.length > 0
                return !urlOk || !fieldsOk
              }
              if (actionItem?.type === 'send_whatsapp') {
                const waType = actionItem.wa_message_type || 'text'
                if (!(actionItem.instance_id && String(actionItem.instance_id).trim())) return true
                if (waType === 'text' && !(actionItem.message_template && String(actionItem.message_template).trim())) return true
                if (waType !== 'text' && !(actionItem.media_url && String(actionItem.media_url).trim())) return true
                return false
              }
              return false
            })
            const disabled = creating || !form.name.trim() || !titleOk || !responsibleOk || needsDueDays || needsInterval || !webhookUrlValid || !webhookFieldsValid || !whatsappInstanceValid || !whatsappTemplateValid || !whatsappMediaValid || hasInvalidActionInQueue
            return (
              <div className="md:col-span-3 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={disabled} 
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (editingId ? 'Salvando...' : 'Criando...') : (editingId ? 'Salvar alterações' : 'Criar automação')}
                </button>
              </div>
            )
          })()}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleCancelDelete}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Excluir automação
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Tem certeza que deseja excluir a automação "{deleteConfirmItem.name}"? Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600">Carregando...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const condText = formatConditions(item)
            const actionText = formatAction(item)
            return (
              <div key={item.id} className="border rounded p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">Gatilho: {formatEventType(item.event_type)}{condText ? ` • Quando: ${condText}` : ` • Quando: ${getDefaultConditionText(item.event_type)}`}</div>
                  <div className="text-sm text-gray-700 mt-1">Ação: {actionText}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => handleEdit(item)} 
                    className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800 hover:bg-blue-200"
                    disabled={editingId === item.id}
                    title="Editar automação"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDuplicate(item)} 
                    className="px-3 py-1 rounded text-sm bg-purple-100 text-purple-800 hover:bg-purple-200 inline-flex items-center gap-1"
                    disabled={duplicating === item.id}
                    title="Duplicar automação"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    {duplicating === item.id ? 'Duplicando...' : 'Duplicar'}
                  </button>
                  <button 
                    onClick={() => toggleActive(item)} 
                    className={`px-3 py-1 rounded text-sm ${item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                    title={item.active ? 'Desativar automação' : 'Ativar automação'}
                  >
                    {item.active ? 'Ativa' : 'Inativa'}
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(item)} 
                    className="px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200"
                    title="Excluir automação"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


