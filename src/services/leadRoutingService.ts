import { supabase } from './supabaseClient'
import type {
  VendorRotationConfig,
  UpdateVendorRotationData,
  QueueState,
  SimulateRoutingResult,
  AssignLeadResult,
  LeadAssignmentLog,
  RoutingStats,
  RoutingLogFilters
} from '../types'
import { getUserPipelinePermissions, canAccessPipeline } from './pipelinePermissionService'

// ===========================================
// FUNÇÕES AUXILIARES
// ===========================================

/**
 * Obtém o ID da empresa do usuário atual
 */
async function getUserEmpresaId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('uuid', user.id)
    .single()

  return profile?.empresa_id || null
}

/**
 * Verifica se o usuário atual é admin
 */
async function isUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return false
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('uuid', user.id)
    .single()

  return profile?.is_admin || false
}

// ===========================================
// CONFIGURAÇÃO DE VENDEDORES
// ===========================================

/**
 * Lista todos os vendedores da empresa com suas configurações de rotação
 */
export async function getVendorsRotationConfig(): Promise<VendorRotationConfig[]> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      throw new Error('Empresa não encontrada')
    }

    // Buscar todos os usuários da empresa com suas configurações
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        uuid,
        full_name,
        email,
        participa_rotacao,
        ordem_rotacao,
        peso_rotacao,
        is_admin,
        pipeline_rotacao_id
      `)
      .eq('empresa_id', empresaId)
      .order('ordem_rotacao', { ascending: true, nullsFirst: false })
      .order('full_name', { ascending: true })

    if (error) {
      throw error
    }

    // Buscar todas as pipelines ativas da empresa
    const { data: allPipelines } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('empresa_id', empresaId)
      .eq('active', true)

    // Para cada vendedor, buscar sua pipeline de roteamento e pipelines disponíveis
    const vendorsWithPipelines = await Promise.all(
      (profiles || []).map(async (profile) => {
        let pipeline = undefined
        
        // 1. Se pipeline_rotacao_id existe, usar essa pipeline
        if (profile.pipeline_rotacao_id) {
          const { data: rotacaoPipeline } = await supabase
            .from('pipelines')
            .select('id, name')
            .eq('id', profile.pipeline_rotacao_id)
            .eq('empresa_id', empresaId)
            .eq('active', true)
            .single()
          
          if (rotacaoPipeline) {
            pipeline = rotacaoPipeline
          }
        }
        
        // 2. Se não encontrou pipeline de roteamento, usar fallback (responsavel_id)
        if (!pipeline) {
          const { data: defaultPipeline } = await supabase
            .from('pipelines')
            .select('id, name')
            .eq('responsavel_id', profile.uuid)
            .eq('empresa_id', empresaId)
            .eq('active', true)
            .single()
          
          pipeline = defaultPipeline || undefined
        }

        // 3. Buscar pipelines disponíveis para este vendedor (baseado em permissões)
        const { data: allowedPipelineIds } = await getUserPipelinePermissions(profile.uuid)
        let availablePipelines: Array<{ id: string; name: string }> = []
        
        if (profile.is_admin || (allowedPipelineIds && allowedPipelineIds.length === 0)) {
          // Admin tem acesso a todas as pipelines
          availablePipelines = allPipelines || []
        } else if (allowedPipelineIds && allowedPipelineIds.length > 0) {
          // Filtrar apenas pipelines permitidas
          availablePipelines = (allPipelines || []).filter(p => 
            allowedPipelineIds.includes(p.id)
          )
        }

        return {
          ...profile,
          pipeline: pipeline,
          available_pipelines: availablePipelines
        }
      })
    )

    return vendorsWithPipelines
  } catch (error) {
    console.error('❌ Erro ao buscar configuração de vendedores:', error)
    throw error
  }
}

/**
 * Atualiza a configuração de rotação de um vendedor
 */
export async function updateVendorRotation(
  vendorId: string,
  data: UpdateVendorRotationData
): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    const isAdmin = await isUserAdmin()
    
    if (!empresaId || !isAdmin) {
      throw new Error('Acesso negado. Apenas administradores podem atualizar configurações.')
    }

    // Validar dados
    if (data.peso_rotacao !== undefined && data.peso_rotacao < 1) {
      throw new Error('Peso de rotação deve ser no mínimo 1')
    }

    if (data.ordem_rotacao !== undefined && data.ordem_rotacao !== null && data.ordem_rotacao < 0) {
      throw new Error('Ordem de rotação deve ser um número positivo')
    }

    // Validar pipeline_rotacao_id se fornecido
    if (data.pipeline_rotacao_id !== undefined) {
      // Se pipeline_rotacao_id é null, permitir (remove a seleção)
      if (data.pipeline_rotacao_id !== null) {
        // Verificar se pipeline existe e está ativa
        const { data: pipeline, error: pipelineError } = await supabase
          .from('pipelines')
          .select('id, empresa_id, active')
          .eq('id', data.pipeline_rotacao_id)
          .single()

        if (pipelineError || !pipeline) {
          throw new Error('Pipeline não encontrada')
        }

        if (pipeline.empresa_id !== empresaId) {
          throw new Error('Pipeline não pertence à mesma empresa')
        }

        if (!pipeline.active) {
          throw new Error('Pipeline não está ativa')
        }

        // Verificar se o vendedor tem permissão para acessar esta pipeline
        const hasAccess = await canAccessPipeline(vendorId, data.pipeline_rotacao_id)
        if (!hasAccess) {
          throw new Error('Vendedor não tem permissão para acessar esta pipeline')
        }
      }
    }

    // Atualizar o vendedor
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('uuid', vendorId)
      .eq('empresa_id', empresaId)

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração do vendedor:', error)
    throw error
  }
}

/**
 * Atualiza múltiplos vendedores em lote
 */
export async function updateMultipleVendorsRotation(
  updates: { vendorId: string; data: UpdateVendorRotationData }[]
): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    const isAdmin = await isUserAdmin()
    
    if (!empresaId || !isAdmin) {
      throw new Error('Acesso negado. Apenas administradores podem atualizar configurações.')
    }

    // Executar todas as atualizações em paralelo
    await Promise.all(
      updates.map(({ vendorId, data }) =>
        supabase
          .from('profiles')
          .update(data)
          .eq('uuid', vendorId)
          .eq('empresa_id', empresaId)
      )
    )
  } catch (error) {
    console.error('❌ Erro ao atualizar configurações dos vendedores:', error)
    throw error
  }
}

// ===========================================
// ESTADO DA FILA
// ===========================================

/**
 * Busca vendedores ativos com dados de elegibilidade baseado no contador ciclos_pulados.
 * peso_rotacao = N → vendedor é pulado N-1 vezes antes de receber.
 * Elegível quando ciclos_pulados >= peso_rotacao - 1.
 * Retorna vendedores ordenados por ordem_rotacao ASC.
 */
async function calcularElegibilidadeVendedores(empresaId: string): Promise<{
  uuid: string
  full_name: string
  peso_rotacao: number
  ordem_rotacao: number | null
  ciclos_pulados: number
  elegivel: boolean
}[]> {
  const { data: vendedores } = await supabase
    .from('profiles')
    .select('uuid, full_name, peso_rotacao, ordem_rotacao, ciclos_pulados')
    .eq('empresa_id', empresaId)
    .eq('participa_rotacao', true)
    .order('ordem_rotacao', { ascending: true, nullsFirst: false })
    .order('uuid', { ascending: true })

  if (!vendedores || vendedores.length === 0) return []

  return vendedores.map(v => {
    const peso = v.peso_rotacao || 1
    const ciclos = v.ciclos_pulados || 0

    return {
      uuid: v.uuid,
      full_name: v.full_name,
      peso_rotacao: peso,
      ordem_rotacao: v.ordem_rotacao,
      ciclos_pulados: ciclos,
      elegivel: ciclos >= peso - 1
    }
  })
}

/**
 * Encontra o próximo vendedor elegível em ordem cíclica (round-robin).
 * A prioridade é SEMPRE a ordem_rotacao. O peso apenas pula vendedores inelegíveis.
 * Se ninguém é elegível, retorna o próximo na ordem cíclica (force-assign).
 */
function encontrarProximoVendedor(
  vendedores: Awaited<ReturnType<typeof calcularElegibilidadeVendedores>>,
  ultimoVendedorId?: string | null
): { uuid: string; full_name: string } | null {
  if (vendedores.length === 0) return null

  // Vendedores já vêm ordenados por ordem_rotacao ASC, uuid ASC
  // Montar ordem cíclica: começar DEPOIS do último vendedor, dar a volta
  const indexUltimo = ultimoVendedorId
    ? vendedores.findIndex(v => v.uuid === ultimoVendedorId)
    : -1

  const ordemCiclica = [
    ...vendedores.slice(indexUltimo + 1),   // depois do último
    ...vendedores.slice(0, indexUltimo + 1)  // volta pro início
  ]

  // Primeiro: buscar primeiro elegível na ordem cíclica
  const elegivel = ordemCiclica.find(v => v.elegivel)
  if (elegivel) {
    return { uuid: elegivel.uuid, full_name: elegivel.full_name }
  }

  // Fallback: ninguém elegível → próximo na ordem cíclica independente do peso
  return { uuid: ordemCiclica[0].uuid, full_name: ordemCiclica[0].full_name }
}

/**
 * Obtém o estado atual da fila de distribuição
 */
export async function getQueueState(): Promise<QueueState> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      throw new Error('Empresa não encontrada')
    }

    // Buscar estado da fila (para referência de último vendedor e timestamp)
    const { data: state } = await supabase
      .from('lead_distribution_state')
      .select(`
        ultimo_vendedor_id,
        updated_at
      `)
      .eq('empresa_id', empresaId)
      .single()

    // Calcular elegibilidade com peso
    const vendedoresComElegibilidade = await calcularElegibilidadeVendedores(empresaId)
    const totalVendedoresAtivos = vendedoresComElegibilidade.length

    // Último vendedor
    let ultimoVendedor = null
    if (state?.ultimo_vendedor_id) {
      const ultimo = vendedoresComElegibilidade.find(v => v.uuid === state.ultimo_vendedor_id)
      if (ultimo) {
        ultimoVendedor = { id: ultimo.uuid, name: ultimo.full_name }
      } else {
        // Vendedor pode ter sido removido da rotação, buscar nome direto
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('uuid', state.ultimo_vendedor_id)
          .single()
        if (profile) {
          ultimoVendedor = { id: state.ultimo_vendedor_id, name: profile.full_name }
        }
      }
    }

    // Próximo vendedor (usando lógica de peso + ordem cíclica)
    const proximo = encontrarProximoVendedor(vendedoresComElegibilidade, state?.ultimo_vendedor_id)
    const proximoVendedor = proximo ? { id: proximo.uuid, name: proximo.full_name } : null

    return {
      ultimo_vendedor: ultimoVendedor,
      proximo_vendedor: proximoVendedor,
      updated_at: state?.updated_at || null,
      total_vendedores_ativos: totalVendedoresAtivos
    }
  } catch (error) {
    console.error('❌ Erro ao buscar estado da fila:', error)
    throw error
  }
}

/**
 * Reseta o estado da fila de distribuição e os contadores de ciclos pulados
 */
export async function resetQueue(): Promise<void> {
  try {
    const empresaId = await getUserEmpresaId()
    const isAdmin = await isUserAdmin()
    
    if (!empresaId || !isAdmin) {
      throw new Error('Acesso negado. Apenas administradores podem resetar a fila.')
    }

    // Deletar o registro de estado (será recriado no próximo assign)
    const { error } = await supabase
      .from('lead_distribution_state')
      .delete()
      .eq('empresa_id', empresaId)

    if (error) {
      throw error
    }

    // Resetar contadores de ciclos pulados de todos os vendedores da empresa
    const { error: resetError } = await supabase
      .from('profiles')
      .update({ ciclos_pulados: 0 })
      .eq('empresa_id', empresaId)

    if (resetError) {
      throw resetError
    }
  } catch (error) {
    console.error('❌ Erro ao resetar fila:', error)
    throw error
  }
}

// ===========================================
// DISTRIBUIÇÃO DE LEADS
// ===========================================

/**
 * Busca a pipeline de roteamento para um vendedor
 * Prioridade: 1) pipeline_rotacao_id, 2) pipeline onde responsavel_id = vendedor_id
 */
async function getPipelineForVendor(vendorId: string): Promise<{ id: string; name: string } | null> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      throw new Error('Empresa não encontrada')
    }

    // Buscar profile do vendedor para obter pipeline_rotacao_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('pipeline_rotacao_id')
      .eq('uuid', vendorId)
      .eq('empresa_id', empresaId)
      .single()

    if (!profile) {
      return null
    }

    let pipeline = null

    // 1. Se pipeline_rotacao_id existe, usar essa pipeline
    if (profile.pipeline_rotacao_id) {
      const { data: rotacaoPipeline } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('id', profile.pipeline_rotacao_id)
        .eq('empresa_id', empresaId)
        .eq('active', true)
        .single()

      if (rotacaoPipeline) {
        pipeline = rotacaoPipeline
      }
    }

    // 2. Se não encontrou pipeline de roteamento, usar fallback (responsavel_id)
    if (!pipeline) {
      const { data: defaultPipeline } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('responsavel_id', vendorId)
        .eq('empresa_id', empresaId)
        .eq('active', true)
        .single()

      pipeline = defaultPipeline || null
    }

    return pipeline
  } catch (error) {
    console.error('❌ Erro ao buscar pipeline do vendedor:', error)
    return null
  }
}

/**
 * Distribui um lead automaticamente usando a função RPC
 */
export async function assignLead(
  leadId: string,
  origem?: string
): Promise<AssignLeadResult> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      throw new Error('Empresa não encontrada')
    }

    // Chamar a função RPC do Supabase
    const { data, error } = await supabase.rpc('assign_lead', {
      p_empresa_id: empresaId,
      p_lead_id: leadId,
      p_origem: origem || null
    })

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('Nenhum resultado retornado pela função de distribuição')
    }

    return data[0]
  } catch (error) {
    console.error('❌ Erro ao distribuir lead:', error)
    throw error
  }
}

/**
 * Simula a distribuição de um lead (dry run)
 * Usa a mesma lógica de peso da função SQL assign_lead:
 * peso_rotacao = N → vendedor recebe lead a cada N rodadas
 */
export async function simulateRouting(): Promise<SimulateRoutingResult> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      throw new Error('Empresa não encontrada')
    }

    // Calcular elegibilidade com peso
    const vendedoresComElegibilidade = await calcularElegibilidadeVendedores(empresaId)

    if (vendedoresComElegibilidade.length === 0) {
      throw new Error('Nenhum vendedor elegível encontrado para simulação')
    }

    // Buscar último vendedor para posição no ciclo
    const { data: state } = await supabase
      .from('lead_distribution_state')
      .select('ultimo_vendedor_id')
      .eq('empresa_id', empresaId)
      .single()

    // Encontrar próximo vendedor usando lógica de peso + ordem cíclica
    const proximo = encontrarProximoVendedor(vendedoresComElegibilidade, state?.ultimo_vendedor_id)

    if (!proximo) {
      throw new Error('Não foi possível determinar o próximo vendedor')
    }

    // Buscar pipeline do vendedor usando função auxiliar
    const pipeline = await getPipelineForVendor(proximo.uuid)

    if (!pipeline) {
      throw new Error('Pipeline não encontrada para o vendedor')
    }

    // Buscar stage inicial
    const { data: stage } = await supabase
      .from('stages')
      .select('id, name')
      .eq('pipeline_id', pipeline.id)
      .eq('empresa_id', empresaId)
      .order('is_inicial', { ascending: false, nullsFirst: false })
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (!stage) {
      throw new Error('Stage inicial não encontrado')
    }

    // Calcular posição na fila (índice do vendedor selecionado entre os elegíveis)
    const indexVendedor = vendedoresComElegibilidade.findIndex(v => v.uuid === proximo.uuid)

    return {
      vendedor: {
        id: proximo.uuid,
        name: proximo.full_name
      },
      pipeline: {
        id: pipeline.id,
        name: pipeline.name
      },
      stage: {
        id: stage.id,
        name: stage.name
      },
      posicao_na_fila: indexVendedor + 1,
      total_vendedores: vendedoresComElegibilidade.length
    }
  } catch (error: any) {
    console.error('❌ Erro ao simular roteamento:', error)
    
    // Verificar se é erro 406 (tabelas não existem)
    if (error?.code === 'PGRST106' || error?.message?.includes('406')) {
      throw new Error('⚠️ MIGRAÇÕES SQL NÃO APLICADAS! Por favor, acesse o arquivo APLICAR_MIGRACOES.md na raiz do projeto e siga as instruções para aplicar as 4 migrações no Supabase.')
    }
    
    throw error
  }
}

// ===========================================
// LOG E ESTATÍSTICAS
// ===========================================

/**
 * Busca o log de distribuição com filtros
 */
export async function getAssignmentLog(
  filters?: RoutingLogFilters
): Promise<{ data: LeadAssignmentLog[]; count: number }> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      throw new Error('Empresa não encontrada')
    }

    let query = supabase
      .from('lead_assignment_log')
      .select(`
        *,
        lead:leads(id, name),
        vendedor:profiles!vendedor_id(uuid, full_name),
        pipeline:pipelines(id, name),
        stage:stages(id, name)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)

    // Aplicar filtros
    if (filters?.vendedor_id && filters.vendedor_id.length > 0) {
      query = query.in('vendedor_id', filters.vendedor_id)
    }

    if (filters?.pipeline_id && filters.pipeline_id.length > 0) {
      query = query.in('pipeline_id', filters.pipeline_id)
    }

    if (filters?.origem && filters.origem.length > 0) {
      query = query.in('origem', filters.origem)
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    // Ordenação e paginação
    query = query.order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return {
      data: data || [],
      count: count || 0
    }
  } catch (error) {
    console.error('❌ Erro ao buscar log de distribuição:', error)
    throw error
  }
}

