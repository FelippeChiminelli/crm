import { supabase } from './supabaseClient'
import type { Pipeline } from '../types'
import SecureLogger from '../utils/logger'

// Importar função centralizada
import { getUserEmpresaId } from './authService'
import { getUserPipelinePermissions } from './pipelinePermissionService'

// Validação de dados de pipeline
function validatePipelineData(data: Omit<Pipeline, 'id' | 'created_at'>): void {
  if (!data.name?.trim()) {
    throw new Error('Nome do pipeline é obrigatório')
  }
  
  if (data.name.length > 100) {
    throw new Error('Nome do pipeline não pode ter mais de 100 caracteres')
  }
  
  if (data.description && data.description.length > 500) {
    throw new Error('Descrição do pipeline não pode ter mais de 500 caracteres')
  }
}

export async function getPipelines(includeStages: boolean = false): Promise<{ data: Pipeline[]; error: null } | { data: null; error: any }> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      return { data: [] as Pipeline[], error: null }
    }

    // Verificar se o usuário atual é admin e suas permissões
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [] as Pipeline[], error: null }
    }

    // Buscar o perfil para verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('uuid', user.id)
      .single()

    const isAdmin = profile?.is_admin || false

    // Buscar todos os pipelines da empresa ordenados por display_order
    let pipelinesData: Pipeline[] = []
    
    if (includeStages) {
      // Query com stages
      const { data, error } = await supabase
        .from('pipelines')
        .select('*, stages(id, name, color, position)')
        .eq('active', true)
        .eq('empresa_id', empresaId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
      
      if (error) {
        return { data: null, error }
      }
      
      // Ordenar stages por position
      pipelinesData = (data as any[] || []).map((pipeline: any) => {
        if (pipeline.stages) {
          pipeline.stages.sort((a: any, b: any) => a.position - b.position)
        }
        return pipeline as Pipeline
      })
    } else {
      // Query simples sem stages
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('active', true)
        .eq('empresa_id', empresaId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
      
      if (error) {
        return { data: null, error }
      }
      
      pipelinesData = (data || []) as Pipeline[]
    }

    // Se é admin, retorna todos os pipelines
    if (isAdmin) {
      SecureLogger.log(`🔍 Pipelines carregados para ADMIN:`, pipelinesData.length)
      return { data: pipelinesData, error: null }
    }

    // Se não é admin, filtrar baseado nas permissões
    const { data: allowedPipelineIds } = await getUserPipelinePermissions(user.id)
    
    if (!allowedPipelineIds) {
      SecureLogger.log('⚠️ Nenhuma permissão encontrada para VENDEDOR')
      return { data: [] as Pipeline[], error: null }
    }

    // Regra atualizada: lista vazia significa NENHUM acesso para não-admin
    if (allowedPipelineIds.length === 0) {
      SecureLogger.log('🔒 VENDEDOR sem permissões de pipeline - retornando lista vazia')
      return { data: [] as Pipeline[], error: null }
    }

    // Filtrar pipelines baseado nas permissões
    const filteredPipelines = pipelinesData.filter(pipeline => 
      allowedPipelineIds.includes(pipeline.id)
    )

    SecureLogger.log(`🔍 Pipelines carregados para VENDEDOR (${allowedPipelineIds.length} permitidos):`, filteredPipelines.length)
    
    return { data: filteredPipelines, error: null }
  } catch (error) {
    SecureLogger.error('❌ getPipelines: Erro:', error)
    throw error
  }
}

/**
 * Buscar TODOS os pipelines da empresa sem filtro de permissões
 * Usado para permitir vendedores transferirem leads para outros pipelines
 */
export async function getAllPipelinesForTransfer() {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      return { data: [], error: null }
    }

    // Buscar TODOS os pipelines da empresa, sem filtro de permissões
    const result = await supabase
      .from('pipelines')
      .select('*')
      .eq('active', true)
      .eq('empresa_id', empresaId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (result.error) {
      SecureLogger.error('❌ getAllPipelinesForTransfer: Erro:', result.error)
      return result
    }

    SecureLogger.log(`🔄 Pipelines disponíveis para transferência:`, result.data?.length || 0)
    return result
  } catch (error) {
    SecureLogger.error('❌ getAllPipelinesForTransfer: Erro:', error)
    throw error
  }
}

