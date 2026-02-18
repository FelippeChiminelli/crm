import { useState, useMemo } from 'react'
import { ArrowRightIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { Pipeline, Stage } from '../../types'
import type { BulkProgress } from '../../hooks/useBulkLeadActions'
import type { GetLeadsParams } from '../../services/leadService'

interface BulkActionsBarProps {
  selectedCount: number
  isProcessing: boolean
  progress: BulkProgress | null
  isSelectAllFiltered: boolean
  allFilteredCount: number | null
  totalFiltered: number
  pipelines: Pipeline[]
  stages: Stage[]
  onMove: (pipelineId: string, stageId: string) => Promise<void>
  onClearSelection: () => void
  onSelectAllFiltered: (filters: Omit<GetLeadsParams, 'page' | 'limit'>) => Promise<void>
  currentFilters: Omit<GetLeadsParams, 'page' | 'limit'>
}

const BULK_CONFIRM_THRESHOLD = 50

export function BulkActionsBar({
  selectedCount,
  isProcessing,
  progress,
  isSelectAllFiltered,
  allFilteredCount,
  totalFiltered,
  pipelines,
  stages,
  onMove,
  onClearSelection,
  onSelectAllFiltered,
  currentFilters
}: BulkActionsBarProps) {
  const [targetPipelineId, setTargetPipelineId] = useState('')
  const [targetStageId, setTargetStageId] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const activePipelines = useMemo(
    () => pipelines.filter(p => p.active !== false),
    [pipelines]
  )

  const filteredStages = useMemo(
    () => stages
      .filter(s => s.pipeline_id === targetPipelineId)
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [stages, targetPipelineId]
  )

  const handlePipelineChange = (pipelineId: string) => {
    setTargetPipelineId(pipelineId)
    setTargetStageId('')
  }

  const handleMoveClick = () => {
    if (selectedCount >= BULK_CONFIRM_THRESHOLD) {
      setShowConfirm(true)
    } else {
      handleConfirmMove()
    }
  }

  const handleConfirmMove = async () => {
    setShowConfirm(false)
    await onMove(targetPipelineId, targetStageId)
    setTargetPipelineId('')
    setTargetStageId('')
  }

  const canMove = targetPipelineId && targetStageId && !isProcessing

  if (selectedCount === 0) return null

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
      {/* Barra de progresso durante processamento */}
      {isProcessing && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-700 font-medium">
              Movendo leads... {progress.current}/{progress.total}
            </span>
            <span className="text-orange-600 text-xs">{progressPercent}%</span>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Conteudo principal */}
      {!isProcessing && (
        <>
          {/* Linha 1: contagem + limpar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-orange-800">
                {selectedCount} lead{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
              </span>

              {/* Link para selecionar todos do filtro */}
              {!isSelectAllFiltered && totalFiltered > selectedCount && (
                <button
                  onClick={() => onSelectAllFiltered(currentFilters)}
                  className="text-xs text-orange-600 hover:text-orange-800 underline transition-colors"
                >
                  Selecionar todos os {totalFiltered} do filtro
                </button>
              )}

              {isSelectAllFiltered && allFilteredCount !== null && (
                <span className="text-xs text-orange-600">
                  (todos os {allFilteredCount} do filtro)
                </span>
              )}
            </div>

            <button
              onClick={onClearSelection}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              Limpar
            </button>
          </div>

          {/* Linha 2: selects + botao mover */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">Mover para:</span>

            <select
              value={targetPipelineId}
              onChange={e => handlePipelineChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            >
              <option value="">Pipeline...</option>
              {activePipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={targetStageId}
              onChange={e => setTargetStageId(e.target.value)}
              disabled={!targetPipelineId}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Etapa...</option>
              {filteredStages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button
              onClick={handleMoveClick}
              disabled={!canMove}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightIcon className="w-4 h-4" />
              Mover
            </button>
          </div>

          {/* Modal de confirmacao inline */}
          {showConfirm && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800 flex-1">
                Você está prestes a mover <strong>{selectedCount} leads</strong>. Deseja continuar?
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmMove}
                  className="px-3 py-1 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