/**
 * Obtém estatísticas de roteamento
 */
export async function getRoutingStats(): Promise<RoutingStats> {
  try {
    const empresaId = await getUserEmpresaId()
    
    if (!empresaId) {
      throw new Error('Empresa não encontrada')
    }

    const agora = new Date()
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
    const inicioSemana = new Date(agora)
    inicioSemana.setDate(agora.getDate() - agora.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    // Buscar todos os registros de distribuição
    const { data: logs } = await supabase
      .from('lead_assignment_log')
      .select(`
        id,
        vendedor_id,
        origem,
        created_at,
        vendedor:profiles!vendedor_id(full_name)
      `)
      .eq('empresa_id', empresaId)

    if (!logs) {
      return {
        total_distribuicoes: 0,
        distribuicoes_hoje: 0,
        distribuicoes_semana: 0,
        distribuicoes_mes: 0,
        por_vendedor: [],
        por_origem: []
      }
    }

    // Calcular totais
    const total = logs.length
    const hoje_count = logs.filter(l => l.created_at >= hoje).length
    const semana_count = logs.filter(l => l.created_at >= inicioSemana.toISOString()).length
    const mes_count = logs.filter(l => l.created_at >= inicioMes).length

    // Agrupar por vendedor
    const porVendedor = logs.reduce((acc, log) => {
      const vendedorId = log.vendedor_id
      if (!acc[vendedorId]) {
        // O vendedor pode vir como array ou objeto, dependendo da query
        const vendedorData = Array.isArray(log.vendedor) ? log.vendedor[0] : log.vendedor
        acc[vendedorId] = {
          vendedor_id: vendedorId,
          vendedor_name: (vendedorData as any)?.full_name || 'Desconhecido',
          total: 0,
          hoje: 0,
          semana: 0,
          mes: 0
        }
      }
      acc[vendedorId].total++
      if (log.created_at >= hoje) acc[vendedorId].hoje++
      if (log.created_at >= inicioSemana.toISOString()) acc[vendedorId].semana++
      if (log.created_at >= inicioMes) acc[vendedorId].mes++
      return acc
    }, {} as Record<string, any>)

    // Agrupar por origem
    const porOrigemMap = logs.reduce((acc, log) => {
      const origem = log.origem || 'Sem origem'
      acc[origem] = (acc[origem] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const porOrigem = Object.entries(porOrigemMap).map(([origem, count]) => ({
      origem,
      total: count,
      porcentagem: Math.round((count / total) * 100)
    }))

    return {
      total_distribuicoes: total,
      distribuicoes_hoje: hoje_count,
      distribuicoes_semana: semana_count,
      distribuicoes_mes: mes_count,
      por_vendedor: Object.values(porVendedor),
      por_origem: porOrigem
    }
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de roteamento:', error)
    throw error
  }
}

