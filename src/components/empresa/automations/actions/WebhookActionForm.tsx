import { XMarkIcon } from '@heroicons/react/24/outline'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function WebhookActionForm() {
  const { form, setForm, customFields } = useAutomationEditor()
  return (
    <>
                    {(form.action as any).type === 'call_webhook' && (
                      <>
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-700 mb-1">URL do webhook *</label>
                          <input
                            className="border rounded px-3 py-2 w-full"
                            placeholder="https://exemplo.com/webhook"
                            value={(form.action as any).webhook_url || ''}
                            onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, webhook_url: e.target.value } }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">URL que receberá a requisição quando a automação for executada</p>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Método HTTP</label>
                          <select
                            className="border rounded px-3 py-2 w-full"
                            value={(form.action as any).webhook_method || 'POST'}
                            onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, webhook_method: e.target.value } }))}
                          >
                            <option value="POST">POST</option>
                            <option value="GET">GET</option>
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-sm text-gray-700 mb-2">Headers customizados (opcional)</label>
                          <div className="space-y-2">
                            {((form.action as any).webhook_headers || []).map((header: { key: string; value: string }, index: number) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  className="border rounded px-3 py-2 flex-1"
                                  placeholder="Nome do header (ex: Authorization)"
                                  value={header.key || ''}
                                  onChange={e => {
                                    const newHeaders = [...((form.action as any).webhook_headers || [])]
                                    newHeaders[index] = { ...newHeaders[index], key: e.target.value }
                                    setForm(prev => ({ ...prev, action: { ...prev.action, webhook_headers: newHeaders } }))
                                  }}
                                />
                                <input
                                  className="border rounded px-3 py-2 flex-1"
                                  placeholder="Valor (ex: Bearer token123)"
                                  value={header.value || ''}
                                  onChange={e => {
                                    const newHeaders = [...((form.action as any).webhook_headers || [])]
                                    newHeaders[index] = { ...newHeaders[index], value: e.target.value }
                                    setForm(prev => ({ ...prev, action: { ...prev.action, webhook_headers: newHeaders } }))
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newHeaders = ((form.action as any).webhook_headers || []).filter((_: any, i: number) => i !== index)
                                    setForm(prev => ({ ...prev, action: { ...prev.action, webhook_headers: newHeaders } }))
                                  }}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <XMarkIcon className="w-5 h-5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newHeaders = [...((form.action as any).webhook_headers || []), { key: '', value: '' }]
                                setForm(prev => ({ ...prev, action: { ...prev.action, webhook_headers: newHeaders } }))
                              }}
                              className="text-sm text-primary-600 hover:text-primary-500"
                            >
                              + Adicionar header
                            </button>
                          </div>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-sm text-gray-700 mb-2">Campos do lead a enviar no payload *</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {[
                              { value: 'id', label: 'ID' },
                              { value: 'name', label: 'Nome' },
                              { value: 'email', label: 'Email' },
                              { value: 'phone', label: 'Telefone' },
                              { value: 'company', label: 'Empresa' },
                              { value: 'value', label: 'Valor' },
                              { value: 'status', label: 'Status' },
                              { value: 'origin', label: 'Origem' },
                              { value: 'pipeline_id', label: 'Pipeline ID' },
                              { value: 'stage_id', label: 'Etapa ID' },
                              { value: 'tags', label: 'Tags' },
                              { value: 'notes', label: 'Notas' },
                              { value: 'responsible_uuid', label: 'Responsável ID' },
                              { value: 'created_at', label: 'Data criação' },
                              { value: 'sold_value', label: 'Valor venda' },
                              { value: 'sale_notes', label: 'Notas venda' },
                              { value: 'loss_reason_category', label: 'Motivo perda' },
                              { value: 'loss_reason_notes', label: 'Notas perda' }
                            ].map(field => (
                              <label key={field.value} className="inline-flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={((form.action as any).webhook_fields || []).includes(field.value)}
                                  onChange={e => {
                                    const currentFields = (form.action as any).webhook_fields || []
                                    const newFields = e.target.checked
                                      ? [...currentFields, field.value]
                                      : currentFields.filter((f: string) => f !== field.value)
                                    setForm(prev => ({ ...prev, action: { ...prev.action, webhook_fields: newFields } }))
                                  }}
                                />
                                <span className="text-gray-700">{field.label}</span>
                              </label>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Selecione os campos que serão enviados no payload do webhook</p>
                        </div>

                        {/* Campos Personalizados */}
                        {customFields.length > 0 && (
                          <div className="md:col-span-3">
                            <label className="block text-sm text-gray-700 mb-2">Campos personalizados</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {customFields.map(field => {
                                const fieldKey = `custom_field_${field.id}`
                                return (
                                  <label key={field.id} className="inline-flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={((form.action as any).webhook_fields || []).includes(fieldKey)}
                                      onChange={e => {
                                        const currentFields = (form.action as any).webhook_fields || []
                                        const newFields = e.target.checked
                                          ? [...currentFields, fieldKey]
                                          : currentFields.filter((f: string) => f !== fieldKey)
                                        setForm(prev => ({ ...prev, action: { ...prev.action, webhook_fields: newFields } }))
                                      }}
                                    />
                                    <span className="text-gray-700">{field.name}</span>
                                    <span className="text-xs text-gray-400">({field.type})</span>
                                  </label>
                                )
                              })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Os campos personalizados serão enviados dentro de "custom_fields" no payload</p>
                          </div>
                        )}

                        <div className="md:col-span-3">
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium text-blue-800">Estrutura do payload</h5>
                                <p className="text-sm text-blue-700 mt-1">
                                  O webhook receberá um JSON com: event_type, automation_name, timestamp, os campos do lead selecionados e campos personalizados (se selecionados).
                                </p>
                                <pre className="text-xs text-blue-600 mt-2 bg-blue-100 p-2 rounded overflow-x-auto">
      {`{
        "event_type": "lead_stage_changed",
        "automation_name": "Nome da automação",
        "timestamp": "2026-01-19T12:00:00Z",
        "lead": { /* campos selecionados */ },
        "custom_fields": { /* campos personalizados (se selecionados) */ }
      }`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
    </>
  )
}
