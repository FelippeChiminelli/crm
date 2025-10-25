import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { Pipeline } from '../../types'

interface InlinePipelineSelectProps {
  currentPipelineId: string | null
  pipelines: Pipeline[]
  onPipelineChange: (pipelineId: string) => Promise<void>
  disabled?: boolean
}

export function InlinePipelineSelect({ 
  currentPipelineId, 
  pipelines, 
  onPipelineChange,
  disabled = false 
}: InlinePipelineSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId)

  // Detectar posição do dropdown
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      
      console.log('🔍 Pipeline Dropdown Position Debug:', {
        spaceBelow,
        spaceAbove,
        shouldOpenUp: spaceBelow < 300 && spaceAbove > spaceBelow,
        position: spaceBelow < 300 && spaceAbove > spaceBelow ? 'top' : 'bottom'
      })
      
      // Se não há espaço suficiente abaixo (menos de 300px) e há mais espaço acima, abrir para cima
      if (spaceBelow < 300 && spaceAbove > spaceBelow) {
        setDropdownPosition('top')
      } else {
        setDropdownPosition('bottom')
      }
    }
  }, [isOpen])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = async (pipelineId: string) => {
    if (pipelineId === currentPipelineId || isUpdating) return
    
    setIsUpdating(true)
    try {
      await onPipelineChange(pipelineId)
      setIsOpen(false)
    } catch (error) {
      console.error('Erro ao atualizar pipeline:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (disabled) {
    return (
      <div className="text-sm text-gray-400">
        {currentPipeline?.name || '-'}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`
          group flex items-center gap-1.5 text-sm text-gray-900 hover:text-orange-600 
          transition-colors rounded px-2 py-1 hover:bg-orange-50
          ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        `}
        title="Clique para alterar o pipeline"
      >
        <span className="truncate max-w-[120px]">
          {isUpdating ? 'Atualizando...' : (currentPipeline?.name || '-')}
        </span>
        <ChevronDownIcon className={`
          w-3 h-3 flex-shrink-0 text-gray-400 group-hover:text-orange-600 
          transition-transform
          ${isOpen ? 'rotate-180' : ''}
        `} />
      </button>

      {isOpen && !isUpdating && (
        <div className={`
          absolute z-50 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto
          ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
        `}>
          {pipelines.filter(p => p.active).map((pipeline) => (
            <button
              key={pipeline.id}
              onClick={() => handleSelect(pipeline.id)}
              className={`
                w-full text-left px-3 py-2 text-sm transition-colors
                ${pipeline.id === currentPipelineId
                  ? 'bg-orange-50 text-orange-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {pipeline.name}
            </button>
          ))}
          {pipelines.filter(p => p.active).length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              Nenhum pipeline disponível
            </div>
          )}
        </div>
      )}
    </div>
  )
}

