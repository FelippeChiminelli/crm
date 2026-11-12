import { formatTaskTypeName } from '../../../../utils/taskTypeDisplay'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function CreateTaskActionForm() {
  const { form, setForm, profiles, taskTypes } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'create_task' && (
        <>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Título da tarefa</label>
            {(() => {
              const action = form.action as any
              const dueDateMode = (action.due_date_mode || 'manual') as 'manual' | 'fixed'
              const rawTitleMode = action.title_mode as 'fixed' | 'manual' | undefined
              const showManualOption = dueDateMode === 'manual'
              const currentTitleMode: 'fixed' | 'manual' =
                rawTitleMode === 'manual' && !showManualOption ? 'fixed' : (rawTitleMode || 'fixed')
              return (
                <>
                  <div className={`grid grid-cols-1 ${showManualOption ? 'sm:grid-cols-2' : ''} gap-2 mb-2`}>
                    <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name="title-mode"
                        checked={currentTitleMode === 'fixed'}
                        onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, title_mode: 'fixed' } }))}
                      />
                      <span className="text-sm text-gray-800">Título fixo</span>
                    </label>
                    {showManualOption && (
                      <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                        <input
                          type="radio"
                          name="title-mode"
                          checked={currentTitleMode === 'manual'}
                          onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, title_mode: 'manual' } }))}
                        />
                        <span className="text-sm text-gray-800">Definir no modal</span>
                      </label>
                    )}
                  </div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder={currentTitleMode === 'manual' ? 'Sugestão opcional (pré-preenche o modal)' : 'Ex.: Fazer follow-up'}
                    value={action.title || ''}
                    onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, title: e.target.value } }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {currentTitleMode === 'fixed'
                      ? 'O título será usado em todas as tarefas criadas por esta automação.'
                      : 'O título será solicitado no modal. O campo acima serve como sugestão opcional.'}
                  </p>
                </>
              )
            })()}
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
                  {formatTaskTypeName(type.name)}
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

            {((form.action as any).task_count > 1) && (() => {
              const intervalUnit: 'days' | 'months' =
                (form.action as any).task_interval_unit === 'months' ? 'months' : 'days'
              return (
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Intervalo entre tarefas ({intervalUnit === 'months' ? 'meses' : 'dias'})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step={intervalUnit === 'months' ? '1' : '0.1'}
                      className="border rounded px-3 py-2 flex-1"
                      placeholder={intervalUnit === 'months' ? 'Ex.: 1 (todo mês)' : 'Ex.: 0.1 (1h), 1 (1 dia)...'}
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

                        if (intervalUnit === 'months') {
                          // Em meses só aceita inteiros
                          const interval = parseInt(value, 10)
                          if (!Number.isFinite(interval) || interval < 0) return
                          setForm(prev => ({
                            ...prev,
                            action: {
                              ...prev.action,
                              task_interval_days: interval
                            }
                          }))
                          return
                        }

                        const interval = parseFloat(value)
                        if (!isNaN(interval) && interval >= 0) {
                          // Verificar se as horas calculadas são válidas (máximo 23 horas)
                          let isValid = true
                          if (interval < 1 && interval > 0) {
                            const decimalStr = value.split('.')[1] || ''
                            const hours = decimalStr.length === 1
                              ? Math.round(interval * 10)
                              : Math.round(interval * 100)
                            if (hours > 23) {
                              isValid = false
                            }
                          } else if (interval >= 1) {
                            const decimalPart = interval % 1
                            if (decimalPart > 0) {
                              const decimalStr = value.split('.')[1] || ''
                              const hours = decimalStr.length === 1
                                ? Math.round(decimalPart * 10)
                                : Math.round(decimalPart * 100)
                              if (hours > 23) {
                                isValid = false
                              }
                            }
                          }

                          if (!isValid) return

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
                    <select
                      className="border rounded px-2 py-2"
                      value={intervalUnit}
                      onChange={e => {
                        const next = e.target.value as 'days' | 'months'
                        setForm(prev => {
                          const prevAction = prev.action as any
                          const nextAction = { ...prevAction, task_interval_unit: next }
                          if (next === 'months') {
                            const current = typeof prevAction.task_interval_days === 'number' ? prevAction.task_interval_days : 0
                            nextAction.task_interval_days = Math.max(1, Math.round(current || 1))
                          }
                          return { ...prev, action: nextAction }
                        })
                      }}
                    >
                      <option value="days">Dias</option>
                      <option value="months">Meses</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {intervalUnit === 'months'
                      ? 'As tarefas serão criadas no mesmo dia dos meses subsequentes (ex.: 10/06, 10/07, 10/08).'
                      : '0 = mesmo dia, 0.1 = 1h, 0.23 = 23h, 1 = 1 dia, etc.'}
                  </p>
                </div>
              )
            })()}
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
                  onChange={() => setForm(prev => {
                    const prevAction = prev.action as any
                    const nextAction: Record<string, any> = { ...prevAction, due_date_mode: 'fixed' }
                    if (prevAction.assignee_mode === 'manual') {
                      nextAction.assignee_mode = 'auto'
                      nextAction.assigned_to = ''
                    }
                    if (prevAction.title_mode === 'manual') {
                      nextAction.title_mode = 'fixed'
                    }
                    return { ...prev, action: nextAction }
                  })}
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
                            due_time: (numValue < 1 || (numValue >= 1 && numValue % 1 > 0)) ? undefined : (prev.action as any)?.due_time
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
            {(() => {
              const action = form.action as any
              const dueDateMode = (action.due_date_mode || 'manual') as 'manual' | 'fixed'
              const rawMode = action.assignee_mode as 'auto' | 'fixed' | 'manual' | undefined
              const inferredMode: 'auto' | 'fixed' | 'manual' = rawMode
                || ((action.assigned_to || '').trim() ? 'fixed' : 'auto')
              const showManualOption = dueDateMode === 'manual'
              const currentMode: 'auto' | 'fixed' | 'manual' = inferredMode === 'manual' && !showManualOption ? 'auto' : inferredMode
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name="auto-assign"
                        checked={currentMode === 'auto'}
                        onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, assignee_mode: 'auto', assigned_to: '' } }))}
                      />
                      <span className="text-sm text-gray-800">Automático (quem disparou)</span>
                    </label>
                    <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name="auto-assign"
                        checked={currentMode === 'fixed'}
                        onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, assignee_mode: 'fixed' } }))}
                      />
                      <span className="text-sm text-gray-800">Fixo (usuário definido)</span>
                    </label>
                    {showManualOption && (
                      <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer">
                        <input
                          type="radio"
                          name="auto-assign"
                          checked={currentMode === 'manual'}
                          onChange={() => setForm(prev => ({ ...prev, action: { ...prev.action, assignee_mode: 'manual', assigned_to: '' } }))}
                        />
                        <span className="text-sm text-gray-800">Definir manualmente (no modal)</span>
                      </label>
                    )}
                  </div>
                  {currentMode === 'fixed' && (
                    <div className="mt-2">
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
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {currentMode === 'auto' && 'O responsável será o usuário que disparou a automação.'}
                    {currentMode === 'fixed' && 'O usuário selecionado será sempre o responsável das tarefas criadas.'}
                    {currentMode === 'manual' && 'Ao disparar a automação, o modal pedirá data, horário e responsável.'}
                  </p>
                </>
              )
            })()}
          </div>
        </>
      )}
    </>
  )
}
