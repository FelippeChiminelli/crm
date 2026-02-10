import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { Lead, Pipeline, Stage } from '../../../types'

interface LeadPageHeaderProps {
  lead: Lead
  isEditing: boolean
  saving: boolean
  onStartEditing: () => void
  onCancelEditing: () => void
  onSave: () => void
  onMarkAsSold: () => void
  onMarkAsLost: () => void
  onReactivate: () => void
  onUnmarkSale: () => void
  stages: Stage[]
  pipelines: Pipeline[]
}

export function LeadPageHeader({
  lead,
  isEditing,
  saving,
  onStartEditing,
  onCancelEditing,
  onSave,
  onMarkAsSold,
  onMarkAsLost,
  onReactivate,
  onUnmarkSale,
  stages,
  pipelines,
}: LeadPageHeaderProps) {
  const navigate = useNavigate()

  const handleGoBack = () => {
    // Se a página foi aberta em nova guia, não há histórico
    if (window.history.length <= 1) {
      // Tenta fechar a guia; se não conseguir, redireciona
      window.close()
      // window.close() pode ser bloqueado pelo navegador, então redireciona como fallback
      navigate('/kanban')
    } else {
      navigate(-1)
    }
  }

  const currentStage = stages.find(s => s.id === lead.stage_id)
  const currentPipeline = pipelines.find(p => p.id === lead.pipeline_id)

  // Status badges
  const isLost = !!lead.loss_reason_category
  const isSold = !!lead.sold_at

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          {/* Lado esquerdo: Voltar + Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={handleGoBack}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Voltar"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {lead.name}
                </h1>
                {/* Status badges */}
                {isSold && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                    Vendido
                  </span>
                )}
                {isLost && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full whitespace-nowrap">
                    Perdido
                  </span>
                )}
                {!isSold && !isLost && lead.status && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full whitespace-nowrap capitalize">
                    {lead.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                {currentPipeline && (
                  <span>{currentPipeline.name}</span>
                )}
                {currentPipeline && currentStage && <span>-</span>}
                {currentStage && (
                  <span className="font-medium" style={{ color: currentStage.color }}>
                    {currentStage.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lado direito: Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={onCancelEditing}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            ) : (
              <>
                {/* Lead normal */}
                {!isLost && !isSold && (
                  <>
                    <button
                      onClick={onStartEditing}
                      className="p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                      title="Editar"
                    >
                      <PencilIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={onMarkAsSold}
                      className="p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                      title="Marcar como vendido"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Vendido</span>
                    </button>
                    <button
                      onClick={onMarkAsLost}
                      className="p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                      title="Marcar como perdido"
                    >
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Perdido</span>
                    </button>
                  </>
                )}

                {/* Lead perdido */}
                {isLost && (
                  <>
                    <button
                      onClick={onStartEditing}
                      className="p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={onReactivate}
                      className="p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                      title="Reativar lead"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Reativar</span>
                    </button>
                  </>
                )}

                {/* Lead vendido */}
                {isSold && (
                  <>
                    <button
                      onClick={onStartEditing}
                      className="p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={onUnmarkSale}
                      className="p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1"
                      title="Desmarcar venda"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Desmarcar Venda</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
