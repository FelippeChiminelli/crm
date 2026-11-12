import { supabase } from './supabaseClient'
import type {
  LeadProcura,
  LeadProcuraInput,
  LeadProcuraMatch,
  ProcuraMatchStatus,
  ProcuraStatus,
  Vehicle
} from '../types'

/**
 * Procura de veículo ("avisar quando chegar"). O match e o aviso rodam no banco
 * (trigger em vehicles); aqui ficam o CRUD da procura e a leitura dos matches.
 */

const PROCURA_COLUMNS =
  'id, empresa_id, lead_id, created_by, marca, modelo, ano_min, ano_max, preco_max, km_max, cambio, combustivel, observacao, status, expira_em, created_at, updated_at'

export async function listLeadProcuras(leadId: string): Promise<LeadProcura[]> {
  const { data, error } = await supabase
    .from('lead_procuras')
    .select(PROCURA_COLUMNS)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Erro ao carregar procuras: ${error.message}`)
  return (data ?? []) as LeadProcura[]
}

/**
 * Matches do lead já com o veículo atual. O sync do estoque apaga e recria os
 * registros, então o veículo é resolvido por external_id, não por vehicle_id.
 */
export async function listLeadProcuraMatches(leadId: string, empresaId: string): Promise<LeadProcuraMatch[]> {
  const { data, error } = await supabase
    .from('lead_procura_matches')
    .select('id, procura_id, lead_id, vehicle_external_id, vehicle_id, origem, status, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Erro ao carregar veículos encontrados: ${error.message}`)

  const matches = (data ?? []) as LeadProcuraMatch[]
  if (matches.length === 0) return matches

  const externalIds = [...new Set(matches.map((m) => m.vehicle_external_id))]
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('*, images:vehicle_images(id, url, position)')
    .eq('empresa_id', empresaId)
    .in('external_id', externalIds)
  if (vehiclesError) throw new Error(`Erro ao carregar veículos: ${vehiclesError.message}`)

  const byExternalId = new Map((vehicles ?? []).map((v) => [Number(v.external_id), v as Vehicle]))
  return matches.map((m) => ({ ...m, vehicle: byExternalId.get(Number(m.vehicle_external_id)) ?? null }))
}

/** Cria a procura e já cruza com o estoque atual (sem notificar). Retorna quantos carros atendem. */
export async function createLeadProcura(
  empresaId: string,
  leadId: string,
  input: LeadProcuraInput
): Promise<{ procura: LeadProcura; encontrados: number }> {
  const { data, error } = await supabase
    .from('lead_procuras')
    .insert({ ...input, empresa_id: empresaId, lead_id: leadId })
    .select(PROCURA_COLUMNS)
    .single()
  if (error) throw new Error(`Erro ao salvar procura: ${error.message}`)

  const encontrados = await buscarNoEstoque(data.id)
  return { procura: data as LeadProcura, encontrados }
}

export async function updateLeadProcura(
  id: string,
  input: LeadProcuraInput
): Promise<{ encontrados: number }> {
  const { error } = await supabase.from('lead_procuras').update(input).eq('id', id)
  if (error) throw new Error(`Erro ao atualizar procura: ${error.message}`)
  return { encontrados: await buscarNoEstoque(id) }
}

export async function setLeadProcuraStatus(id: string, status: ProcuraStatus): Promise<void> {
  const { error } = await supabase.from('lead_procuras').update({ status }).eq('id', id)
  if (error) throw new Error(`Erro ao atualizar procura: ${error.message}`)
}

export async function setProcuraMatchStatus(id: string, status: ProcuraMatchStatus): Promise<void> {
  const { error } = await supabase.from('lead_procura_matches').update({ status }).eq('id', id)
  if (error) throw new Error(`Erro ao atualizar veículo: ${error.message}`)
}

async function buscarNoEstoque(procuraId: string): Promise<number> {
  const { data, error } = await supabase.rpc('procura_buscar_estoque', { p_procura_id: procuraId })
  if (error) throw new Error(`Procura salva, mas falhou a busca no estoque: ${error.message}`)
  return (data as number) ?? 0
}

export interface ProcuraSugestao {
  valor: string
  qtd: number
}

/** Marcas/modelos que aparecem no estoque da empresa, para o autocomplete. */
export async function getProcuraSugestoes(campo: 'marca' | 'modelo', marca?: string): Promise<ProcuraSugestao[]> {
  const { data, error } = await supabase.rpc('procura_sugestoes', {
    p_campo: campo,
    p_marca: marca?.trim() || null
  })
  if (error) throw new Error(`Erro ao carregar sugestões: ${error.message}`)
  return (data ?? []) as ProcuraSugestao[]
}
