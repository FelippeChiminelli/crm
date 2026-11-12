import { BOOKING_STATUS_OPTIONS } from '../constants'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function BookingCreatedConditions() {
  const { form, setForm, profiles, bookingCalendars, bookingTypes } = useAutomationEditor()
  return (
    <>
      {/* Condições para evento de agendamento criado */}
      {form.event_type === 'booking_created' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
            <p className="text-sm text-blue-700">
              Dispara quando um agendamento é criado — no CRM, link público ou integrações externas. Ações que dependem de lead exigem lead vinculado ou a ação &quot;Criar lead&quot; antes na fila.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1.5">Agenda(s)</label>
              <div className="flex flex-wrap gap-2">
                {bookingCalendars.map(calendar => {
                  const currentIds: string[] = ((form.condition as any).calendar_ids as string[]) || []
                  const isSelected = currentIds.includes(calendar.id)
                  return (
                    <button
                      key={calendar.id}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? currentIds.filter(id => id !== calendar.id)
                          : [...currentIds, calendar.id]
                        setForm(prev => ({
                          ...prev,
                          condition: {
                            ...prev.condition,
                            calendar_ids: next.length > 0 ? next : undefined
                          }
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-700 ring-2 ring-offset-1 ring-indigo-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {calendar.name}
                    </button>
                  )
                })}
                {bookingCalendars.length === 0 && (
                  <span className="text-xs text-gray-400">Nenhuma agenda cadastrada</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Tipo de atendimento</label>
              <div className="flex flex-wrap gap-2">
                {bookingTypes.map(type => {
                  const currentIds: string[] = ((form.condition as any).booking_type_ids as string[]) || []
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
                            booking_type_ids: next.length > 0 ? next : undefined
                          }
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-700 ring-2 ring-offset-1 ring-indigo-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type.name}
                    </button>
                  )
                })}
                {bookingTypes.length === 0 && (
                  <span className="text-xs text-gray-400">Nenhum tipo cadastrado</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Status do agendamento</label>
              <div className="flex flex-wrap gap-2">
                {BOOKING_STATUS_OPTIONS.map(opt => {
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
                          ? 'bg-indigo-100 text-indigo-700 ring-2 ring-offset-1 ring-indigo-500'
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
              <label className="block text-sm text-gray-700 mb-1.5">Responsável do agendamento</label>
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
                          ? 'bg-indigo-100 text-indigo-700 ring-2 ring-offset-1 ring-indigo-500'
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
