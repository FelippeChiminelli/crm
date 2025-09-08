import { useEffect, useState } from 'react'
import type { AutomationRule, CreateAutomationRuleData, Pipeline, Stage } from '../../types'
import { listAutomations, createAutomation, updateAutomation, deleteAutomation } from '../../services/automationService'
import { getPipelines } from '../../services/pipelineService'
import { getStagesByPipeline } from '../../services/stageService'

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
  const current = pipelines.find(p => p.id === value)
  return (
    <div className="relative" tabIndex={0} onBlur={(e) => { if (!(e.currentTarget as any).contains(e.relatedTarget)) setOpen(false) }}>
      <div
        className="border rounded px-3 py-2 w-full cursor-pointer flex items-center justify-between bg-white"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm text-gray-900 truncate">
          {current ? current.name : (placeholder || 'Selecione')}
        </span>
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto bg-white border rounded shadow-lg p-2">
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
  const current = stages.find(s => s.id === value)
  return (
    <div className="relative" tabIndex={0} onBlur={(e) => { if (!(e.currentTarget as any).contains(e.relatedTarget)) setOpen(false) }}>
      <div
        className="border rounded px-3 py-2 w-full cursor-pointer flex items-center justify-between bg-white"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm text-gray-900 truncate">
          {current ? current.name : (placeholder || (allowEmpty ? 'Qualquer' : 'Selecione'))}
        </span>
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto bg-white border rounded shadow-lg p-2">
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

  useEffect(() => { load(); loadPipelines() }, [])

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
      return 'Criar tarefa (detalhes na configuração)'
    }
    if (type === 'send_message') {
      return 'Enviar mensagem (template/configuração aplicada)'
    }
    if (type === 'send_notification') {
      return 'Enviar notificação interna'
    }
    return 'Ação personalizada'
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      setCreating(true)
      const { error } = await createAutomation(form)
      if (error) throw error
      setForm({
        name: '', description: '', event_type: 'lead_stage_changed', active: true,
        condition: {}, action: { type: 'move_lead', target_pipeline_id: '', target_stage_id: '' }
      })
      await load()
    } catch (e: any) {
      setError('Erro ao criar automação')
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
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Criar regra de automação</h3>
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nome da automação"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <select
            className="border rounded px-3 py-2"
            value={form.event_type}
            onChange={e => setForm(prev => ({ ...prev, event_type: e.target.value as any }))}
          >
            <option value="lead_stage_changed">Quando lead mudar de etapa</option>
          </select>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>

          <button disabled={creating || !form.name.trim()} className="bg-primary-600 hover:bg-primary-500 text-white rounded px-4 py-2 md:col-span-3 disabled:opacity-50">
            {creating ? 'Criando...' : 'Criar automação'}
          </button>
        </form>
      </div>

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
                  <button onClick={() => toggleActive(item)} className={`px-3 py-1 rounded text-sm ${item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                    {item.active ? 'Ativa' : 'Inativa'}
                  </button>
                  <button onClick={() => remove(item)} className="px-3 py-1 rounded text-sm bg-red-100 text-red-800">Excluir</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


