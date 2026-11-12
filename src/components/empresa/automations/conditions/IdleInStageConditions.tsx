import { StyledSelect } from '../../../ui/StyledSelect'
import { PipelineStageCondition } from './PipelineStageCondition'
import { ScheduleWindowCondition } from './ScheduleWindowCondition'
import { RunLimitCondition } from './RunLimitCondition'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function IdleInStageConditions() {
  const { form, setForm, pipelines, idleStages } = useAutomationEditor()
  return (
    <>
      {/* Condições para gatilho de tempo (lead parado no estágio) */}
      {form.event_type === 'lead_idle_in_stage' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Configuração de tempo</h4>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
            <p className="text-sm text-amber-700">
              Esta automação é executada server-side a cada 10 minutos. Funciona mesmo com o CRM fechado. Dispara quando um lead permanece no mesmo estágio pelo tempo configurado.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PipelineStageCondition
              accent="amber"
              pipelines={pipelines}
              stages={idleStages}
              selectedPipelineIds={((form.condition as any).pipeline_ids as string[]) || []}
              selectedStageIds={((form.condition as any).stage_ids as string[]) || []}
              onChangePipelines={(next) => {
                setForm(prev => ({
                  ...prev,
                  condition: {
                    ...prev.condition,
                    pipeline_ids: next.length > 0 ? next : undefined,
                    stage_ids: undefined,
                  }
                }))
              }}
              onChangeStages={(next) => {
                setForm(prev => ({
                  ...prev,
                  condition: {
                    ...prev.condition,
                    stage_ids: next.length > 0 ? next : undefined,
                  }
                }))
              }}
            />

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

            <ScheduleWindowCondition
              value={(form.condition as any).schedule_window}
              onChange={(schedule) => setForm(prev => ({
                ...prev,
                condition: { ...prev.condition, schedule_window: schedule }
              }))}
            />

            <RunLimitCondition
              value={(form.condition as any).max_per_run}
              onChange={(limit) => setForm(prev => ({
                ...prev,
                condition: { ...prev.condition, max_per_run: limit }
              }))}
            />
          </div>
        </div>
      )}
    </>
  )
}
