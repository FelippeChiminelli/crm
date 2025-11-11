import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import type { Pipeline } from '../../../types'
import { useLeadForm } from '../../../hooks/useLeadForm'
import { LeadBasicInfoForm } from '../../leads/forms/LeadBasicInfoForm'
import { LeadCustomFieldsForm } from '../../leads/forms/LeadCustomFieldsForm'
import { getAllPipelinesForTransfer } from '../../../services/pipelineService'

interface NewLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (leadData: any, customFieldValues: Record<string, any>) => Promise<any>
  pipelines: Pipeline[]
  onLeadCreated?: (lead: any) => void
  defaultPipelineId?: string
  defaultStageId?: string
}

export function NewLeadModal({
  isOpen,
  onClose,
  onSubmit,
  pipelines,
  onLeadCreated,
  defaultPipelineId,
  defaultStageId
}: NewLeadModalProps) {
  
  // Estado para armazenar TODOS os pipelines (sem filtro de permissão)
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([])
  
  // Usar o hook do formulário
  const {
    leadData,
    customFieldValues,
    availableStages,
    loadingStages,

    updateLeadData,
    updateCustomFieldValues,
    handlePipelineChange,
    handleSubmit,
    resetForm,
    submitting,
    error,
    success
  } = useLeadForm({
    onSubmit,
    onSuccess: (lead) => {
      onLeadCreated?.(lead)
      resetForm()
      onClose()
    },
    onError: (error) => {
      console.error('Erro ao criar lead:', error)
    }
  })

  // Carregar TODOS os pipelines quando o modal abrir (sem filtro de permissão)
  useEffect(() => {
    const loadAllPipelines = async () => {
      if (isOpen) {
        try {
          const { data: allPipelinesData, error } = await getAllPipelinesForTransfer()
          if (error) {
            console.error('Erro ao carregar pipelines:', error)
            // Em caso de erro, usar pipelines da prop (com permissão)
            setAllPipelines(pipelines)
          } else {
            setAllPipelines(allPipelinesData || [])
            console.log('🔄 Pipelines carregados para criação de lead:', allPipelinesData?.length || 0)
          }
        } catch (err) {
          console.error('Erro ao carregar pipelines:', err)
          // Em caso de erro, usar pipelines da prop (com permissão)
          setAllPipelines(pipelines)
        }
      }
    }

    loadAllPipelines()
  }, [isOpen, pipelines])

  // Sincronizar pipeline/stage padrão quando o modal abrir ou quando os defaults mudarem
  useEffect(() => {
    if (!isOpen) return
    if (defaultPipelineId && defaultPipelineId !== leadData.pipeline_id) {
      updateLeadData({ pipeline_id: defaultPipelineId, stage_id: defaultStageId || '' })
    } else if (defaultStageId && defaultStageId !== leadData.stage_id) {
      updateLeadData({ stage_id: defaultStageId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultPipelineId, defaultStageId])

  // Handler para fechar modal
  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserIcon className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Criar Novo Lead</h3>
              <p className="text-sm text-gray-600">Adicione um novo lead ao seu funil de vendas</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form engloba conteúdo e footer para que o submit funcione */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Content - Scrollável */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-6">
            {/* Mensagens de erro/sucesso */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {/* Seção: Informações Básicas */}
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-orange-600" />
                Informações Básicas
              </h4>
              <LeadBasicInfoForm
                leadData={leadData}
                onLeadDataChange={updateLeadData}
                pipelines={allPipelines.length > 0 ? allPipelines : pipelines}
                availableStages={availableStages}
                loadingStages={loadingStages}
                onPipelineChange={handlePipelineChange}
              />
            </div>

            {/* Seção: Campos Personalizados */}
            <div className="bg-orange-50 rounded-lg p-4">
              <LeadCustomFieldsForm
                pipelineId={leadData.pipeline_id || null}
                customFieldValues={customFieldValues}
                onCustomFieldValuesChange={updateCustomFieldValues}
              />
            </div>
          </div>

          {/* Footer - Sempre visível dentro do form */}
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !leadData.name || !leadData.pipeline_id || !leadData.stage_id}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}