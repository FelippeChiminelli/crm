import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { toCsv, downloadCsv } from '../utils/csv'
import { formatSituacao, formatTelefone, formatUltimoContato } from '../utils/leadsSemContatoFormat'
import { buildLeadsSemContatoPdf } from './leadsSemContatoPdf'
import {
  getLeadsSemContato,
  type LeadSemContato,
  type LeadsSemContatoFilters
} from './leadsSemContatoService'

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

export type LeadSemContatoExportRow = Record<string, string | number>

/** Teto de p_limit em get_leads_sem_contato_filtrado. */
const RPC_PAGE_SIZE = 200
export const MAX_EXPORT_ROWS = 10000

async function fetchAllLeadsSemContato(filters: LeadsSemContatoFilters): Promise<LeadSemContato[]> {
  const first = await getLeadsSemContato(filters, 1, RPC_PAGE_SIZE)
  if (first.total > MAX_EXPORT_ROWS) {
    throw new Error(`São ${first.total} leads; o limite de exportação é ${MAX_EXPORT_ROWS}. Refine os filtros.`)
  }

  const rows = [...first.rows]
  for (let page = 2; rows.length < first.total; page++) {
    const next = await getLeadsSemContato(filters, page, RPC_PAGE_SIZE)
    if (next.rows.length === 0) break
    rows.push(...next.rows)
  }
  return rows
}

function buildExportRow(row: LeadSemContato): LeadSemContatoExportRow {
  return {
    'Lead': row.nome,
    'Telefone': formatTelefone(row.telefone),
    'Responsável': row.responsavel,
    'Funil': row.pipeline ?? 'Sem funil',
    'Etapa': row.etapa ?? '',
    'Origem': row.origem ?? '',
    'Último contato': formatUltimoContato(row),
    'Situação': formatSituacao(row),
    'Dias sem contato': row.dias_parado
  }
}

function describeFilters(filters: LeadsSemContatoFilters): string {
  const periodo = filters.maxDiasParado !== null
    ? `entre ${filters.diasParado} e ${filters.maxDiasParado} dias`
    : `há ${filters.diasParado}+ ${filters.diasParado === 1 ? 'dia' : 'dias'}`
  return `Sem contato ${periodo}`
}

function exportCsv(rows: LeadSemContatoExportRow[], fileName: string) {
  // BOM + ";" para o Excel pt-BR abrir com acentos e colunas corretas.
  downloadCsv(`${fileName}.csv`, `\uFEFF${toCsv(rows, { delimiter: ';' })}`)
}

function exportXlsx(rows: LeadSemContatoExportRow[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads sem contato')
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

/** Exporta todas as linhas que atendem aos filtros atuais, ignorando a paginação da tela. */
export async function exportLeadsSemContato(
  filters: LeadsSemContatoFilters,
  exportFormat: ExportFormat
): Promise<number> {
  const leads = await fetchAllLeadsSemContato(filters)
  if (leads.length === 0) throw new Error('Nenhum lead para exportar com esses filtros.')

  const rows = leads.map(buildExportRow)
  const fileName = `leads-sem-contato-${format(new Date(), 'yyyy-MM-dd')}`

  if (exportFormat === 'csv') exportCsv(rows, fileName)
  else if (exportFormat === 'xlsx') exportXlsx(rows, fileName)
  else await buildLeadsSemContatoPdf(rows, describeFilters(filters), `${fileName}.pdf`)

  return rows.length
}
