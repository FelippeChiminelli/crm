import { useState, useMemo, useRef, useCallback } from 'react'
import { ArrowRightIcon, XMarkIcon, ExclamationTriangleIcon, TagIcon, PlusIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import type { Pipeline, Stage } from '../../types'
import type { BulkProgress } from '../../hooks/useBulkLeadActions'
import type { GetLeadsParams } from '../../services/leadService'
import { ds } from '../../utils/designSystem'

type BulkActionType = '' | 'move' | 'tags' | 'origin'

interface BulkActionsBarProps {
  selectedCount: number
  isProcessing: boolean
  progress: BulkProgress | null
  isSelectAllFiltered: boolean
  allFilteredCount: number | null
  totalFiltered: number
  pipelines: Pipeline[]
  stages: Stage[]
  availableTags: string[]
  availableOrigins: string[]
  onMove: (pipelineId: string, stageId: string) => Promise<void>
  onAddTags: (tags: string[]) => Promise<void>
  onUpdateOrigin: (origin: string) => Promise<void>
  onClearSelection: () => void
  onSelectAllFiltered: (filters: Omit<GetLeadsParams, 'page' | 'limit'>) => Promise<void>
  currentFilters: Omit<GetLeadsParams, 'page' | 'limit'>
}

const BULK_CONFIRM_THRESHOLD = 50

const KNOWN_ORIGINS: { value: string; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'redes_sociais', label: 'Redes Sociais' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'Email' },
  { value: 'evento', label: 'Evento' },
  { value: 'outros', label: 'Outros' },
]

