import { StyledSelect } from '../../../ui/StyledSelect'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function GenerateContractActionForm() {
  const { form, setForm, contractTemplates, whatsappInstances } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'generate_contract' && (
        <>
          <div className="md:col-span-3">
            <label className="block text-sm text-gray-700 mb-1">Modelo de contrato *</label>
            {contractTemplates.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Nenhum modelo de contrato ativo. Crie um modelo na aba Contratos antes de usar esta ação.
                </p>
              </div>
            ) : (
              <>
                <StyledSelect
                  options={[
                    { value: '', label: 'Selecione o modelo' },
                    ...contractTemplates.map(template => ({
                      value: template.id,
                      label: template.name,
                    })),
                  ]}
                  value={(form.action as any).template_id || ''}
                  onChange={(value) => setForm(prev => ({ ...prev, action: { ...prev.action, template_id: value } }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  O PDF é anexado ao lead. Se faltar alguma variável obrigatória do modelo, a emissão é bloqueada e o motivo aparece no histórico de execuções.
                </p>
              </>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={(form.action as any).send_whatsapp === true}
                onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, send_whatsapp: e.target.checked } }))}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              Enviar o contrato para o lead por WhatsApp
            </label>
          </div>

          {(form.action as any).send_whatsapp === true && (
            <>
              <div className="md:col-span-1">
                <label className="block text-sm text-gray-700 mb-1">Instância *</label>
                <StyledSelect
                  options={[
                    { value: '', label: 'Selecione a instância' },
                    ...whatsappInstances.map(instance => ({
                      value: instance.id,
                      label: instance.display_name || instance.name || instance.id,
                    })),
                  ]}
                  value={(form.action as any).wa_instance_id || ''}
                  onChange={(value) => setForm(prev => ({ ...prev, action: { ...prev.action, wa_instance_id: value } }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Mensagem que acompanha o arquivo</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Ex: Segue o contrato para assinatura."
                  value={(form.action as any).wa_caption || ''}
                  onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, wa_caption: e.target.value } }))}
                />
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
