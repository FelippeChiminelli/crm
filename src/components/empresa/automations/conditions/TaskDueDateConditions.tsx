import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '../constants'
import { StyledSelect } from '../../../ui/StyledSelect'
import { formatTaskTypeName } from '../../../../utils/taskTypeDisplay'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function TaskDueDateConditions() {
  const { form, setForm, profiles, taskTypes } = useAutomationEditor()
  return (
    <>
      {/* Condições para evento de data da tarefa atingida */}
      {form.event_type === 'task_due_date_reached' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Configuração do gatilho de data da tarefa</h4>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-3">
            <p className="text-sm text-emerald-700">
              Esta automação é executada server-side periodicamente. Dispara quando a data de vencimento da tarefa (data + hora, no fuso configurado) é atingida, respeitando o offset configurado. Cada tarefa dispara no máximo uma vez por regra. Ações que dependem de lead serão ignoradas quando a tarefa não tiver lead vinculado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Quando disparar</label>
              <StyledSelect
                options={[
                  { value: 'before', label: 'Antes do vencimento' },
                  { value: 'on', label: 'No vencimento' },
                  { value: 'after', label: 'Depois do vencimento' },
                ]}
                value={(form.condition as any).offset_direction || 'on'}
                onChange={val => setForm(prev => ({
                  ...prev,
                  condition: {
                    ...prev.condition,
                    offset_direction: val,
                    offset_value: val === 'on' ? 0 : ((prev.condition as any).offset_value || 1)
                  }
                }))}
              />
            </div>

            {((form.condition as any).offset_direction || 'on') !== 'on' && (
              <>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Valor do offset</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="border rounded px-3 py-2 w-full"
                    value={(form.condition as any).offset_value ?? 1}
                    onChange={e => {
                      const raw = Number(e.target.value) || 1
                      setForm(prev => ({
                        ...prev,
                        condition: { ...prev.condition, offset_value: Math.max(1, raw) }
                      }))
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Unidade</label>
                  <StyledSelect
                    options={[
                      { value: 'days', label: 'Dias' },
                      { value: 'hours', label: 'Horas' },
                    ]}
                    value={(form.condition as any).offset_unit || 'days'}
                    onChange={val => setForm(prev => ({
                      ...prev,
                      condition: { ...prev.condition, offset_unit: val }
                    }))}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-gray-700 mb-1">Fuso horário</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                placeholder="America/Sao_Paulo"
                value={(form.condition as any).timezone || 'America/Sao_Paulo'}
                onChange={e => setForm(prev => ({
                  ...prev,
                  condition: { ...prev.condition, timezone: e.target.value || 'America/Sao_Paulo' }
                }))}
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm text-gray-700 mb-1.5">Status da tarefa</label>
              <p className="text-xs text-gray-500 mb-2">A automação só dispara para tarefas nesses status. Deixe vazio para qualquer status.</p>
              <div className="flex flex-wrap gap-2">
                {TASK_STATUS_OPTIONS.map(opt => {
                  const currentIds: string[] = ((form.condition as any).statuses as string[]) || []
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
                            statuses: next.length > 0 ? next : undefined
                          }
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="md:col-span-2">
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
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-500'
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

            <div className="md:col-span-2">
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
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="md:col-span-2">
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
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {profile.full_name || profile.email}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="md:col-span-2">
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
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-500'
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
    </>
  )
}
