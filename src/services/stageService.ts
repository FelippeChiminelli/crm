import { supabase } from './supabaseClient'
import type { Stage } from '../types'

// Importar função centralizada
import { getUserEmpresaId } from './authService'

// Validação de dados de stage
function validateStageData(data: Omit<Stage, 'id' | 'created_at'>): void {
  if (!data.name?.trim()) {
    throw new Error('Nome da etapa é obrigatório')
  }
  
  if (data.name.length > 50) {
    throw new Error('Nome da etapa não pode ter mais de 50 caracteres')
  }
  
  if (!data.pipeline_id?.trim()) {
    throw new Error('Pipeline é obrigatório')
  }
  
  if (!data.color?.trim()) {
    throw new Error('Cor da etapa é obrigatória')
  }
  
  // Validar formato da cor (hex)
  const colorRegex = /^#[0-9A-F]{6}$/i
  if (!colorRegex.test(data.color)) {
    throw new Error('Formato de cor inválido. Use formato hexadecimal (#RRGGBB)')
  }
  
  if (data.position < 0) {
    throw new Error('Posição da etapa não pode ser negativa')
  }
}

export async function getStagesByPipeline(pipelineId: string) {
  if (!pipelineId?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      return { data: [], error: null }
    }
    
    return supabase
      .from('stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('empresa_id', empresaId)
      .order('position', { ascending: true })
  } catch (error) {
    console.error('Erro ao buscar etapas:', error)
    throw error
  }
}

export async function getStageById(id: string) {
  if (!id?.trim()) {
    throw new Error('Stage ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  return supabase
    .from('stages')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
}

export async function createStage(data: Omit<Stage, 'id' | 'created_at'>) {
  validateStageData(data)
  
  const empresaId = await getUserEmpresaId()
  
  // Validar se o pipeline pertence à empresa do usuário
  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('id')
    .eq('id', data.pipeline_id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (pipelineError || !pipeline) {
    throw new Error('Pipeline não encontrado ou não pertence à sua empresa')
  }
  
  const stageData = {
    ...data,
    empresa_id: empresaId,
    name: data.name.trim(),
    color: data.color.trim(),
    position: data.position
  }
  
  return supabase
    .from('stages')
    .insert([stageData])
    .select()
    .single()
}

export async function updateStage(id: string, data: Partial<Omit<Stage, 'id' | 'created_at'>>) {
  if (!id?.trim()) {
    throw new Error('Stage ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  // Validar se a etapa pertence à empresa do usuário
  const { data: existingStage, error: checkError } = await supabase
    .from('stages')
    .select('id, pipeline_id')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
  
  if (checkError || !existingStage) {
    throw new Error('Etapa não encontrada ou não pertence à sua empresa')
  }
  
  // Sanitizar dados de entrada
  const sanitizedData: any = {}
  
  if (data.name !== undefined) {
    if (!data.name?.trim()) {
      throw new Error('Nome da etapa é obrigatório')
    }
    if (data.name.length > 50) {
      throw new Error('Nome da etapa não pode ter mais de 50 caracteres')
    }
    sanitizedData.name = data.name.trim()
  }
  
  if (data.color !== undefined) {
    if (!data.color?.trim()) {
      throw new Error('Cor da etapa é obrigatória')
    }
    const colorRegex = /^#[0-9A-F]{6}$/i
    if (!colorRegex.test(data.color)) {
      throw new Error('Formato de cor inválido. Use formato hexadecimal (#RRGGBB)')
    }
    sanitizedData.color = data.color.trim()
  }
  
  if (data.position !== undefined) {
    if (data.position < 0) {
      throw new Error('Posição da etapa não pode ser negativa')
    }
    sanitizedData.position = data.position
  }
  
  if (data.pipeline_id !== undefined) {
    // Validar se o novo pipeline pertence à empresa do usuário
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id')
      .eq('id', data.pipeline_id)
      .eq('empresa_id', empresaId)
      .single()
    
    if (pipelineError || !pipeline) {
      throw new Error('Pipeline não encontrado ou não pertence à sua empresa')
    }
    
    sanitizedData.pipeline_id = data.pipeline_id
  }
  
  return supabase
    .from('stages')
    .update(sanitizedData)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()
}

export async function deleteStage(id: string) {
  if (!id?.trim()) {
    throw new Error('Stage ID é obrigatório')
  }
  
  const empresaId = await getUserEmpresaId()
  
  // Verificar se existem leads nesta etapa
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id')
    .eq('stage_id', id)
    .eq('empresa_id', empresaId)
    .limit(1)
  
  if (leadsError) {
    throw new Error('Erro ao verificar leads na etapa')
  }
  
  if (leads && leads.length > 0) {
    throw new Error('Não é possível deletar uma etapa que contém leads. Mova os leads para outra etapa primeiro.')
  }
  
  return supabase
    .from('stages')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)
}

export async function reorderStages(pipelineId: string, stages: { id: string; position: number }[]) {
  if (!pipelineId?.trim()) {
    throw new Error('Pipeline ID é obrigatório')
  }
  
  if (!stages || stages.length === 0) {
    throw new Error('Lista de etapas é obrigatória')
  }
  
  const empresaId = await getUserEmpresaId()
  
  // Validar se o pipeline pertence à empresa do usuário
  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('id')
    .eq('id', pipelineId)
    .eq('empresa_id', empresaId)
    .single()
  
  if (pipelineError || !pipeline) {
    throw new Error('Pipeline não encontrado ou não pertence à sua empresa')
  }
  
  // Validar todas as etapas antes de atualizar
  for (const stage of stages) {
    if (!stage.id?.trim()) {
      throw new Error('ID da etapa é obrigatório')
    }
    
    if (stage.position < 0) {
      throw new Error('Posição da etapa não pode ser negativa')
    }
    
    // Verificar se a etapa pertence à empresa e ao pipeline
    const { data: existingStage, error: stageError } = await supabase
      .from('stages')
      .select('id')
      .eq('id', stage.id)
      .eq('pipeline_id', pipelineId)
      .eq('empresa_id', empresaId)
      .single()
    
    if (stageError || !existingStage) {
      throw new Error(`Etapa ${stage.id} não encontrada ou não pertence à sua empresa`)
    }
  }
  
  // Atualizar posições das etapas
  const updatePromises = stages.map(stage => 
    supabase
      .from('stages')
      .update({ position: stage.position })
      .eq('id', stage.id)
      .eq('empresa_id', empresaId)
  )
  
  try {
    await Promise.all(updatePromises)
    return { success: true }
  } catch (error) {
    console.error('Erro ao reordenar etapas:', error)
    throw new Error('Erro ao reordenar etapas')
  }
} 