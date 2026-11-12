import { TASK_PRIORITY_OPTIONS } from '../constants'
import { formatTaskTypeName } from '../../../../utils/taskTypeDisplay'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function TaskCreatedConditions() {
  const { form, setForm, profiles, taskTypes } = useAutomationEditor()
  return (
    <>
      {/* Condições para evento de tarefa criada */}
      {form.event_type === 'task_created' && (
        <div className="md:col-span-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Condição (opcional)</h4>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
            <p className="text-sm text-blue-700">
              Esta automação é executada no servidor sempre que uma nova tarefa for criada — inclusive por sistemas externos ou outras automações, mesmo com o CRM fechado.
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
    </>
  )
}
