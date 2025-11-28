import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { Pipeline } from '../../types'
import SecureLogger from '../../utils/logger'

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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId)
  const activePipelines = pipelines.filter(p => p.active !== false) // Aceita true ou undefined

  // ✅ Log de debug para verificar dados
  useEffect(() => {
    SecureLogger.log('InlinePipelineSelect - Dados recebidos:', {
      totalPipelines: pipelines.length,
      activePipelines: activePipelines.length,
      currentPipelineId,
      pipelineNames: pipelines.map(p => ({ name: p.name, active: p.active }))
    })
  }, [pipelines, currentPipelineId])

  // Calcular posição do dropdown usando fixed positioning
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const dropdownHeight = 240 // max-height do dropdown
      
      let top: number
      
      // Se não há espaço suficiente abaixo e há mais espaço acima, abrir para cima
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        top = rect.top - dropdownHeight - 4 // 4px de margem
      } else {
        top = rect.bottom + 4 // 4px de margem
      }
      
      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 224)}px`, // mínimo 224px (w-56)
      })
    }
  }, [isOpen])

  // Fechar dropdown ao clicar fora ou ao rolar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true) // true = capture phase para pegar scroll de qualquer elemento
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isOpen])

  const handleSelect = async (pipelineId: string) => {
    if (pipelineId === currentPipelineId || isUpdating) return
    
    setIsUpdating(true)
    try {
      await onPipelineChange(pipelineId)
      setIsOpen(false)
    } catch (error) {
      SecureLogger.error('Erro ao atualizar pipeline', error)
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
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`
          group flex items-center gap-1.5 text-sm text-gray-900 hover:text-orange-600 
          transition-colors rounded px-2 py-1 hover:bg-orange-50
          ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        `}
        title="Clique para transferir para outro pipeline"
      >
        <span className="truncate max-w-[120px]">
          {isUpdating ? 'Transferindo...' : (currentPipeline?.name || '-')}
        </span>
        <ChevronDownIcon className={`
          w-3 h-3 flex-shrink-0 text-gray-400 group-hover:text-orange-600 
          transition-transform
          ${isOpen ? 'rotate-180' : ''}
        `} />
      </button>

      {isOpen && !isUpdating && (
        <div 
          style={dropdownStyle}
          className="z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto"
        >
          {activePipelines.map((pipeline) => (
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
          {activePipelines.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              Nenhum pipeline disponível
              {pipelines.length > 0 && (
                <span className="block text-xs mt-1">
                  ({pipelines.length} pipelines inativos)
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

