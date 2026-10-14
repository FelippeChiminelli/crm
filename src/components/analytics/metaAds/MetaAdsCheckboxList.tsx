interface CheckboxOption {
  id: string
  name: string
}

interface MetaAdsCheckboxListProps {
  options: CheckboxOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  emptyText?: string
}

/** Lista com "Todos" no topo: nenhuma seleção equivale a não filtrar. */
export function MetaAdsCheckboxList({ options, selected, onChange, emptyText }: MetaAdsCheckboxListProps) {
  if (options.length === 0) {
    return <p className="text-sm text-gray-500">{emptyText ?? 'Nenhuma opção disponível'}</p>
  }

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected.length === 0}
          onChange={() => onChange([])}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">Todos</span>
      </label>

      {options.map((option) => (
        <label key={option.id} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={() => toggle(option.id)}
            className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 break-words">{option.name}</span>
        </label>
      ))}
    </div>
  )
}
