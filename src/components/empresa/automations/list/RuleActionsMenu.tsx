import { useEffect, useRef, useState } from 'react'
import { ChartBarIcon, DocumentDuplicateIcon, EllipsisVerticalIcon, TrashIcon } from '@heroicons/react/24/outline'

interface RuleActionsMenuProps {
  duplicating: boolean
  onViewExecutions: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function RuleActionsMenu({ duplicating, onViewExecutions, onDuplicate, onDelete }: RuleActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  const itemClass = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        title="Mais opções"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button type="button" className={`${itemClass} text-gray-700`} onClick={() => run(onViewExecutions)}>
            <ChartBarIcon className="h-4 w-4" /> Ver execuções
          </button>
          <button type="button" className={`${itemClass} text-gray-700`} disabled={duplicating} onClick={() => run(onDuplicate)}>
            <DocumentDuplicateIcon className="h-4 w-4" /> {duplicating ? 'Duplicando...' : 'Duplicar'}
          </button>
          <button type="button" className={`${itemClass} text-red-600`} onClick={() => run(onDelete)}>
            <TrashIcon className="h-4 w-4" /> Excluir
          </button>
        </div>
      )}
    </div>
  )
}
