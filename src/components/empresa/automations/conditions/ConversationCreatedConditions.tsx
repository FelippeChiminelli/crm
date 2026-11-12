import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function ConversationCreatedConditions() {
  const { form, setForm, profiles, whatsappInstances } = useAutomationEditor()
  return (
    <>
      {/* Condições para evento de nova conversa criada */}
      {form.event_type === 'conversation_created' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
            <p className="text-sm text-blue-700">
              Esta automação é executada no servidor sempre que uma nova conversa for criada — inclusive por sistemas externos, mesmo com o CRM fechado.
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
    </>
  )
}
