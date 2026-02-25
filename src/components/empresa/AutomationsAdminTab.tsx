import { useEffect, useState } from 'react'
import type { AutomationRule, CreateAutomationRuleData, Pipeline, Stage, TaskType, LeadCustomField, LossReason } from '../../types'
import { getAllProfiles } from '../../services/profileService'
import { StyledSelect } from '../ui/StyledSelect'
import { listAutomations, createAutomation, updateAutomation, deleteAutomation } from '../../services/automationService'
import { getPipelines } from '../../services/pipelineService'
import { getStagesByPipeline } from '../../services/stageService'
import { getTaskTypes } from '../../services/taskService'
import { getCustomFieldsByPipeline } from '../../services/leadCustomFieldService'
import { getLossReasons } from '../../services/lossReasonService'
import { XMarkIcon, PlusIcon, DocumentDuplicateIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../hooks/useEscapeKey'

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
    action: { type: 'move_lead', target_pipeline_id: '', target_stage_id: '' }
  })

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [fromStages, setFromStages] = useState<Stage[]>([])
  const [toStages, setToStages] = useState<Stage[]>([])
  const [targetStages, setTargetStages] = useState<Stage[]>([])
  const [stageIndex, setStageIndex] = useState<Record<string, Stage>>({})
  const [profiles, setProfiles] = useState<{ uuid: string; full_name: string; email: string }[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])

  useEffect(() => { load(); loadPipelines(); loadProfiles(); loadTaskTypes(); loadCustomFields(); loadLossReasons() }, [])

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

  async function loadStagesFor(pipelineIdOrIds: string | string[], kind: 'from' | 'to' | 'target') {
    const ids = Array.isArray(pipelineIdOrIds)
      ? pipelineIdOrIds.filter(Boolean)
      : (pipelineIdOrIds ? [pipelineIdOrIds] : [])

    if (!ids.length) {
      if (kind === 'from') setFromStages([])
      if (kind === 'to') setToStages([])
      if (kind === 'target') setTargetStages([])
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
    } catch {}
  }

  function formatConditions(rule: AutomationRule): string | null {
    const cond: any = rule.condition || {}
    const eventType = rule.event_type

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

      return parts.length > 0 ? parts.join(' • ') : null
    }

    // Para eventos de vendido/perdido, mostrar pipeline e motivos de perda se houver
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
      return parts.length > 0 ? parts.join(' • ') : null
    }

    // Para mudança de etapa, usar formato original
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
      default:
        return 'Sem condição específica'
    }
  }

  function getPipelineName(id?: string) {
    if (!id) return undefined
    return pipelines.find(p => p.id === id)?.name || id
  }

  function formatAction(rule: AutomationRule): string {
    const action: any = rule.action || {}
    const type = action.type as string
    if (type === 'move_lead') {
      const pName = getPipelineName(action.target_pipeline_id)
      const sName = stageIndex[action.target_stage_id]?.name || action.target_stage_id || ''
      const path = [pName, sName].filter(Boolean).join(' > ')
      return path ? `Mover lead para ${path}` : 'Mover lead'
    }
    if (type === 'create_task') {
      const title = action.title ? `: "${action.title}"` : ''
      const count = action.task_count > 1 ? ` (${action.task_count} tarefas)` : ''
      const mode = action.due_date_mode === 'fixed' ? ' [Data fixa]' : ' [Data manual]'
      return `Criar tarefa${title}${count}${mode}`
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
      condition: {}, action: { type: 'move_lead', target_pipeline_id: '', target_stage_id: '' }
    })
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
    const action: any = item.action || {}
    setForm({
      name: item.name || '',
      description: item.description || '',
      event_type: item.event_type || 'lead_stage_changed',
      active: item.active ?? true,
      condition: item.condition || {},
      action: action
    })

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
      const action: any = form.action || {}
      if (action?.type === 'create_task') {
        const title = (action.title || '').trim()
        if (!title) {
          setError('Informe um título para a tarefa automática')
          setCreating(false)
          return
        }
      }
      
      if (editingId) {
        // Atualizar automação existente
        const { error } = await updateAutomation(editingId, form)
        if (error) throw error
      } else {
        // Criar nova automação
        const { error } = await createAutomation(form)
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
      const duplicatedData: CreateAutomationRuleData = {
        name: `${item.name} (cópia)`,
        description: item.description || '',
        event_type: item.event_type,
        active: false, // Cópia começa desativada para evitar execuções acidentais
        condition: item.condition || {},
        action: item.action || {}
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
                
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nome da automação"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <StyledSelect
            options={[
              { value: 'lead_stage_changed', label: 'Quando lead mudar de etapa' },
              { value: 'lead_marked_sold', label: 'Lead marcado como vendido' },
              { value: 'lead_marked_lost', label: 'Lead marcado como perdido' },
              { value: 'lead_responsible_assigned', label: 'Quando responsável for atribuído' }
            ]}
            value={form.event_type}
            onChange={(val) => {
              // Resetar condições quando mudar o tipo de evento
              if (val === 'lead_marked_sold' || val === 'lead_marked_lost') {
                // Eventos de vendido/perdido não usam condições de etapa
                setForm(prev => ({ 
                  ...prev, 
                  event_type: val as any,
                  condition: {} // Limpar condições de from/to stage
                }))
              } else if (val === 'lead_responsible_assigned') {
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
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Ativa</label>
            <input type="checkbox" checked={!!form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} />
          </div>

          <input
            className="border rounded px-3 py-2 md:col-span-3"
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

          <div className="md:col-span-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Ação</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm text-gray-700 mb-1">Tipo de ação</label>
                <StyledSelect
                  options={[
                    { value: 'move_lead', label: 'Mover lead para pipeline/etapa' },
                    { value: 'create_task', label: 'Criar tarefa' },
                    { value: 'assign_responsible', label: 'Atribuir responsável' },
                    { value: 'mark_as_sold', label: 'Marcar lead como vendido' },
                    { value: 'mark_as_lost', label: 'Marcar lead como perdido' },
                    { value: 'call_webhook', label: 'Acionar webhook' }
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
                        task_count: 1,
                        due_date_mode: 'manual',
                        due_in_days: undefined,
                        due_time: undefined,
                        task_interval_days: 0
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
                          {type.name}
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
                    
                    {((form.action as any).task_count > 1) && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600 mb-1">Intervalo entre tarefas</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          className="border rounded px-3 py-2 w-full"
                          placeholder="Ex.: 0.1 (1h), 1 (1 dia)..."
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
                            const interval = parseFloat(value)
                            if (!isNaN(interval) && interval >= 0) {
                              // Verificar se as horas calculadas são válidas (máximo 23 horas)
                              // Detectar casas decimais: 1 casa (0.1) = *10, 2 casas (0.12) = *100
                              let isValid = true
                              if (interval < 1 && interval > 0) {
                                const decimalStr = value.split('.')[1] || ''
                                const hours = decimalStr.length === 1
                                  ? Math.round(interval * 10)  // 1 casa: 0.1 = 1h
                                  : Math.round(interval * 100) // 2 casas: 0.12 = 12h
                                if (hours > 23) {
                                  isValid = false
                                }
                              } else if (interval >= 1) {
                                const decimalPart = interval % 1
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
                                  task_interval_days: interval
                                } 
                              }))
                            }
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">0 = mesmo dia, 0.1 = 1h, 0.23 = 23h, 1 = 1 dia, etc.</p>
                      </div>
                    )}
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
                          onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, due_date_mode: 'fixed' } }))}
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
                                    due_time: (numValue < 1 || (numValue >= 1 && numValue % 1 > 0)) ? undefined : prev.action.due_time
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="inline-flex items-center gap-2 border rounded px-3 py-2">
                        <input
                          type="radio"
                          name="auto-assign"
                          checked={!((form.action as any).assigned_to)}
                          onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, assigned_to: '' } }))}
                        />
                        <span className="text-sm text-gray-800">Automático (quem moveu)</span>
                      </label>
                      <div className="sm:col-span-2 flex gap-2">
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
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Se um usuário for especificado, ele será sempre o responsável. Se vazio, o responsável será quem moveu o card.</p>
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
            </div>
          </div>

          {(() => {
            const action: any = form.action || {}
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
            const disabled = creating || !form.name.trim() || !titleOk || !responsibleOk || needsDueDays || needsInterval || !webhookUrlValid || !webhookFieldsValid
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


