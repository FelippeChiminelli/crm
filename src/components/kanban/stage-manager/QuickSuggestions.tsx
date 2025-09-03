interface StageItem {
  id: string
  name: string
  tempId?: string
}

interface QuickSuggestionsProps {
  stages: StageItem[]
  onAddStage: (name: string) => void
}

const QUICK_SUGGESTIONS = [
  'Prospecção', 
  'Qualificação', 
  'Proposta', 
  'Negociação', 
  'Fechamento'
]

export function QuickSuggestions({ stages, onAddStage }: QuickSuggestionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_SUGGESTIONS.map(name => (
        <button
          key={name}
          onClick={() => onAddStage(name)}
          disabled={stages.some(stage => 
            stage.name.toLowerCase() === name.toLowerCase()
          )}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + {name}
        </button>
      ))}
    </div>
  )
} 