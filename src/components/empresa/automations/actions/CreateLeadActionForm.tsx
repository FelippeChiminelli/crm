import { StyledSelect } from '../../../ui/StyledSelect'
import { PipelineSingleSelect } from '../ui/PipelineSingleSelect'
import { StageSingleSelect } from '../ui/StageSingleSelect'
import { LEAD_STATUS_OPTIONS } from '../constants'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function CreateLeadActionForm() {
  const { form, setForm, pipelines, createLeadStages, profiles } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'create_lead' && (
        <>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Pipeline destino</label>
            <PipelineSingleSelect
              pipelines={pipelines}
              value={(form.action as any).target_pipeline_id || ''}
              placeholder="Selecione"
              onChange={(value) => {
                setForm(prev => ({ ...prev, action: { ...prev.action, target_pipeline_id: value, target_stage_id: '' } }))
              }}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Etapa destino</label>
            <StageSingleSelect
              stages={createLeadStages}
              value={(form.action as any).target_stage_id || ''}
              placeholder="Selecione"
              onChange={(v) => setForm(prev => ({ ...prev, action: { ...prev.action, target_stage_id: v } }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Origem do lead</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder={form.event_type === 'booking_created' ? 'Agendamento' : 'Automação'}
              value={(form.action as any).origin || ''}
              onChange={(e) => setForm(prev => ({ ...prev, action: { ...prev.action, origin: e.target.value } }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Status do lead (opcional)</label>
            <StyledSelect
              options={[{ value: '', label: 'Padrão do pipeline' }, ...LEAD_STATUS_OPTIONS]}
              value={(form.action as any).status || ''}
              onChange={(val) => setForm(prev => ({ ...prev, action: { ...prev.action, status: val || undefined } }))}
            />
          </div>
          {form.event_type === 'booking_created' ? (
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={(form.action as any).assign_to_booking_owner !== false}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    action: {
                      ...prev.action,
                      assign_to_booking_owner: e.target.checked,
                      ...(e.target.checked ? { responsible_uuid: '' } : {}),
                    }
                  }))}
                />
                Usar responsável do agendamento como responsável do lead
              </label>
              {(form.action as any).assign_to_booking_owner === false && (
                <StyledSelect
                  options={[
                    { value: '', label: 'Selecione um responsável' },
                    ...profiles.map(p => ({ value: p.uuid, label: p.full_name || p.email }))
                  ]}
                  value={(form.action as any).responsible_uuid || ''}
                  onChange={(val) => setForm(prev => ({ ...prev, action: { ...prev.action, responsible_uuid: val } }))}
                />
              )}
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Responsável do novo lead (opcional)</label>
              <StyledSelect
                options={[
                  { value: '', label: 'Usar responsável do lead de origem' },
                  ...profiles.map(p => ({ value: p.uuid, label: p.full_name || p.email }))
                ]}
                value={(form.action as any).responsible_uuid || ''}
                onChange={(val) => setForm(prev => ({ ...prev, action: { ...prev.action, responsible_uuid: val } }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Os dados do lead atual (nome, telefone, e-mail) serão copiados para o novo lead.
              </p>
            </div>
          )}
          <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={(form.action as any).prevent_duplicate === true}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  action: {
                    ...prev.action,
                    prevent_duplicate: e.target.checked,
                    duplicate_match_fields: e.target.checked
                      ? ((prev.action as any).duplicate_match_fields?.length
                        ? (prev.action as any).duplicate_match_fields
                        : ['phone'])
                      : (prev.action as any).duplicate_match_fields,
                  },
                }))}
              />
              Não criar se lead duplicado
            </label>
            {(form.action as any).prevent_duplicate === true && (
              <div className="space-y-3 pl-6">
                <div>
                  <p className="text-sm text-gray-700 mb-2">Critérios de duplicata</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={((form.action as any).duplicate_match_fields || []).includes('phone')}
                        onChange={(e) => {
                          const current = ((form.action as any).duplicate_match_fields || []) as string[]
                          const next = e.target.checked
                            ? [...new Set([...current, 'phone'])]
                            : current.filter((field) => field !== 'phone')
                          setForm(prev => ({ ...prev, action: { ...prev.action, duplicate_match_fields: next } }))
                        }}
                      />
                      Telefone
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={((form.action as any).duplicate_match_fields || []).includes('email')}
                        onChange={(e) => {
                          const current = ((form.action as any).duplicate_match_fields || []) as string[]
                          const next = e.target.checked
                            ? [...new Set([...current, 'email'])]
                            : current.filter((field) => field !== 'email')
                          setForm(prev => ({ ...prev, action: { ...prev.action, duplicate_match_fields: next } }))
                        }}
                      />
                      E-mail
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Se ambos estiverem marcados, basta coincidir telefone ou e-mail para considerar duplicata.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Escopo da busca</label>
                  <StyledSelect
                    options={[
                      { value: 'empresa', label: 'Em toda a empresa' },
                      { value: 'target_pipeline', label: 'Apenas no pipeline destino' },
                    ]}
                    value={(form.action as any).duplicate_scope || 'empresa'}
                    onChange={(val) => setForm(prev => ({
                      ...prev,
                      action: { ...prev.action, duplicate_scope: val || 'empresa' },
                    }))}
                  />
                </div>
                {form.event_type !== 'booking_created' && (
                  <p className="text-xs text-gray-500">
                    No fluxo lead → lead, o lead de origem é ignorado na busca para evitar falso positivo.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
