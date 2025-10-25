import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { Stage } from '../../types'

interface InlineStageSelectProps {
  currentStageId: string | null
  stages: Stage[]
  pipelineId: string | null
  onStageChange: (stageId: string) => Promise<void>
  disabled?: boolean
}

export function InlineStageSelect({ 
  currentStageId, 
  stages, 
  pipelineId,
  onStageChange,
  disabled = false 
}: InlineStageSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentStage = stages.find(s => s.id === currentStageId)
  
  // Filtrar estágios do pipeline atual
  const availableStages = stages.filter(s => s.pipeline_id === pipelineId)

  // Detectar posição do dropdown
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      
      console.log('🔍 Stage Dropdown Position Debug:', {
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

  const handleSelect = async (stageId: string) => {
    if (stageId === currentStageId || isUpdating) return
    
    setIsUpdating(true)
    try {
      await onStageChange(stageId)
      setIsOpen(false)
    } catch (error) {
      console.error('Erro ao atualizar estágio:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (disabled) {
    return (
      <div className="text-sm text-gray-400">
        {currentStage?.name || '-'}
      </div>
    )
  }

  if (!pipelineId) {
    return (
      <div className="text-xs text-gray-400 italic" title="Selecione um pipeline primeiro">
        Sem pipeline
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
        title="Clique para alterar o estágio"
      >
        <span className="truncate max-w-[120px]">
          {isUpdating ? 'Atualizando...' : (currentStage?.name || '-')}
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
          {availableStages.length > 0 ? (
            availableStages
              .sort((a, b) => (a.position || 0) - (b.position || 0))
              .map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleSelect(stage.id)}
                  className={`
                    w-full text-left px-3 py-2 text-sm transition-colors
                    ${stage.id === currentStageId
                      ? 'bg-orange-50 text-orange-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {stage.name}
                </button>
              ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Nenhum estágio disponível
            </div>
          )}
        </div>
      )}
    </div>
  )
}

