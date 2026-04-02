import * as XLSX from 'xlsx'
import { toCsv, downloadCsv, parseCsv } from '../utils/csv'
import { getLeads, createLead } from './leadService'

export interface LeadExportOptions {
  filters?: Record<string, any>
  includeHeaders?: boolean
}

export interface LeadImportResult {
  created: number
  failed: number
  errors: { line: number; message: string }[]
}

type LeadImportDefaults = { default_pipeline_id?: string; default_stage_id?: string }

// Monta o objeto de linha normalizado para export (CSV e XLSX compartilham o mesmo formato)
function buildExportRow(l: any) {
  return {
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
  }
}

// Processa uma única linha de dados (compartilhado entre CSV e XLSX import)
async function processLeadRow(
  row: Record<string, any>,
  _lineNumber: number,
  defaults: LeadImportDefaults | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const payload = {
      name: String(row['name'] || '').trim(),
      company: String(row['company'] || '').trim() || undefined,
      value: row['value'] ? Number(row['value']) : undefined,
      phone: String(row['phone'] || '').trim() || undefined,
      email: String(row['email'] || '').trim() || undefined,
      origin: String(row['origin'] || '').trim() || undefined,
      status: String(row['status'] || '').trim() || undefined,
      pipeline_id: String(row['pipeline_id'] || '').trim() || defaults?.default_pipeline_id || '',
      stage_id: String(row['stage_id'] || '').trim() || defaults?.default_stage_id || '',
      notes: String(row['notes'] || '').trim() || undefined
    }

    if (!payload.pipeline_id || !payload.stage_id) {
      throw new Error('Pipeline e Stage são obrigatórios (preencha no arquivo ou selecione padrão no modal)')
    }

    if (!payload.name) {
      throw new Error('Campo "name" é obrigatório')
    }

    await createLead(payload)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro desconhecido' }
  }
}

// Valida se os cabeçalhos obrigatórios estão presentes
function validateHeaders(headers: string[], defaults: LeadImportDefaults | undefined): void {
  const required = ['name', 'pipeline_id', 'stage_id']
  const missing = required.filter(r => !headers.includes(r))
  if (missing.length) {
    const missingWithoutDefaults = missing.filter(
      m =>
        !(m === 'pipeline_id' && defaults?.default_pipeline_id) &&
        !(m === 'stage_id' && defaults?.default_stage_id)
    )
    if (missingWithoutDefaults.length) {
      throw new Error(`Arquivo inválido. Campos obrigatórios ausentes: ${missingWithoutDefaults.join(', ')}`)
    }
  }
}

export async function exportLeadsToCsv(options: LeadExportOptions = {}) {
  const { filters, includeHeaders = true } = options
  const { data } = await getLeads(filters || { limit: 1000 })
  const rows = (data as any[]).map(buildExportRow)
  const csv = toCsv(rows, { header: includeHeaders })
  downloadCsv('leads.csv', csv)
}

export async function exportLeadsToXlsx(options: LeadExportOptions = {}) {
  const { filters } = options
  const { data } = await getLeads(filters || { limit: 1000 })
  const rows = (data as any[]).map(buildExportRow)
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')
  XLSX.writeFile(wb, 'leads.xlsx')
}

export async function importLeadsFromCsv(file: File, defaults?: LeadImportDefaults): Promise<LeadImportResult> {
  const content = await file.text()
  const { headers, rows } = parseCsv(content)
  validateHeaders(headers, defaults)

  let created = 0
  let failed = 0
  const errors: { line: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const result = await processLeadRow(rows[i], i + 2, defaults)
    if (result.ok) {
      created++
    } else {
      failed++
      errors.push({ line: i + 2, message: result.error })
    }
  }

  return { created, failed, errors }
}

export async function importLeadsFromXlsx(file: File, defaults?: LeadImportDefaults): Promise<LeadImportResult> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

  if (rawRows.length === 0) {
    throw new Error('Arquivo Excel vazio ou sem dados na primeira aba')
  }

  const headers = Object.keys(rawRows[0])
  validateHeaders(headers, defaults)

  let created = 0
  let failed = 0
  const errors: { line: number; message: string }[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const result = await processLeadRow(rawRows[i], i + 2, defaults)
    if (result.ok) {
      created++
    } else {
      failed++
      errors.push({ line: i + 2, message: result.error })
    }
  }

  return { created, failed, errors }
}
