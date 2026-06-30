import type { DuplicateLeadMatchField, DuplicateLeadScope } from '../types'
import { findDuplicateLeadForAutomation } from './leadService'

export interface CreateLeadDuplicateConfig {
  preventDuplicate: boolean
  matchFields: DuplicateLeadMatchField[]
  scope: DuplicateLeadScope
}

export interface CreateLeadDuplicateSkipResult {
  skip: true
  reason: string
  existingLeadId: string
  existingLeadName: string
  matchedBy: DuplicateLeadMatchField
  matchFields: DuplicateLeadMatchField[]
  scope: DuplicateLeadScope
}

export function parseCreateLeadDuplicateConfig(action: Record<string, unknown>): CreateLeadDuplicateConfig {
  const preventDuplicate = action.prevent_duplicate === true
  const rawFields = action.duplicate_match_fields
  const matchFields = Array.isArray(rawFields)
    ? rawFields.filter((field): field is DuplicateLeadMatchField => field === 'phone' || field === 'email')
    : []
  const scope: DuplicateLeadScope = action.duplicate_scope === 'target_pipeline' ? 'target_pipeline' : 'empresa'

  return { preventDuplicate, matchFields, scope }
}

export async function shouldSkipCreateLeadAsDuplicate(
  payload: { phone?: string; email?: string; pipeline_id?: string },
  action: Record<string, unknown>,
  empresaId: string,
  excludeLeadId?: string
): Promise<CreateLeadDuplicateSkipResult | { skip: false }> {
  const config = parseCreateLeadDuplicateConfig(action)

  if (!config.preventDuplicate || config.matchFields.length === 0) {
    return { skip: false }
  }

  const duplicate = await findDuplicateLeadForAutomation(empresaId, payload, {
    matchFields: config.matchFields,
    scope: config.scope,
    excludeLeadId,
  })

  if (!duplicate) {
    return { skip: false }
  }

  return {
    skip: true,
    reason: 'lead duplicado',
    existingLeadId: duplicate.id,
    existingLeadName: duplicate.name,
    matchedBy: duplicate.matchedBy,
    matchFields: config.matchFields,
    scope: config.scope,
  }
}
