import { PipelineSingleSelect } from '../ui/PipelineSingleSelect'
import type { Pipeline } from '../../../../types'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function SoldLostConditions() {
  const { form, setForm, pipelines, lossReasons } = useAutomationEditor()
  return (
    <>
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
    </>
  )
}
