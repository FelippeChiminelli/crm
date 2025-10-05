import { toCsv, downloadCsv, parseCsv } from '../utils/csv'
import { getLeads, createLead } from './leadService'

export interface LeadExportOptions {
  filters?: Record<string, any>
  includeHeaders?: boolean
}

export async function exportLeadsToCsv(options: LeadExportOptions = {}) {
  const { filters, includeHeaders = true } = options
  const { data } = await getLeads(filters || { limit: 1000 })
  const rows = (data as any[]).map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company ?? '',
    value: l.value ?? '',
    phone: l.phone ?? '',
    email: l.email ?? '',
    origin: l.origin ?? '',
    status: l.status ?? '',
    pipeline: l.pipeline?.name ?? '',
    stage: l.stage?.name ?? '',
    responsible: l.responsible?.full_name ?? '',
    tags: Array.isArray(l.tags) ? l.tags.join('|') : '',
    notes: l.notes ?? ''
  }))
  const csv = toCsv(rows, { header: includeHeaders })
  downloadCsv('leads.csv', csv)
}

export interface LeadImportResult {
  created: number
  failed: number
  errors: { line: number; message: string }[]
}

export async function importLeadsFromCsv(file: File, defaults?: { default_pipeline_id?: string; default_stage_id?: string }): Promise<LeadImportResult> {
  const content = await file.text()
  const { headers, rows } = parseCsv(content)
  const required = ['name', 'pipeline_id', 'stage_id']
  const missing = required.filter(r => !headers.includes(r))
  // Permitimos ausência de pipeline_id/stage_id se defaults foram informados
  if (missing.length) {
    const missingWithoutDefaults = missing.filter(m => !(m === 'pipeline_id' && defaults?.default_pipeline_id) && !(m === 'stage_id' && defaults?.default_stage_id))
    if (missingWithoutDefaults.length) {
      throw new Error(`CSV inválido. Campos obrigatórios ausentes: ${missingWithoutDefaults.join(', ')}`)
    }
  }

  let created = 0
  let failed = 0
  const errors: { line: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const payload = {
        name: (row['name'] || '').trim(),
        company: (row['company'] || '').trim() || undefined,
        value: row['value'] ? Number(row['value']) : undefined,
        phone: (row['phone'] || '').trim() || undefined,
        email: (row['email'] || '').trim() || undefined,
        origin: (row['origin'] || '').trim() || undefined,
        status: (row['status'] || '').trim() || undefined,
        pipeline_id: ((row['pipeline_id'] || '').trim()) || defaults?.default_pipeline_id || '',
        stage_id: ((row['stage_id'] || '').trim()) || defaults?.default_stage_id || '',
        notes: (row['notes'] || '').trim() || undefined
      }

      if (!payload.pipeline_id || !payload.stage_id) {
        throw new Error('Pipeline e Stage são obrigatórios (preencha no CSV ou selecione padrão no modal)')
      }

      await createLead(payload)
      created++
    } catch (e: any) {
      failed++
      errors.push({ line: i + 2, message: e?.message || 'Erro desconhecido' })
    }
  }

  return { created, failed, errors }
}


