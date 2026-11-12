import { StyledSelect } from '../../../ui/StyledSelect'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function CustomFieldDateConditions() {
  const { form, setForm, pipelines, dateCustomFields } = useAutomationEditor()
  return (
    <>
      {/* Condições para gatilho de data atingida em campo personalizado */}
      {form.event_type === 'custom_field_date_reached' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Configuração do gatilho de data</h4>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-3">
            <p className="text-sm text-emerald-700">
              Esta automação é executada server-side a cada 10 minutos. Compara o mês/dia dos valores preenchidos com a data atual (recorrência anual), respeitando o horário e o offset configurados. Cada lead dispara no máximo uma vez por dia por campo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-4">
              <label className="block text-sm text-gray-700 mb-1">Campos personalizados (data)</label>
              <p className="text-xs text-gray-500 mb-2">
                Selecione um ou mais campos do tipo data. A automação dispara quando o valor preenchido em qualquer um deles bate com a data alvo.
              </p>
              <div className="flex flex-wrap gap-2">
                {dateCustomFields.length > 0 ? dateCustomFields.map(field => {
                  const currentIds: string[] = ((form.condition as any).field_ids as string[]) || []
                  const isSelected = currentIds.includes(field.id)
                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? currentIds.filter(id => id !== field.id)
                          : [...currentIds, field.id]
                        setForm(prev => ({
                          ...prev,
                          condition: {
                            ...prev.condition,
                            field_ids: next.length > 0 ? next : []
                          }
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {field.name}
                    </button>
                  )
                }) : (
                  <p className="text-xs text-gray-400">
                    Nenhum campo personalizado do tipo data encontrado. Crie um campo do tipo "data" em Configurações &gt; Campos personalizados.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Quando disparar</label>
              <StyledSelect
                options={[
                  { value: 'before', label: 'Antes da data' },
                  { value: 'on', label: 'No dia' },
                  { value: 'after', label: 'Depois da data' },
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
              <div>
                <label className="block text-sm text-gray-700 mb-1">Dias de offset</label>
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
            )}

            <div>
              <label className="block text-sm text-gray-700 mb-1">Horário de disparo</label>
              <input
                type="time"
                className="border rounded px-3 py-2 w-full"
                value={(form.condition as any).fire_time || '09:00'}
                onChange={e => setForm(prev => ({
                  ...prev,
                  condition: { ...prev.condition, fire_time: e.target.value || '09:00' }
                }))}
              />
            </div>

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
              <label className="block text-sm text-gray-700 mb-1">Pipeline(s)</label>
              <p className="text-xs text-gray-500 mb-2">Restrinja a leads de pipelines específicos. Deixe vazio para todos.</p>
              <div className="flex flex-wrap gap-2">
                {pipelines.map(pipeline => {
                  const currentIds: string[] = ((form.condition as any).pipeline_ids as string[]) || []
                  const isSelected = currentIds.includes(pipeline.id)
                  return (
                    <button
                      key={pipeline.id}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? currentIds.filter(id => id !== pipeline.id)
                          : [...currentIds, pipeline.id]
                        setForm(prev => ({
                          ...prev,
                          condition: {
                            ...prev.condition,
                            pipeline_ids: next.length > 0 ? next : undefined
                          }
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pipeline.name}
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
