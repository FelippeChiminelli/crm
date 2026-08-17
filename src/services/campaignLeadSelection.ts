import { supabase } from './supabaseClient'
import type { CampaignSelectionMode } from '../types'

/**
 * Critérios de segmentação dos leads de uma campanha.
 * Nos modos 'tags' e 'origin', pipeline_id e from_stage_id são filtros
 * opcionais que refinam a seleção (vazio = sem restrição).
 */
export interface CampaignLeadCriteria {
  pipeline_id?: string | null
  from_stage_id?: string | null
  selected_tags?: string[] | null
  selected_origins?: string[] | null
}

/** Subconjunto do builder do Supabase usado na montagem dos filtros */
interface LeadFilterQuery {
  eq: (column: string, value: string) => LeadFilterQuery
  overlaps: (column: string, value: string[]) => LeadFilterQuery
  in: (column: string, values: string[]) => LeadFilterQuery
}

/** Origens são persistidas em selected_tags até existir coluna dedicada no banco */
function resolveOrigins(criteria: CampaignLeadCriteria): string[] | null {
  const origins = criteria.selected_origins?.length
    ? criteria.selected_origins
    : criteria.selected_tags
  return origins?.length ? origins : null
}

function applyAttributeScope(query: LeadFilterQuery, criteria: CampaignLeadCriteria): LeadFilterQuery {
  let scoped = query

  if (criteria.pipeline_id) {
    scoped = scoped.eq('pipeline_id', criteria.pipeline_id)
  }
  if (criteria.from_stage_id) {
    scoped = scoped.eq('stage_id', criteria.from_stage_id)
  }

  return scoped
}

/**
 * Aplica os filtros de seleção de leads conforme o modo da campanha.
 * Retorna a query original quando os critérios do modo não estão preenchidos.
 */
export function applyCampaignLeadSelectionFilter<T>(
  query: T,
  selectionMode: CampaignSelectionMode | string,
  criteria: CampaignLeadCriteria
): T {
  const q = query as unknown as LeadFilterQuery

  if (selectionMode === 'stage') {
    if (!criteria.from_stage_id) return query
    return q.eq('stage_id', criteria.from_stage_id) as unknown as T
  }

  if (selectionMode === 'tags') {
    if (!criteria.selected_tags?.length) return query
    const filtered = q.overlaps('tags', criteria.selected_tags)
    return applyAttributeScope(filtered, criteria) as unknown as T
  }

  if (selectionMode === 'origin') {
    const origins = resolveOrigins(criteria)
    if (!origins) return query
    const filtered = q.in('origin', origins)
    return applyAttributeScope(filtered, criteria) as unknown as T
  }

  return query
}

function requireEmpresaId(empresaId: string | null): string {
  if (!empresaId) {
    throw new Error('Empresa não identificada para seleção de leads da campanha')
  }
  return empresaId
}

/** Base comum: leads ativos (não perdidos e não vendidos) da empresa */
function buildActiveLeadsQuery(empresaId: string, select: string, headCount: boolean) {
  return supabase
    .from('leads')
    .select(select, headCount ? { count: 'exact', head: true } : undefined)
    .eq('empresa_id', empresaId)
    .is('loss_reason_category', null)
    .is('sold_at', null)
}

/**
 * Conta quantos leads atendem aos critérios da campanha.
 * Lança erro para que o chamador decida como tratar.
 */
export async function countCampaignLeads(
  empresaId: string | null,
  selectionMode: CampaignSelectionMode | string,
  criteria: CampaignLeadCriteria
): Promise<number> {
  const query = applyCampaignLeadSelectionFilter(
    buildActiveLeadsQuery(requireEmpresaId(empresaId), '*', true),
    selectionMode,
    criteria
  )

  const { count, error } = await query

  if (error) throw error

  return count ?? 0
}

/**
 * Retorna os IDs dos leads que atendem aos critérios da campanha.
 * Usado nos modos 'tags' e 'origin', que congelam a lista em selected_lead_ids.
 */
export async function fetchCampaignLeadIds(
  empresaId: string | null,
  selectionMode: CampaignSelectionMode | string,
  criteria: CampaignLeadCriteria
): Promise<string[]> {
  const query = applyCampaignLeadSelectionFilter(
    buildActiveLeadsQuery(requireEmpresaId(empresaId), 'id', false),
    selectionMode,
    criteria
  )

  const { data, error } = await query

  if (error) throw error

  return ((data ?? []) as unknown as { id: string }[]).map(lead => lead.id)
}
