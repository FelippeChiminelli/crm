import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import type { Pipeline, Stage } from '../../types'
import { ds } from '../../utils/designSystem'
import { getStagesByPipeline } from '../../services/stageService'

interface LeadsFiltersProps {
  searchTerm: string
  selectedPipeline: string
  selectedStage: string
  selectedStatus: string
  selectedDate: string
  pipelines: Pipeline[]
  stages: Stage[]
  onApplyFilters: (filters: {
    search: string
    pipeline: string
    stage: string
    status: string
    date: string
  }) => void
  onClearFilters: () => void
}

export function LeadsFilters({
  searchTerm,
  selectedPipeline,
  selectedStage,
  selectedStatus,
  selectedDate,
  pipelines,
  stages,
  onApplyFilters,
  onClearFilters
}: LeadsFiltersProps) {
  // Estados locais para os filtros
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [localSelectedPipeline, setLocalSelectedPipeline] = useState(selectedPipeline)
  const [localSelectedStage, setLocalSelectedStage] = useState(selectedStage)
  const [localSelectedStatus, setLocalSelectedStatus] = useState(selectedStatus)
  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate)
  
  // Estado local para stages (para carregar baseado no pipeline local)
  const [localStages, setLocalStages] = useState<Stage[]>(stages)

  // Sincronizar estados locais quando props mudarem (ex: ao limpar filtros)
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
    setLocalSelectedPipeline(selectedPipeline)
    setLocalSelectedStage(selectedStage)
    setLocalSelectedStatus(selectedStatus)
    setLocalSelectedDate(selectedDate)
    setLocalStages(stages)
  }, [searchTerm, selectedPipeline, selectedStage, selectedStatus, selectedDate, stages])

  // Carregar stages quando pipeline local mudar
  useEffect(() => {
    async function fetchStages() {
      if (!localSelectedPipeline) {
        setLocalStages([])
        return
      }
      
      try {
        const { data: stagesData, error: stagesError } = await getStagesByPipeline(localSelectedPipeline)
        if (stagesError) throw new Error(stagesError.message)
        setLocalStages(stagesData || [])
      } catch (err) {
        console.error('Erro ao carregar stages para filtros:', err)
        setLocalStages([])
      }
    }
    fetchStages()
  }, [localSelectedPipeline])

  // Limpar stage quando pipeline mudar
  const handlePipelineChange = (value: string) => {
    setLocalSelectedPipeline(value)
    setLocalSelectedStage('') // Limpar stage quando pipeline muda
  }

  // Aplicar filtros
  const handleApplyFilters = () => {
    onApplyFilters({
      search: localSearchTerm,
      pipeline: localSelectedPipeline,
      stage: localSelectedStage,
      status: localSelectedStatus,
      date: localSelectedDate
    })
  }

  // Limpar filtros
  const handleClearFilters = () => {
    setLocalSearchTerm('')
    setLocalSelectedPipeline('')
    setLocalSelectedStage('')
    setLocalSelectedStatus('')
    setLocalSelectedDate('')
    onClearFilters()
  }

  return (
    <div className={`${ds.card()}`} style={{ padding: '12px 16px' }}>
      {/* Linha única - Pesquisa, Filtros e Botão */}
      <div className="flex flex-col lg:flex-row gap-2 lg:items-end">
        {/* Campo de Pesquisa */}
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Pesquisar
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, empresa, email ou telefone..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className={`${ds.input()} text-sm py-1.5 pl-8 h-9`}
            />
          </div>
        </div>

        {/* Filtros em linha */}
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          {/* Filtro por Pipeline */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Funil
            </label>
            <select
              value={localSelectedPipeline}
              onChange={(e) => handlePipelineChange(e.target.value)}
              className={`${ds.input()} text-sm py-1.5 h-9`}
            >
              <option value="">Todos os funis</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Etapa */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Etapa
            </label>
            <select
              value={localSelectedStage}
              onChange={(e) => setLocalSelectedStage(e.target.value)}
              className={`${ds.input()} text-sm py-1.5 h-9`}
              disabled={!localSelectedPipeline}
            >
              <option value="">Todas as etapas</option>
              {localStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Status
            </label>
            <select
              value={localSelectedStatus}
              onChange={(e) => setLocalSelectedStatus(e.target.value)}
              className={`${ds.input()} text-sm py-1.5 h-9`}
            >
              <option value="">Todos os status</option>
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </select>
          </div>

          {/* Filtro por Data */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Data de Criação
            </label>
            <input
              type="date"
              value={localSelectedDate}
              onChange={(e) => setLocalSelectedDate(e.target.value)}
              className={`${ds.input()} text-sm py-1.5 h-9`}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-end gap-2">
          <button
            onClick={handleApplyFilters}
            className={`${ds.button('primary')} text-sm py-1.5 px-4 h-9 flex items-center gap-2`}
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Filtrar</span>
          </button>
          
          <button
            onClick={handleClearFilters}
            className={`${ds.button('ghost')} text-sm py-1.5 px-3 h-9`}
          >
            <XMarkIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </div>
    </div>
  )
} 