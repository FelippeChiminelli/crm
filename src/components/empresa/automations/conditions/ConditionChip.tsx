export type ConditionAccent = 'blue' | 'amber'

const SELECTED_CLASSES: Record<ConditionAccent, string> = {
  blue: 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500',
  amber: 'bg-amber-100 text-amber-700 ring-2 ring-offset-1 ring-amber-500',
}

interface ConditionChipProps {
  label: string
  selected: boolean
  accent?: ConditionAccent
  onClick: () => void
}

/** Chip de seleção usado nos multi-selects de condição das automações. */
export function ConditionChip({ label, selected, accent = 'blue', onClick }: ConditionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        selected ? SELECTED_CLASSES[accent] : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

/** Alterna um id em uma lista, retornando undefined quando a seleção fica vazia. */
export function toggleId(currentIds: string[], id: string): string[] {
  return currentIds.includes(id)
    ? currentIds.filter(current => current !== id)
    : [...currentIds, id]
}
