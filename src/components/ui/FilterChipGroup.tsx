export interface FilterChipOption {
  value: string
  label: string
  /** Classe de cor aplicada quando o chip está selecionado (ex: 'bg-red-100 text-red-700') */
  colorClass?: string
}

interface FilterChipGroupProps {
  options: FilterChipOption[]
  selected: string[]
  onToggle: (value: string) => void
  /** Texto auxiliar mostrado abaixo quando há itens selecionados. Use {count} para o total. */
  helperText?: string
  emptyMessage?: string
  disabled?: boolean
}

const DEFAULT_SELECTED_COLOR = 'bg-blue-100 text-blue-700'

/**
 * Grupo de chips toggle para filtros multi-seleção.
 * Reaproveita o padrão visual já usado para Tags/Status nos modais de filtro.
 */
export function FilterChipGroup({
  options,
  selected,
  onToggle,
  helperText,
  emptyMessage,
  disabled = false,
}: FilterChipGroupProps) {
  if (options.length === 0) {
    return emptyMessage ? (
      <p className="text-xs text-gray-400">{emptyMessage}</p>
    ) : null
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {options.map(option => {
          const isSelected = selected.includes(option.value)
          const selectedColor = option.colorClass || DEFAULT_SELECTED_COLOR
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(option.value)}
              className={`
                px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected
                  ? `${selectedColor} ring-2 ring-offset-1 ring-orange-500`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {helperText && selected.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {helperText.replace('{count}', String(selected.length))}
        </p>
      )}
    </div>
  )
}
