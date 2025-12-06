import { useState, useEffect } from 'react'
import { useToastContext } from '../../../contexts/ToastContext'
import { getEmpresaUsers } from '../../../services/empresaService'
import { StageManager } from './StageManager'
import { StyledSelect } from '../../ui/StyledSelect'
import { FunnelIcon, XMarkIcon, SparklesIcon, UserIcon } from '@heroicons/react/24/outline'
import type { PipelineWithStagesData } from '../../../services/pipelineService'

interface StageItem {
  id: string
  name: string
  tempId?: string
}

interface CreatePipelineModalProps {
  isOpen: boolean
  onClose: () => void
  onCreatePipeline: (data: PipelineWithStagesData) => Promise<any>
}

export function CreatePipelineModal({
  isOpen,
  onClose,
  onCreatePipeline
}: CreatePipelineModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [pipelineData, setPipelineData] = useState({
    name: '',
    description: '',
    responsavel_id: '' as string | null
  })
  const [stages, setStages] = useState<StageItem[]>([])
  const [users, setUsers] = useState<any[]>([])
  const { showError, showSuccess } = useToastContext()

  // Carregar usuários da empresa
  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    try {
      const usersData = await getEmpresaUsers()
      setUsers(usersData || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }
  }

  // Reset form quando modal abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      setPipelineData({ name: '', description: '', responsavel_id: null })
      setStages([])
    }
  }, [isOpen])

  const addDefaultStages = () => {
    const defaultStages: StageItem[] = [
      { id: `temp-${Date.now()}-1`, name: 'Prospecção', tempId: `temp-${Date.now()}-1` },
      { id: `temp-${Date.now()}-2`, name: 'Qualificação', tempId: `temp-${Date.now()}-2` },
      { id: `temp-${Date.now()}-3`, name: 'Proposta', tempId: `temp-${Date.now()}-3` },
      { id: `temp-${Date.now()}-4`, name: 'Negociação', tempId: `temp-${Date.now()}-4` },
      { id: `temp-${Date.now()}-5`, name: 'Fechamento', tempId: `temp-${Date.now()}-5` }
    ]
    setStages(defaultStages)
  }

  const handleSubmit = async () => {
    if (!pipelineData.name.trim()) {
      showError('Nome do funil é obrigatório')
      return
    }

    if (stages.length === 0) {
      showError('Adicione pelo menos uma etapa ao funil')
      return
    }

    // Validar se todas as etapas têm nome
    const invalidStages = stages.filter(stage => !stage.name.trim())
    if (invalidStages.length > 0) {
      showError('Todas as etapas devem ter um nome')
      return
    }

    setSubmitting(true)
    try {
      const pipelineWithStages = {
        ...pipelineData,
        stages
      }

      await onCreatePipeline(pipelineWithStages)
      
      // Reset form após sucesso
      setPipelineData({ name: '', description: '', responsavel_id: null })
      setStages([])
      onClose()
      showSuccess('Funil criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar pipeline:', error)
      showError('Erro ao criar funil. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-[9999] p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <SparklesIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Criar Novo Funil</h3>
                <p className="text-sm text-gray-600">Configure seu processo de vendas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/50"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-r from-primary-400 to-primary-400 mb-4">
              <FunnelIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Criar Novo Funil
            </h3>
            <p className="text-sm text-gray-500">
              Configure um funil personalizado para organizar seus leads
            </p>
          </div>

          {/* Dados básicos */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Funil *
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                value={pipelineData.name}
                onChange={(e) => setPipelineData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Vendas B2B, Leads Inbound, Atendimento..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (opcional)
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={pipelineData.description}
                onChange={(e) => setPipelineData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva brevemente o propósito deste funil..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  <span>Responsável pelo Funil</span>
                </div>
              </label>
              <StyledSelect
                value={pipelineData.responsavel_id || ''}
                onChange={(value) => setPipelineData(prev => ({ 
                  ...prev, 
                  responsavel_id: value || null 
                }))}
                options={[
                  { value: '', label: 'Nenhum responsável' },
                  ...users.map((user) => ({
                    value: user.uuid,
                    label: user.full_name,
                    badge: user.is_admin ? 'Admin' : 'Vendedor'
                  }))
                ]}
                placeholder="Selecione um responsável"
                size="lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 O responsável será usado no roteamento automático de leads
              </p>
            </div>
          </div>

          {/* Etapas */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Etapas do Funil</h4>
                <p className="text-sm text-gray-500">
                  Configure as etapas do seu processo de vendas
                </p>
              </div>
              {stages.length === 0 && (
                <button
                  type="button"
                  onClick={addDefaultStages}
                  className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-500 text-white rounded-lg hover:from-primary-600 hover:to-primary-600 flex items-center gap-2 font-medium"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Usar Modelo Padrão
                </button>
              )}
            </div>

            <StageManager 
              stages={stages}
              onStagesChange={setStages}
              isEditing={false}
            />
          </div>

          {/* Dica para novos usuários */}
          {stages.length === 0 && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex gap-3">
                <SparklesIcon className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary-900 mb-1"> Primeira vez criando um funil?</p>
                  <p className="text-primary-700">
                    Clique em "Usar Modelo Padrão" para começar com etapas prontas ou 
                    adicione suas próprias etapas personalizadas.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="text-sm text-gray-600">
              {stages.length > 0 ? (
                <span className="font-medium text-green-600">
                  ✓ {stages.length} etapa(s) configurada(s)
                </span>
              ) : (
                <span>Configure pelo menos uma etapa para continuar</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !pipelineData.name.trim() || stages.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-500 text-white rounded-lg hover:from-primary-600 hover:to-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    Criar Funil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 