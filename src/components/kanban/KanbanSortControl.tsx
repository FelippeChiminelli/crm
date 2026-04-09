import { useState, useRef, useEffect } from 'react'
import { BarsArrowDownIcon, BarsArrowUpIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { KanbanSort, KanbanSortField, KanbanSortDirection } from '../../services/leadService'

interface SortOption {
  field: KanbanSortField
  direction: KanbanSortDirection
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'created_at', direction: 'desc', label: 'Mais recentes' },
  { field: 'created_at', direction: 'asc', label: 'Mais antigos' },
  { field: 'value', direction: 'desc', label: 'Maior valor' },
  { field: 'value', direction: 'asc', label: 'Menor valor' },
  { field: 'name', direction: 'asc', label: 'Nome A–Z' },
  { field: 'name', direction: 'desc', label: 'Nome Z–A' },
  { field: 'last_contact_at', direction: 'desc', label: 'Contato recente' },
  { field: 'last_contact_at', direction: 'asc', label: 'Contato antigo' },
]

interface KanbanSortControlProps {
  value: KanbanSort
  onChange: (sort: KanbanSort) => void
  disabled?: boolean
}

export function KanbanSortControl({ value, onChange, disabled }: KanbanSortControlProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const isAsc = value.direction === 'asc'
  const Icon = isAsc ? BarsArrowUpIcon : BarsArrowDownIcon

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className="
          p-1.5 sm:p-0.5 rounded
          text-gray-500 hover:text-gray-700
          hover:bg-gray-100 active:bg-gray-200
          transition-colors
          flex-shrink-0
          w-[32px] h-[32px] sm:w-[24px] sm:h-[24px]
          flex items-center justify-center
          touch-manipulation
          disabled:opacity-40 disabled:cursor-not-allowed
        "
        title="Ordenar leads"
        aria-label="Ordenar leads"
        aria-expanded={open}
      >
        <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-1 z-50
          bg-white border border-gray-200 rounded-lg shadow-lg
          py-1 min-w-[170px]
          animate-in fade-in slide-in-from-top-1
        ">
          {SORT_OPTIONS.map(opt => {
            const isActive = value.field === opt.field && value.direction === opt.direction
            return (
              <button
                key={`${opt.field}:${opt.direction}`}
                type="button"
                onClick={() => {
                  onChange({ field: opt.field, direction: opt.direction })
                  setOpen(false)
                }}
                className={`
                  w-full text-left px-3 py-1.5
                  text-xs flex items-center justify-between gap-2
                  transition-colors
                  ${isActive
                    ? 'bg-orange-50 text-orange-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span>{opt.label}</span>
                {isActive && <CheckIcon className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
