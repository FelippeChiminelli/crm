import { ConditionChip, toggleId, type ConditionAccent } from './ConditionChip'

interface ResponsibleConditionProps {
  profiles: { uuid: string; full_name: string; email: string }[]
  selectedIds: string[]
  onChange: (responsibleIds: string[]) => void
  label?: string
  helpText?: string
  accent?: ConditionAccent
}

/** Multi-select de responsáveis usado nas condições de automação (responsible_uuids). */
export function ResponsibleCondition({
  profiles,
  selectedIds,
  onChange,
  label = 'Responsável(is) que disparam',
  helpText = 'Selecione um ou mais responsáveis. Deixe vazio para qualquer responsável.',
  accent = 'blue',
}: ResponsibleConditionProps) {
  return (
    <div className="md:col-span-2">
      <label className="block text-sm text-gray-700 mb-1.5">{label}</label>
      <p className="text-xs text-gray-500 mb-2">{helpText}</p>
      <div className="flex flex-wrap gap-2">
        {profiles.map(profile => (
          <ConditionChip
            key={profile.uuid}
            label={profile.full_name || profile.email}
            accent={accent}
            selected={selectedIds.includes(profile.uuid)}
            onClick={() => onChange(toggleId(selectedIds, profile.uuid))}
          />
        ))}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-gray-500 mt-1.5">
          {selectedIds.length} responsável(eis) selecionado(s)
        </p>
      )}
    </div>
  )
}
