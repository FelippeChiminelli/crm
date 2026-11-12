import { META_CAPI_AUTOMATION_EVENT_OPTIONS } from '../../../../services/metaCapiService'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function MetaCapiActionForm() {
  const { form, setForm, metaCapiConfigs } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'send_meta_capi_event' && (
        <>
          <div className="md:col-span-3">
            <label className="block text-sm text-gray-700 mb-1">Token permanente *</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={(form.action as any).config_id || ''}
              onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, config_id: e.target.value } }))}
            >
              <option value="">Selecione um token</option>
              {metaCapiConfigs.filter(c => c.ativo).map(config => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
            {metaCapiConfigs.filter(c => c.ativo).length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Nenhum token CAPI ativo encontrado. Cadastre e ative um token permanente na aba Meta CAPI em Admin.
              </p>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm text-gray-700 mb-1">Tipo de evento *</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={(form.action as any).event_name || 'Lead'}
              onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, event_name: e.target.value } }))}
            >
              {META_CAPI_AUTOMATION_EVENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              O evento será enviado para a Meta com os dados do lead (nome, e-mail, telefone, etc.) via Conversions API.
            </p>
          </div>

          <div className="md:col-span-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-blue-800">Meta Conversions API</h5>
                  <p className="text-sm text-blue-700 mt-1">
                    O envio lê o token permanente no banco, identifica o dataset e registra o resultado em Meta CAPI → Eventos.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Se o token estiver inativo ou não existir, a ação será ignorada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
