import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { ds } from '../../utils/designSystem'
import { TruncatedText } from './TruncatedText'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectDropdownProps {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  /** Texto do botão quando nada está selecionado */
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

const SEARCH_THRESHOLD = 8

function summary(options: MultiSelectOption[], selected: string[], placeholder: string): string {
  if (selected.length === 0) return placeholder
  if (selected.length === 1) {
    return options.find(o => o.value === selected[0])?.label ?? '1 selecionado'
  }
  return `${selected.length} selecionados`
}

/** Select com checkboxes, no mesmo visual dos inputs do design system. */
export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Todos',
  emptyMessage = 'Nenhuma opção disponível',
  disabled = false,
  className = ''
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => {
    setIsOpen(false)
    setSearch('')
  }, [])

  const selectedLabels = options
    .filter(o => selected.includes(o.value))
    .map(o => o.label)
    .join(', ')

  const term = search.trim().toLocaleLowerCase('pt-BR')
  const visibleOptions = term
    ? options.filter(o => o.label.toLocaleLowerCase('pt-BR').includes(term))
    : options

  useEscapeKey(isOpen, close)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, close])

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  return (
    <div ref={ref} className={`relative block ${className}`}>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <button
        type="button"
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${ds.input()} mt-1 flex items-center justify-between gap-2 text-left bg-white disabled:bg-gray-50 disabled:text-gray-400`}
      >
        <TruncatedText
          text={summary(options, selected, placeholder)}
          tooltip={selectedLabels}
          className={selected.length === 0 ? 'text-gray-500' : 'text-gray-900'}
        />
        <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-30 mt-1 w-full min-w-[220px] max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1"
        >
          {options.length > SEARCH_THRESHOLD && (
            <div className="px-2 pb-1">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                autoFocus
                className={`${ds.input()} !py-1.5`}
              />
            </div>
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-3 py-1.5 text-left text-xs text-orange-600 hover:bg-gray-50"
            >
              Limpar seleção
            </button>
          )}
          {visibleOptions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">{emptyMessage}</p>
          ) : visibleOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <TruncatedText text={option.label} />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
