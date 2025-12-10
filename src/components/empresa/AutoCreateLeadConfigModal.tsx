import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { StyledSelect } from '../ui/StyledSelect'
import { updateInstanceAutoCreateConfig } from '../../services/chatService'
import { getPipelines } from '../../services/pipelineService'
import { getStagesByPipeline } from '../../services/stageService'
import { getEmpresaUsers } from '../../services/empresaService'
import type { WhatsAppInstance, Pipeline, Stage } from '../../types'

interface EmpresaUser {
  uuid: string
  full_name: string
  email: string
  is_admin?: boolean
}

interface AutoCreateLeadConfigModalProps {
  isOpen: boolean
  onClose: () => void
  instance: WhatsAppInstance | null
  onSaved: () => void
}

export function AutoCreateLeadConfigModal({
  isOpen,
  onClose,
  instance,
  onSaved
}: AutoCreateLeadConfigModalProps) {
  const [enabled, setEnabled] = useState(false)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Dados para os selects
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [users, setUsers] = useState<EmpresaUser[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [showConfirmDisable, setShowConfirmDisable] = useState(false)

  // Carregar dados iniciais quando modal abre
  useEffect(() => {
    if (isOpen && instance) {
      console.log('🔍 Modal abrindo com instância:', {
        id: instance.id,
        name: instance.name,
        auto_create_leads: instance.auto_create_leads,
        default_pipeline_id: instance.default_pipeline_id,
        default_stage_id: instance.default_stage_id,
        default_responsible_uuid: instance.default_responsible_uuid
      })
      
      setIsInitializing(true)
      const enabledValue = instance.auto_create_leads || false
      console.log('✅ Setando enabled para:', enabledValue)
      setEnabled(enabledValue)
      setSelectedPipelineId(instance.default_pipeline_id || null)
      setSelectedStageId(instance.default_stage_id || null)
      setSelectedUserId(instance.default_responsible_uuid || null)
      setError(null)
      
      // Carregar dados
      const loadData = async () => {
        try {
          setLoadingData(true)
          
          // Carregar pipelines e usuários em paralelo
          const [pipelinesResult, usersData] = await Promise.all([
            getPipelines(),
            getEmpresaUsers()
          ])
          
          if (pipelinesResult.data) {
            setPipelines(pipelinesResult.data.filter(p => p.active))
          }
          
          setUsers(usersData || [])
          
          // Se já tem pipeline selecionada, carregar stages
          if (instance?.default_pipeline_id) {
            const { data } = await getStagesByPipeline(instance.default_pipeline_id)
            setStages(data || [])
          }
        } catch (err) {
          console.error('Erro ao carregar dados:', err)
        } finally {
          setLoadingData(false)
          setIsInitializing(false)
        }
      }
      
      loadData()
    } else if (!isOpen) {
      // Resetar estados quando modal fecha
      setEnabled(false)
      setSelectedPipelineId(null)
      setSelectedStageId(null)
      setSelectedUserId(null)
      setPipelines([])
      setStages([])
      setUsers([])
      setError(null)
      setIsInitializing(false)
    }
  }, [isOpen, instance])

  // Carregar stages quando pipeline muda (apenas quando usuário muda, não na inicialização)
  useEffect(() => {
    if (!isInitializing && selectedPipelineId) {
      loadStages(selectedPipelineId)
      // Limpar stage selecionado ao mudar pipeline
      setSelectedStageId(null)
    } else if (!isInitializing && !selectedPipelineId) {
      setStages([])
    }
  }, [selectedPipelineId])

  const loadStages = async (pipelineId: string) => {
    try {
      const { data } = await getStagesByPipeline(pipelineId)
      setStages(data || [])
    } catch (err) {
      console.error('Erro ao carregar estágios:', err)
      setStages([])
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  const handleToggleChange = (checked: boolean) => {
    // Se está tentando desativar e estava ativo antes, pedir confirmação
    if (!checked && instance?.auto_create_leads) {
      setShowConfirmDisable(true)
      return
    }
    
    setEnabled(checked)
    if (!checked) {
      // Limpar seleções ao desativar
      setSelectedPipelineId(null)
      setSelectedStageId(null)
      setSelectedUserId(null)
    }
  }

  const confirmDisable = () => {
    setEnabled(false)
    setSelectedPipelineId(null)
    setSelectedStageId(null)
    setSelectedUserId(null)
    setShowConfirmDisable(false)
  }

  const isValid = (): boolean => {
    if (!enabled) {
      // Se desativado, sempre válido
      return true
    }
    // Se ativado, todos os campos são obrigatórios
    return !!(selectedPipelineId && selectedStageId && selectedUserId)
  }

  const handleSave = async () => {
    if (!instance) return
    
    setError(null)

    // Validação
    if (enabled && (!selectedPipelineId || !selectedStageId || !selectedUserId)) {
      setError('Quando a auto-criação está ativada, todos os campos são obrigatórios')
      return
    }

    setSaving(true)
    try {
      await updateInstanceAutoCreateConfig(
        instance.id,
        enabled,
        selectedPipelineId,
        selectedStageId,
        selectedUserId
      )
      onSaved()
    } catch (err) {
      console.error('Erro ao salvar configuração:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Dialog de confirmação de desativação */}
      {showConfirmDisable && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowConfirmDisable(false)}
            />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-orange-100 rounded-full mb-4">
                <svg 
                  className="w-6 h-6 text-orange-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Desativar Auto-Criação?
              </h3>

              <p className="text-sm text-gray-600 text-center mb-6">
                Tem certeza que deseja desativar a auto-criação de leads?<br/><br/>
                Novos contatos não cadastrados não serão mais convertidos automaticamente em leads.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDisable(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDisable}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  Sim, Desativar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Configurar Auto-Criação de Leads
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {instance?.name}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={saving}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Toggle Ativar/Desativar */}
            <div className="flex items-start gap-3">
              <div className="flex items-center h-6">
                <input
                  id="auto-create-toggle"
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => handleToggleChange(e.target.checked)}
                  disabled={saving}
                  className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                />
              </div>
              <div className="flex-1">
                <label 
                  htmlFor="auto-create-toggle" 
                  className="block text-sm font-medium text-gray-900 cursor-pointer"
                >
                  Ativar auto-criação de leads
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Quando ativado, novos leads serão criados automaticamente ao receber mensagens de contatos não cadastrados nesta instância
                </p>
              </div>
            </div>

            {/* Campos de configuração (só aparecem se enabled) */}
            {enabled && (
              <div className="space-y-4 pl-8 border-l-2 border-orange-200">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    <strong>Atenção:</strong> Todos os campos abaixo são obrigatórios quando a auto-criação está ativada.
                  </p>
                </div>

                {/* Pipeline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pipeline <span className="text-red-500">*</span>
                  </label>
                  <StyledSelect
                    options={pipelines.map(p => ({
                      value: p.id,
                      label: p.name,
                      badge: p.active ? 'Ativo' : undefined
                    }))}
                    value={selectedPipelineId || ''}
                    onChange={setSelectedPipelineId}
                    placeholder={loadingData ? 'Carregando...' : 'Selecione uma pipeline'}
                    disabled={saving || loadingData}
                    size="md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pipeline onde os leads serão criados
                  </p>
                </div>

                {/* Estágio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estágio <span className="text-red-500">*</span>
                  </label>
                  <StyledSelect
                    options={stages.map(s => ({
                      value: s.id,
                      label: s.name
                    }))}
                    value={selectedStageId || ''}
                    onChange={setSelectedStageId}
                    placeholder={
                      !selectedPipelineId ? 'Selecione uma pipeline primeiro' :
                      stages.length === 0 ? 'Carregando estágios...' :
                      'Selecione um estágio'
                    }
                    disabled={saving || !selectedPipelineId || stages.length === 0}
                    size="md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Estágio inicial onde os leads serão posicionados
                  </p>
                </div>

                {/* Usuário Responsável */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsável <span className="text-red-500">*</span>
                  </label>
                  <StyledSelect
                    options={users.map(u => ({
                      value: u.uuid,
                      label: u.full_name,
                      badge: u.is_admin ? 'Admin' : undefined
                    }))}
                    value={selectedUserId || ''}
                    onChange={setSelectedUserId}
                    placeholder={loadingData ? 'Carregando...' : 'Selecione um responsável'}
                    disabled={saving || loadingData}
                    size="md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Usuário que será atribuído como responsável pelos leads criados
                  </p>
                </div>
              </div>
            )}

            {/* Mensagem de erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isValid()}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