export function BulkActionsBar({
  selectedCount,
  isProcessing,
  progress,
  isSelectAllFiltered,
  allFilteredCount,
  totalFiltered,
  pipelines,
  stages,
  availableTags,
  availableOrigins,
  onMove,
  onAddTags,
  onUpdateOrigin,
  onClearSelection,
  onSelectAllFiltered,
  currentFilters
}: BulkActionsBarProps) {
  const [selectedAction, setSelectedAction] = useState<BulkActionType>('')
  const [processingLabel, setProcessingLabel] = useState('Processando...')

  // Estado: Mover
  const [targetPipelineId, setTargetPipelineId] = useState('')
  const [targetStageId, setTargetStageId] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  // Estado: Tags
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagConfirm, setShowTagConfirm] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Estado: Origem
  const [selectedOrigin, setSelectedOrigin] = useState('')
  const [customOriginInput, setCustomOriginInput] = useState('')
  const [showOriginConfirm, setShowOriginConfirm] = useState(false)

  const resetActionStates = useCallback(() => {
    setTargetPipelineId('')
    setTargetStageId('')
    setShowConfirm(false)
    setTagsToAdd([])
    setTagInput('')
    setShowTagConfirm(false)
    setSelectedOrigin('')
    setCustomOriginInput('')
    setShowOriginConfirm(false)
  }, [])

  const handleActionChange = (action: BulkActionType) => {
    resetActionStates()
    setSelectedAction(action)
  }

  // --- Mover ---
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
    setProcessingLabel('Movendo leads...')
    await onMove(targetPipelineId, targetStageId)
    setTargetPipelineId('')
    setTargetStageId('')
  }

  const canMove = targetPipelineId && targetStageId && !isProcessing

  // --- Tags ---
  const handleAddTagChip = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || tagsToAdd.includes(trimmed)) return
    setTagsToAdd(prev => [...prev, trimmed])
    setTagInput('')
    tagInputRef.current?.focus()
  }

  const handleRemoveTagChip = (tag: string) => {
    setTagsToAdd(prev => prev.filter(t => t !== tag))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTagChip(tagInput)
    }
  }

  const handleApplyTagsClick = () => {
    if (selectedCount >= BULK_CONFIRM_THRESHOLD) {
      setShowTagConfirm(true)
    } else {
      handleConfirmAddTags()
    }
  }

  const handleConfirmAddTags = async () => {
    setShowTagConfirm(false)
    setProcessingLabel('Adicionando tags...')
    await onAddTags(tagsToAdd)
    setTagsToAdd([])
    setTagInput('')
  }

  const canApplyTags = tagsToAdd.length > 0 && !isProcessing

  const suggestedTags = useMemo(
    () => availableTags.filter(t => !tagsToAdd.includes(t)),
    [availableTags, tagsToAdd]
  )

  // --- Origem ---
  const extraOrigins = useMemo(
    () => availableOrigins.filter(o => !KNOWN_ORIGINS.some(k => k.value === o)),
    [availableOrigins]
  )

  const resolvedOrigin = selectedOrigin === '__custom__' ? customOriginInput.trim() : selectedOrigin
  const canApplyOrigin = !!resolvedOrigin && !isProcessing

  const handleOriginSelectChange = (value: string) => {
    setSelectedOrigin(value)
    if (value !== '__custom__') setCustomOriginInput('')
  }

  const handleApplyOriginClick = () => {
    if (selectedCount >= BULK_CONFIRM_THRESHOLD) {
      setShowOriginConfirm(true)
    } else {
      handleConfirmUpdateOrigin()
    }
  }

  const handleConfirmUpdateOrigin = async () => {
    setShowOriginConfirm(false)
    setProcessingLabel('Alterando origem...')
    await onUpdateOrigin(resolvedOrigin)
    setSelectedOrigin('')
    setCustomOriginInput('')
  }

  if (selectedCount === 0) return null

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
      {isProcessing && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-700 font-medium">
              {processingLabel} {progress.current}/{progress.total}
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

      {!isProcessing && (
        <>
          {/* Contagem + limpar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-orange-800">
                {selectedCount} lead{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
              </span>

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

          {/* Seletor de ação */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">Ação:</span>
            <select
              value={selectedAction}
              onChange={e => handleActionChange(e.target.value as BulkActionType)}
              className={`${ds.input()} w-auto`}
            >
              <option value="">Selecione uma ação...</option>
              <option value="move">Mover para pipeline/etapa</option>
              <option value="tags">Incluir tags</option>
              <option value="origin">Alterar origem</option>
            </select>
          </div>

          {/* Ação: Mover */}
          {selectedAction === 'move' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={targetPipelineId}
                  onChange={e => handlePipelineChange(e.target.value)}
                  className={`${ds.input()} w-auto`}
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
                  className={`${ds.input()} w-auto disabled:opacity-50 disabled:cursor-not-allowed`}
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

              {showConfirm && (
                <ConfirmInline
                  message={<>Você está prestes a mover <strong>{selectedCount} leads</strong>. Deseja continuar?</>}
                  onCancel={() => setShowConfirm(false)}
                  onConfirm={handleConfirmMove}
                />
              )}
            </>
          )}

          {/* Ação: Tags */}
          {selectedAction === 'tags' && (
            <>
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyPress}
                      placeholder="Digite uma tag..."
                      className={`${ds.input()} flex-1 min-w-[120px]`}
                      disabled={isProcessing}
                    />
                    <button
                      onClick={() => handleAddTagChip(tagInput)}
                      disabled={!tagInput.trim() || isProcessing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>

                  {tagsToAdd.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tagsToAdd.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTagChip(tag)}
                            className="hover:text-orange-900 transition-colors"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {suggestedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-gray-400 pt-0.5">Existentes:</span>
                      {suggestedTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleAddTagChip(tag)}
                          disabled={isProcessing}
                          className="px-2 py-0.5 text-xs text-gray-600 bg-gray-100 rounded-full hover:bg-orange-100 hover:text-orange-700 transition-colors disabled:opacity-50"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleApplyTagsClick}
                  disabled={!canApplyTags}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TagIcon className="w-4 h-4" />
                  Aplicar Tags
                </button>
              </div>

              {showTagConfirm && (
                <ConfirmInline
                  message={<>Você está prestes a adicionar {tagsToAdd.length} tag{tagsToAdd.length !== 1 ? 's' : ''} em <strong>{selectedCount} leads</strong>. Deseja continuar?</>}
                  onCancel={() => setShowTagConfirm(false)}
                  onConfirm={handleConfirmAddTags}
                />
              )}
            </>
          )}

          {/* Ação: Origem */}
          {selectedAction === 'origin' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedOrigin}
                  onChange={e => handleOriginSelectChange(e.target.value)}
                  disabled={isProcessing}
                  className={`${ds.input()} w-auto disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">Selecione...</option>
                  {KNOWN_ORIGINS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                  {extraOrigins.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                  <option value="__custom__">Personalizado...</option>
                </select>

                {selectedOrigin === '__custom__' && (
                  <input
                    type="text"
                    value={customOriginInput}
                    onChange={e => setCustomOriginInput(e.target.value)}
                    placeholder="Digite a origem..."
                    className={`${ds.input()} w-auto min-w-[150px]`}
                    disabled={isProcessing}
                  />
                )}

                <button
                  onClick={handleApplyOriginClick}
                  disabled={!canApplyOrigin}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GlobeAltIcon className="w-4 h-4" />
                  Aplicar Origem
                </button>
              </div>

              {showOriginConfirm && (
                <ConfirmInline
                  message={<>Você está prestes a alterar a origem de <strong>{selectedCount} leads</strong> para <strong>{resolvedOrigin}</strong>. Deseja continuar?</>}
                  onCancel={() => setShowOriginConfirm(false)}
                  onConfirm={handleConfirmUpdateOrigin}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function ConfirmInline({ message, onCancel, onConfirm }: {
  message: React.ReactNode
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" />
      <p className="text-sm text-yellow-800 flex-1">{message}</p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
