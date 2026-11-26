import { format } from 'date-fns'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import auctaLogoSvg from '../assets/logo-principal-login.svg?raw'
import { loadPdfMake } from '../utils/pdfMake'
import type { LeadSemContatoExportRow } from './leadsSemContatoExportService'

/** Larguras na mesma ordem das colunas de buildExportRow. */
const COLUMN_WIDTHS = ['*', 72, '*', '*', '*', 60, 70, 70, 40]

function buildTable(rows: LeadSemContatoExportRow[]): Content {
  const headers = Object.keys(rows[0])
  return {
    table: {
      headerRows: 1,
      widths: COLUMN_WIDTHS,
      body: [
        headers.map(header => ({ text: header, bold: true, fillColor: '#f3f4f6' })),
        ...rows.map(row => headers.map(header => String(row[header] ?? '')))
      ]
    },
    layout: 'lightHorizontalLines'
  }
}

export async function buildLeadsSemContatoPdf(
  rows: LeadSemContatoExportRow[],
  filtersDescription: string,
  fileName: string
): Promise<void> {
  const total = `${rows.length} ${rows.length === 1 ? 'lead' : 'leads'}`
  const geradoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm")

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 36, 30, 40],
    defaultStyle: { font: 'Times', fontSize: 9 },
    content: [
      {
        columns: [
          {
            stack: [
              { text: 'Leads sem contato', fontSize: 16, bold: true },
              { text: `${filtersDescription} · ${total} · gerado em ${geradoEm}`, color: '#555555', margin: [0, 2, 0, 0] }
            ]
          },
          { svg: auctaLogoSvg, width: 110, alignment: 'right' }
        ],
        margin: [0, 0, 0, 12]
      },
      buildTable(rows)
    ],
    footer: (currentPage: number, pageCount: number): Content => ({
      text: `Página ${currentPage} de ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#555555',
      margin: [0, 12, 0, 0]
    })
  }

  const pdfMake = await loadPdfMake()
  await pdfMake.createPdf(doc).download(fileName)
}
