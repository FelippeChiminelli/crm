import { ds } from '../../../utils/designSystem'
import type { ContractTemplateFormState } from './contractTemplateFormState'
import type { ContractPageSettings } from '../../../types'

interface ContractTemplateSettingsProps {
  state: ContractTemplateFormState
  onChange: (patch: Partial<ContractTemplateFormState>) => void
}

const MARGIN_FIELDS: { key: keyof ContractPageSettings; label: string }[] = [
  { key: 'marginTop', label: 'Superior' },
  { key: 'marginRight', label: 'Direita' },
  { key: 'marginBottom', label: 'Inferior' },
  { key: 'marginLeft', label: 'Esquerda' },
]

export function ContractTemplateSettings({ state, onChange }: ContractTemplateSettingsProps) {
  const patchPageSettings = (patch: Partial<ContractPageSettings>) => {
    onChange({ pageSettings: { ...state.pageSettings, ...patch } })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome do modelo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={ds.input()}
          placeholder="Ex: Contrato de honorários"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
        <input
          type="text"
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={ds.input()}
          placeholder="Quando este modelo deve ser usado"
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700 mb-1">
          Margens <span className="text-xs font-normal text-gray-500">(em pontos, 72 = 2,54 cm)</span>
        </p>
        <p className="text-xs text-gray-500 mb-2">
          O cabeçalho ocupa a margem superior e o rodapé a inferior. Se algum deles ficar
          cortado, aumente a margem correspondente.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MARGIN_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                type="number"
                min={0}
                max={200}
                value={(state.pageSettings[key] as number) ?? 0}
                onChange={(e) => patchPageSettings({ [key]: Number(e.target.value) })}
                className={ds.input()}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tamanho da fonte</label>
          <input
            type="number"
            min={8}
            max={18}
            value={state.pageSettings.fontSize ?? 11}
            onChange={(e) => patchPageSettings({ fontSize: Number(e.target.value) })}
            className={ds.input()}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
          <input
            type="checkbox"
            checked={state.pageSettings.showPageNumbers ?? true}
            onChange={(e) => patchPageSettings({ showPageNumbers: e.target.checked })}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          Numerar páginas
        </label>
      </div>
    </div>
  )
}
