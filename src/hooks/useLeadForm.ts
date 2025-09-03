import { useState, useEffect, useCallback } from 'react'
import type { CreateLeadData } from '../services/leadService'
import type { Stage } from '../types'
import { getStagesByPipeline } from '../services/stageService'
import { validateBrazilianPhone } from '../utils/validations'
import { useAsyncOperation } from './useGenericCrud'

interface UseLeadFormProps {
  onSubmit: (data: CreateLeadData, customFieldValues: Record<string, any>) => Promise<any>
  onSuccess?: (lead: any) => void
  onError?: (error: any) => void
}

interface UseLeadFormReturn {
  // Estados
  leadData: CreateLeadData
  customFieldValues: Record<string, any>
  availableStages: Stage[]
  loadingStages: boolean
  formErrors: Record<string, string>
  
  // Operações
  updateLeadData: (data: Partial<CreateLeadData>) => void
  updateCustomFieldValues: (values: Record<string, any>) => void
  handlePipelineChange: (pipelineId: string) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  validateForm: () => boolean
  resetForm: () => void
  
  // Estados de loading
  submitting: boolean
  error: string | null
  success: string | null
}

const initialLeadData: CreateLeadData = {
  pipeline_id: '',
  stage_id: '',
  name: '',
  company: '',
  email: '',
  phone: '',
  value: undefined,
  origin: '',
  notes: ''
}

export function useLeadForm({
  onSubmit,
  onSuccess,
  onError
}: UseLeadFormProps): UseLeadFormReturn {
  
  // Estados principais
  const [leadData, setLeadData] = useState<CreateLeadData>(initialLeadData)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [availableStages, setAvailableStages] = useState<Stage[]>([])
  const [loadingStages, setLoadingStages] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Hook para operação assíncrona
  const {
    loading: submitting,
    error,
    success,
    execute
  } = useAsyncOperation({
    onSuccess,
    onError,
    successMessage: 'Lead criado com sucesso!',
    errorMessage: 'Erro ao criar lead'
  })

  // Carregar stages quando pipeline mudar
  useEffect(() => {
    if (leadData.pipeline_id) {
      loadStages(leadData.pipeline_id)
    } else {
      setAvailableStages([])
    }
  }, [leadData.pipeline_id])

  // Função para carregar stages
  const loadStages = async (pipelineId: string) => {
    setLoadingStages(true)
    try {
      const { data: stages, error } = await getStagesByPipeline(pipelineId)
      
      if (error) {
        throw error
      }
      
      setAvailableStages(stages || [])
      
      // Se não há stage selecionado, selecionar o primeiro
      if (!leadData.stage_id && stages && stages.length > 0) {
        setLeadData(prev => ({ ...prev, stage_id: stages[0].id }))
      }
    } catch (error) {
      console.error('Erro ao carregar stages:', error)
      setAvailableStages([])
    } finally {
      setLoadingStages(false)
    }
  }

  // Atualizar dados do lead
  const updateLeadData = useCallback((data: Partial<CreateLeadData>) => {
    setLeadData(prev => ({ ...prev, ...data }))
    
    // Limpar erros relacionados aos campos atualizados
    const updatedFields = Object.keys(data)
    setFormErrors(prev => {
      const newErrors = { ...prev }
      updatedFields.forEach(field => {
        delete newErrors[field]
      })
      return newErrors
    })
  }, [])

  // Atualizar valores dos campos personalizados
  const updateCustomFieldValues = useCallback((values: Record<string, any>) => {
    setCustomFieldValues(values)
  }, [])

  // Handler para mudança de pipeline
  const handlePipelineChange = useCallback((pipelineId: string) => {
    setLeadData(prev => ({
      ...prev,
      pipeline_id: pipelineId,
      stage_id: '' // Reset stage quando pipeline muda
    }))
  }, [])

  // Validar formulário
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    // Campos obrigatórios
    if (!leadData.name.trim()) {
      errors.name = 'Nome é obrigatório'
    }

    if (!leadData.pipeline_id) {
      errors.pipeline_id = 'Pipeline é obrigatório'
    }

    if (!leadData.stage_id) {
      errors.stage_id = 'Etapa é obrigatória'
    }

    // Validar email se fornecido
    if (leadData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(leadData.email)) {
        errors.email = 'Email inválido'
      }
    }

    // Validar telefone se fornecido
    if (leadData.phone) {
      const phoneValidation = validateBrazilianPhone(leadData.phone)
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.errors[0]
      }
    }

    // Validar valor se fornecido
    if (leadData.value !== undefined && leadData.value < 0) {
      errors.value = 'Valor deve ser positivo'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [leadData])

  // Handler de submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar formulário
    if (!validateForm()) {
      return
    }

    // Executar operação
    await execute(async () => {
      return await onSubmit(leadData, customFieldValues)
    })
  }, [leadData, customFieldValues, validateForm, execute, onSubmit])

  // Resetar formulário
  const resetForm = useCallback(() => {
    setLeadData(initialLeadData)
    setCustomFieldValues({})
    setFormErrors({})
    setAvailableStages([])
  }, [])

  return {
    // Estados
    leadData,
    customFieldValues,
    availableStages,
    loadingStages,
    formErrors,
    
    // Operações
    updateLeadData,
    updateCustomFieldValues,
    handlePipelineChange,
    handleSubmit,
    validateForm,
    resetForm,
    
    // Estados de loading
    submitting,
    error,
    success
  }
}
