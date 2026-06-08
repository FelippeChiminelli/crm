interface LeadDetailFooterProps {
  isSaving: boolean
  onCancel: () => void
  onSave: () => void
}

export function LeadDetailFooter({ isSaving, onCancel, onSave }: LeadDetailFooterProps) {
  return (
    <div className="flex gap-2 p-2 sm:p-3 lg:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
      <button
        onClick={onCancel}
        className="flex-1 px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        disabled={isSaving}
      >
        Cancelar
      </button>
      <button
        onClick={onSave}
        className="flex-1 px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-orange-500 border border-transparent rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={isSaving}
      >
        {isSaving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}