export async function getPipelineById(id: string) {
  if (!id?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  return supabase
    .from('pipelines')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
}

export async function createPipeline(data: Omit<Pipeline, 'id' | 'created_at'>) {
  validatePipelineData(data)
  
  const empresaId = await getUserEmpresaId()
  
  const pipelineData = {
    ...data,
    empresa_id: empresaId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    active: data.active !== undefined ? data.active : true
  }
  
  return supabase
    .from('pipelines')
    .insert([pipelineData])
    .select()
    .single()
}

export async function updatePipeline(id: string, data: Partial<Omit<Pipeline, 'id' | 'created_at'>>) {
  if (!id?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  // Validar se o pipeline pertence à empresa do usuário
  const { data: existingPipeline, error: checkError } = await supabase
    .from('pipelines')
    .select('id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (checkError || !existingPipeline) {
    throw new Error('Pipeline não encontrado ou não pertence à sua empresa')
  }
  
  // Sanitizar dados de entrada
  const sanitizedData: any = {}
  
  if (data.name !== undefined) {
    if (!data.name?.trim()) {
      throw new Error('Nome do pipeline é obrigatório')
    }
    if (data.name.length > 100) {
      throw new Error('Nome do pipeline não pode ter mais de 100 caracteres')
    }
    sanitizedData.name = data.name.trim()
  }
  
  if (data.description !== undefined) {
    if (data.description && data.description.length > 500) {
      throw new Error('Descrição do pipeline não pode ter mais de 500 caracteres')
    }
    sanitizedData.description = data.description?.trim() || null
  }
  
  if (data.active !== undefined) {
    sanitizedData.active = data.active
  }
  
  return supabase
    .from('pipelines')
    .update(sanitizedData)
    .eq('id', id)
    .eq('empresa_id', empresaId)
}

export async function deletePipeline(id: string) {
  if (!id?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  return supabase
    .from('pipelines')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)
}

// Nova função para criar pipeline com etapas
interface StageData {
  id?: string
  name: string
  tempId?: string
}

export interface PipelineWithStagesData {
  name: string
  description: string
  stages: StageData[]
  card_visible_fields?: string[]
  responsavel_id?: string | null
  show_sold_leads?: boolean
  show_lost_leads?: boolean
  require_stage_change_notes?: boolean
  stage_change_form_fields?: string[]
}

// Validação de dados de etapa
function validateStageData(stage: StageData): void {
  if (!stage.name?.trim()) {
    throw new Error('Nome da etapa é obrigatório')
  }
  
  if (stage.name.length > 50) {
    throw new Error('Nome da etapa não pode ter mais de 50 caracteres')
  }
}

export async function createPipelineWithStages(data: PipelineWithStagesData) {
  try {
    // Validar dados de entrada
    if (!data.name?.trim()) {
      throw new Error('Nome do pipeline é obrigatório')
    }
    
    if (data.name.length > 100) {
      throw new Error('Nome do pipeline não pode ter mais de 100 caracteres')
    }
    
    if (data.description && data.description.length > 500) {
      throw new Error('Descrição do pipeline não pode ter mais de 500 caracteres')
    }
    
    if (!data.stages || data.stages.length === 0) {
      throw new Error('Pelo menos uma etapa é obrigatória')
    }
    
    // Validar todas as etapas
    data.stages.forEach(validateStageData)
    
    const empresaId = await getUserEmpresaId()

    // 1. Criar o pipeline primeiro
    const pipelineData: any = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      active: true,
      empresa_id: empresaId
    }

    // Adicionar campos visíveis se fornecidos, senão usar padrão
    if (data.card_visible_fields !== undefined) {
      pipelineData.card_visible_fields = data.card_visible_fields
    } else {
      // Campos padrão
      pipelineData.card_visible_fields = ['company', 'value', 'phone', 'email', 'status', 'origin', 'created_at']
    }

    // Adicionar responsável se fornecido
    if ('responsavel_id' in data) {
      pipelineData.responsavel_id = data.responsavel_id || null
    }

    const { data: newPipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert([pipelineData])
      .select()
      .single()

    if (pipelineError) {
      throw pipelineError
    }

    // 2. Criar as etapas
    const stagesData = data.stages.map((stage, index) => ({
      pipeline_id: newPipeline.id,
      name: stage.name.trim(),
      color: '#f97316', // Cor padrão
      position: index,
      empresa_id: empresaId
    }))

    const { data: newStages, error: stagesError } = await supabase
      .from('stages')
      .insert(stagesData)
      .select()

    if (stagesError) {
      // Rollback: deletar o pipeline criado
      await supabase
        .from('pipelines')
        .delete()
        .eq('id', newPipeline.id)
        .eq('empresa_id', empresaId)
      
      throw stagesError
    }

    return {
      data: {
        pipeline: newPipeline,
        stages: newStages
      },
      error: null
    }

  } catch (error) {
    return {
      data: null,
      error
    }
  }
}

// Nova função para atualizar pipeline com etapas
export async function updatePipelineWithStages(pipelineId: string, data: PipelineWithStagesData) {
  try {
    if (!pipelineId?.trim()) {
      throw new Error('Pipeline ID é obrigatório')
    }
    
    // Validar dados de entrada
    if (!data.name?.trim()) {
      throw new Error('Nome do pipeline é obrigatório')
    }
    
    if (data.name.length > 100) {
      throw new Error('Nome do pipeline não pode ter mais de 100 caracteres')
    }
    
    if (data.description && data.description.length > 500) {
      throw new Error('Descrição do pipeline não pode ter mais de 500 caracteres')
    }
    
    if (!data.stages || data.stages.length === 0) {
      throw new Error('Pelo menos uma etapa é obrigatória')
    }
    
    // Validar todas as etapas
    data.stages.forEach(validateStageData)
    
    const empresaId = await getUserEmpresaId()

    // 1. Atualizar o pipeline
    const pipelineData: any = {
      name: data.name.trim(),
      description: data.description?.trim() || null
    }

    // Adicionar campos visíveis se fornecidos
    if (data.card_visible_fields !== undefined) {
      pipelineData.card_visible_fields = data.card_visible_fields
    }

    // Adicionar responsável se fornecido
    if ('responsavel_id' in data) {
      pipelineData.responsavel_id = data.responsavel_id || null
    }

    // Adicionar configurações de visibilidade se fornecidas
    if ('show_sold_leads' in data) {
      pipelineData.show_sold_leads = data.show_sold_leads ?? false
    }
    if ('show_lost_leads' in data) {
      pipelineData.show_lost_leads = data.show_lost_leads ?? false
    }

    // Adicionar configurações de formulário de mudança de estágio
    if ('require_stage_change_notes' in data) {
      pipelineData.require_stage_change_notes = data.require_stage_change_notes ?? false
    }
    if ('stage_change_form_fields' in data) {
      pipelineData.stage_change_form_fields = data.stage_change_form_fields || null
    }

    const { data: updatedPipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .update(pipelineData)
      .eq('id', pipelineId)
      .eq('empresa_id', empresaId)
      .select()
      .single()

    if (pipelineError) {
      throw pipelineError
    }

    // 2. Gerenciar etapas
    // Primeiro, buscar as etapas existentes
    const { data: existingStages } = await supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('empresa_id', empresaId)

    const existingStageIds = (existingStages || []).map(stage => stage.id)
    const newStageIds = data.stages.filter(stage => !stage.tempId).map(stage => stage.id)
    const stagesToDelete = existingStageIds.filter(id => !newStageIds.includes(id))
    const stagesToUpdate = data.stages.filter(stage => !stage.tempId && existingStageIds.includes(stage.id))
    const stagesToCreate = data.stages.filter(stage => stage.tempId)

    // 3. Deletar etapas removidas
    if (stagesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('stages')
        .delete()
        .in('id', stagesToDelete)
        .eq('empresa_id', empresaId)

      if (deleteError) {
        throw deleteError
      }
    }

    // 4. Atualizar etapas existentes
    for (let i = 0; i < stagesToUpdate.length; i++) {
      const stage = stagesToUpdate[i]
      
      const { error: updateError } = await supabase
        .from('stages')
        .update({
          name: stage.name.trim(),
          position: data.stages.findIndex(s => s.id === stage.id)
        })
        .eq('id', stage.id)
        .eq('empresa_id', empresaId)

      if (updateError) {
        throw updateError
      }
    }

    // 5. Criar novas etapas
    if (stagesToCreate.length > 0) {
      const newStagesData = stagesToCreate.map((stage) => ({
        pipeline_id: pipelineId,
        name: stage.name.trim(),
        color: '#f97316',
        position: data.stages.findIndex(s => s.tempId === stage.tempId),
        empresa_id: empresaId
      }))

      const { error: createError } = await supabase
        .from('stages')
        .insert(newStagesData)

      if (createError) {
        throw createError
      }
    }

    // 6. Buscar etapas atualizadas
    const { data: finalStages } = await supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('empresa_id', empresaId)
      .order('position')

    return {
      data: {
        pipeline: updatedPipeline,
        stages: finalStages || []
      },
      error: null
    }

  } catch (error) {
    SecureLogger.error('Erro ao atualizar pipeline com etapas:', error)
    return {
      data: null,
      error
    }
  }
}

// Nova função para reordenar pipelines
export async function updatePipelinesOrder(pipelineOrders: { id: string; display_order: number }[]) {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      throw new Error('Empresa ID é obrigatório')
    }

    // Atualizar cada pipeline com sua nova ordem
    const updates = pipelineOrders.map(({ id, display_order }) =>
      supabase
        .from('pipelines')
        .update({ display_order })
        .eq('id', id)
        .eq('empresa_id', empresaId)
    )

    await Promise.all(updates)

    return { error: null }
  } catch (error) {
    SecureLogger.error('Erro ao atualizar ordem dos pipelines:', error)
    return { error }
  }
} 