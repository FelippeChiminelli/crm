import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline'

export type ViewMode = 'cards' | 'list'

interface ViewModeSelectorProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange('cards')}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'cards'
            ? 'bg-white text-orange-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        title="Visualização em Cards"
      >
        <Squares2X2Icon className="w-4 h-4 mr-2" />
        Cards
      </button>
      
      <button
        onClick={() => onViewModeChange('list')}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'list'
            ? 'bg-white text-orange-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        title="Visualização em Lista"
      >
        <ListBulletIcon className="w-4 h-4 mr-2" />
        Lista
      </button>
    </div>
  )
}
