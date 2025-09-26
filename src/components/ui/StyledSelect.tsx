import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'

interface Option {
  value: string
  label: string
  description?: string
  badge?: string
  disabled?: boolean
}

interface StyledSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  openUpwards?: boolean
}

export function StyledSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  disabled = false,
  className = '',
  size = 'md',
  openUpwards,
}: StyledSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const selectRef = useRef<HTMLDivElement>(null)
  const [shouldOpenUp] = useState(false)

  const selectedOption = options.find(option => option.value === value)

  const sizeClasses = {
    sm: 'text-sm px-3 py-2',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-4 py-3'
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          )
          break
        case 'Enter':
          event.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            const option = options[highlightedIndex]
            if (!option.disabled) {
              onChange(option.value)
              setIsOpen(false)
              setHighlightedIndex(-1)
            }
          }
          break
        case 'Escape':
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, highlightedIndex, options, onChange])

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full text-left bg-white border border-gray-300 rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : 'hover:border-gray-400'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedOption ? (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {selectedOption.badge}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDownIcon 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`${(openUpwards ?? shouldOpenUp) ? 'absolute bottom-full mb-1' : 'absolute mt-1'} z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto`}>
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value)
                  setIsOpen(false)
                  setHighlightedIndex(-1)
                }
              }}
              disabled={option.disabled}
              className={`
                w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50
                disabled:opacity-50 disabled:cursor-not-allowed
                ${index === 0 ? 'rounded-t-lg' : ''}
                ${index === options.length - 1 ? 'rounded-b-lg' : ''}
                ${highlightedIndex === index ? 'bg-gray-50' : ''}
                ${option.value === value ? 'bg-primary-50 text-primary-900' : 'text-gray-900'}
              `}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${
                      option.value === value ? 'text-primary-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </span>
                    {option.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {option.badge}
                      </span>
                    )}
                  </div>
                </div>
                {option.value === value && (
                  <CheckIcon className="w-4 h-4 text-primary-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 