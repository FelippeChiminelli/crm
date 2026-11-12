import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function AssignResponsibleActionForm() {
  const { form, setForm, profiles } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'assign_responsible' && (
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Novo responsável</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={(form.action as any).responsible_uuid || ''}
            onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, responsible_uuid: e.target.value } }))}
          >
            <option value="">Selecione um usuário</option>
            {profiles.map(p => (
              <option key={p.uuid} value={p.uuid}>
                {p.full_name || p.email}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Ao disparar esta automação, o lead será atribuído ao usuário selecionado.
          </p>
        </div>
      )}
    </>
  )
}
