import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'

interface StageInputProps {
  onAddStage: (name: string) => void
}

export function StageInput({ onAddStage }: StageInputProps) {
  const [newStageName, setNewStageName] = useState('')

  const handleAdd = () => {
    if (!newStageName.trim()) return
    
    onAddStage(newStageName.trim())
    setNewStageName('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={newStageName}
        onChange={(e) => setNewStageName(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Nome da etapa..."
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
      <button
        onClick={handleAdd}
        disabled={!newStageName.trim()}
        className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  )
} 