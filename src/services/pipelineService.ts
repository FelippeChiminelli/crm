import { supabase } from './supabaseClient'
import type { Pipeline } from '../types'

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

export async function getPipelines() {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      return { data: [], error: null }
    }

    // Verificar se o usuário atual é admin e suas permissões
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], error: null }
    }

    // Buscar o perfil para verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('uuid', user.id)
      .single()

    const isAdmin = profile?.is_admin || false

    // Buscar todos os pipelines da empresa
    const result = await supabase
      .from('pipelines')
      .select('*')
      .eq('active', true)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    if (result.error) {
      return result
    }

    // Se é admin, retorna todos os pipelines
    if (isAdmin) {
      console.log(`🔍 Pipelines carregados para ADMIN:`, result.data?.length || 0)
      return result
    }

    // Se não é admin, filtrar baseado nas permissões
    const { data: allowedPipelineIds } = await getUserPipelinePermissions(user.id)
    
    if (!allowedPipelineIds) {
      console.log('⚠️ Nenhuma permissão encontrada para VENDEDOR')
      return { data: [], error: null }
    }

    // Regra atualizada: lista vazia significa NENHUM acesso para não-admin
    if (allowedPipelineIds.length === 0) {
      console.log('🔒 VENDEDOR sem permissões de pipeline - retornando lista vazia')
      return { data: [], error: null }
    }

    // Filtrar pipelines baseado nas permissões
    const filteredPipelines = result.data?.filter(pipeline => 
      allowedPipelineIds.includes(pipeline.id)
    ) || []

    console.log(`🔍 Pipelines carregados para VENDEDOR (${allowedPipelineIds.length} permitidos):`, filteredPipelines.length)
    
    return { data: filteredPipelines, error: null }
  } catch (error) {
    console.error('❌ getPipelines: Erro:', error)
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
    const pipelineData = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      active: true,
      empresa_id: empresaId
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
    const pipelineData = {
      name: data.name.trim(),
      description: data.description?.trim() || null
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
    console.error('Erro ao atualizar pipeline com etapas:', error)
    return {
      data: null,
      error
    }
  }
} 