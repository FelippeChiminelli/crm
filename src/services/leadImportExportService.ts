import * as XLSX from 'xlsx'
import { toCsv, downloadCsv, parseCsv } from '../utils/csv'
import { getLeads, createLead } from './leadService'
import { getCustomFieldsByEmpresa } from './leadCustomFieldService'
import { getCustomValuesByLeads } from './leadCustomValueService'
import type { LeadCustomField, LeadCustomValue } from '../types'

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

// Limite de linhas por importação (mesmo valor exibido/validado na UI)
export const MAX_IMPORT_ROWS = 10000

// Normaliza as chaves de uma linha: minúsculas e sem espaços nas bordas.
// Torna a importação tolerante a cabeçalhos como "Name", " NOME " ou "Email".
function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {}
  for (const key of Object.keys(row)) {
    normalized[key.trim().toLowerCase()] = row[key]
  }
  return normalized
}

// Converte o campo "value" tratando 0, decimal com vírgula e valores inválidos.
// Se houver vírgula, assume formato pt-BR (ponto = milhar, vírgula = decimal).
// Caso contrário, mantém o ponto como separador decimal (formato US).
function parseValue(raw: any): number | undefined {
  const str = String(raw ?? '').trim()
  if (str === '') return undefined
  const sanitized = str.includes(',')
    ? str.replace(/\./g, '').replace(',', '.')
    : str
  const numeric = Number(sanitized)
  return Number.isFinite(numeric) ? numeric : undefined
}

// Formata data/hora para exportação (pt-BR)
function formatExportDateTime(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR')
}

// Monta o objeto de linha normalizado para export (CSV e XLSX compartilham o mesmo formato)
function buildExportRow(
  l: Record<string, any>,
  customFieldDefs: LeadCustomField[],
  valuesByLeadId: Map<string, LeadCustomValue[]>
) {
  const row: Record<string, string | number> = {
    id: l.id,
    name: l.name,
    company: l.company ?? '',
    value: l.value ?? '',
    phone: l.phone ?? '',
    email: l.email ?? '',
    origin: l.origin ?? '',
    status: l.status ?? '',
    pipeline_id: l.pipeline_id ?? '',
    pipeline: l.pipeline?.name ?? '',
    stage_id: l.stage_id ?? '',
    stage: l.stage?.name ?? '',
    responsible_uuid: l.responsible_uuid ?? '',
    responsible: l.responsible?.full_name ?? '',
    tags: Array.isArray(l.tags) ? l.tags.join('|') : '',
    notes: l.notes ?? '',
    created_at: formatExportDateTime(l.created_at),
    last_contact_at: formatExportDateTime(l.last_contact_at),
    lost_at: formatExportDateTime(l.lost_at),
    sold_at: formatExportDateTime(l.sold_at),
    sold_value: l.sold_value ?? '',
    sale_notes: l.sale_notes ?? '',
    loss_reason_notes: l.loss_reason_notes ?? '',
  }

  const leadValues = valuesByLeadId.get(l.id) || []
  for (const field of customFieldDefs) {
    const customValue = leadValues.find(v => v.field_id === field.id)
    row[field.name] = customValue?.value ?? ''
  }

  return row
}

/** Busca leads filtrados e enriquece com valores de campos personalizados. */
async function fetchLeadsForExport(filters?: Record<string, unknown>) {
  const { data, error } = await getLeads(filters || { limit: 1000 })
  if (error) throw new Error(error.message || 'Erro ao buscar leads para exportação')

  const leads = (data as Record<string, any>[]) || []

  const { data: customFieldDefs, error: fieldsError } = await getCustomFieldsByEmpresa()
  if (fieldsError) throw new Error(fieldsError.message || 'Erro ao buscar campos personalizados')

  const defs = (customFieldDefs as LeadCustomField[]) || []
  const valuesByLeadId = new Map<string, LeadCustomValue[]>()

  if (leads.length > 0 && defs.length > 0) {
    const { data: customValues } = await getCustomValuesByLeads(leads.map(l => l.id))

    for (const customValue of customValues || []) {
      const existing = valuesByLeadId.get(customValue.lead_id) || []
      existing.push(customValue)
      valuesByLeadId.set(customValue.lead_id, existing)
    }
  }

  return { leads, customFieldDefs: defs, valuesByLeadId }
}

// Processa uma única linha de dados (compartilhado entre CSV e XLSX import)
async function processLeadRow(
  row: Record<string, any>,
  _lineNumber: number,
  defaults: LeadImportDefaults | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = normalizeRowKeys(row)
    const payload = {
      name: String(r['name'] || '').trim(),
      company: String(r['company'] || '').trim() || undefined,
      value: parseValue(r['value']),
      phone: String(r['phone'] || '').trim() || undefined,
      email: String(r['email'] || '').trim() || undefined,
      origin: String(r['origin'] || '').trim() || undefined,
      status: String(r['status'] || '').trim() || undefined,
      pipeline_id: String(r['pipeline_id'] || '').trim() || defaults?.default_pipeline_id || '',
      stage_id: String(r['stage_id'] || '').trim() || defaults?.default_stage_id || '',
      notes: String(r['notes'] || '').trim() || undefined
    }

    if (!payload.name) {
      throw new Error('Campo "name" é obrigatório')
    }

    if (!payload.pipeline_id || !payload.stage_id) {
      throw new Error('Pipeline e Stage são obrigatórios (preencha no arquivo ou selecione padrão no modal)')
    }

    const result = await createLead(payload)
    // O cliente Supabase não lança em falha de insert: o erro vem em result.error.
    if (result?.error) {
      throw new Error(result.error.message || 'Falha ao salvar o lead no banco')
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro desconhecido' }
  }
}

// Valida se os cabeçalhos obrigatórios estão presentes
function validateHeaders(headers: string[], defaults: LeadImportDefaults | undefined): void {
  const normalized = headers.map(h => h.trim().toLowerCase())
  const required = ['name', 'pipeline_id', 'stage_id']
  const missing = required.filter(r => !normalized.includes(r))
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
  const { leads, customFieldDefs, valuesByLeadId } = await fetchLeadsForExport(filters)
  const rows = leads.map(l => buildExportRow(l, customFieldDefs, valuesByLeadId))
  const csv = toCsv(rows, { header: includeHeaders })
  downloadCsv('leads.csv', csv)
}

export async function exportLeadsToXlsx(options: LeadExportOptions = {}) {
  const { filters } = options
  const { leads, customFieldDefs, valuesByLeadId } = await fetchLeadsForExport(filters)
  const rows = leads.map(l => buildExportRow(l, customFieldDefs, valuesByLeadId))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')
  XLSX.writeFile(wb, 'leads.xlsx')
}

export async function importLeadsFromCsv(file: File, defaults?: LeadImportDefaults): Promise<LeadImportResult> {
  const content = await file.text()
  const { headers, rows } = parseCsv(content)
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Arquivo com ${rows.length} linhas excede o limite de ${MAX_IMPORT_ROWS}.`)
  }
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

  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Arquivo com ${rawRows.length} linhas excede o limite de ${MAX_IMPORT_ROWS}.`)
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
