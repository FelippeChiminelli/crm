import { useEffect, useState } from 'react'
import type { AutomationRule, CreateAutomationRuleData, Pipeline, Stage, TaskType } from '../../types'
import { getAllProfiles } from '../../services/profileService'
import { StyledSelect } from '../ui/StyledSelect'
import { listAutomations, createAutomation, updateAutomation, deleteAutomation } from '../../services/automationService'
import { getPipelines } from '../../services/pipelineService'
import { getStagesByPipeline } from '../../services/stageService'
import { getTaskTypes } from '../../services/taskService'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
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

  useEffect(() => { load(); loadPipelines(); loadProfiles(); loadTaskTypes() }, [])

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

  async function remove(item: AutomationRule) {
    const { error } = await deleteAutomation(item.id)
    if (!error) load()
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
            options={[{ value: 'lead_stage_changed', label: 'Quando lead mudar de etapa' }]}
            value={form.event_type}
            onChange={(val) => setForm(prev => ({ ...prev, event_type: val as any }))}
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

          <div className="md:col-span-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Ação</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm text-gray-700 mb-1">Tipo de ação</label>
                <StyledSelect
                  options={[
                    { value: 'move_lead', label: 'Mover lead para pipeline/etapa' },
                    { value: 'create_task', label: 'Criar tarefa' }
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
            </div>
          </div>

          {(() => {
            const action: any = form.action || {}
            const needsTitle = action?.type === 'create_task'
            const titleOk = !needsTitle || ((action.title || '').trim().length > 0)
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
            const disabled = creating || !form.name.trim() || !titleOk || needsDueDays || needsInterval
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
                  <div className="text-xs text-gray-500 mt-1">Evento: {item.event_type}{condText ? ` • Quando: ${condText}` : ' • Quando: Qualquer mudança de etapa'}</div>
                  <div className="text-sm text-gray-700 mt-1">Ação: {actionText}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button 
                    onClick={() => handleEdit(item)} 
                    className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800 hover:bg-blue-200"
                    disabled={editingId === item.id}
                  >
                    Editar
                  </button>
                  <button onClick={() => toggleActive(item)} className={`px-3 py-1 rounded text-sm ${item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                    {item.active ? 'Ativa' : 'Inativa'}
                  </button>
                  <button onClick={() => remove(item)} className="px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200">Excluir</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


