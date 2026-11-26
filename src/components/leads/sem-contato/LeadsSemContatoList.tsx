import { EyeIcon } from '@heroicons/react/24/outline'
import { TruncatedText } from '../../ui/TruncatedText'
import type { LeadSemContato } from '../../../services/leadsSemContatoService'
import {
  DIRECAO_LABELS,
  formatFunil,
  formatTelefone,
  formatUltimoContato
} from '../../../utils/leadsSemContatoFormat'

interface LeadsSemContatoListProps {
  rows: LeadSemContato[]
  loading: boolean
  error: string | null
  onOpenLead: (leadId: string) => void
}

function DiasBadge({ dias }: { dias: number }) {
  const cor = dias >= 7
    ? 'bg-red-50 text-red-700 border-red-200'
    : dias >= 3
      ? 'bg-orange-50 text-orange-700 border-orange-200'
      : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium border rounded-full whitespace-nowrap ${cor}`}>
      {dias} {dias === 1 ? 'dia' : 'dias'}
    </span>
  )
}

function DirecaoBadge({ direcao }: { direcao: LeadSemContato['ultima_direcao'] }) {
  if (!direcao) return null
  const aguardando = direcao === 'inbound'
  return (
    <span
      title={aguardando ? 'O cliente mandou a última mensagem' : 'A empresa mandou a última mensagem'}
      className={`inline-block px-1.5 py-0.5 text-[11px] font-medium rounded whitespace-nowrap ${
        aguardando ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {DIRECAO_LABELS[direcao]}
    </span>
  )
}

function UltimoContato({ row }: { row: LeadSemContato }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className={`truncate ${row.nunca_contatado ? 'text-red-600 font-medium' : ''}`}>
        {formatUltimoContato(row)}
      </span>
      <DirecaoBadge direcao={row.ultima_direcao} />
    </span>
  )
}

/** Cards no mobile; tabela a partir de lg. */
export function LeadsSemContatoList({ rows, loading, error, onOpenLead }: LeadsSemContatoListProps) {
  if (error) {
    return (
      <div className="m-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-14 lg:h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-gray-500">
        Nenhum lead sem contato com esses filtros. 🎉
      </div>
    )
  }

  return (
    <>
      <ul className="lg:hidden divide-y divide-gray-100">
        {rows.map(row => (
          <li key={row.lead_id}>
            <button onClick={() => onOpenLead(row.lead_id)} className="w-full text-left p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 truncate">{row.nome}</p>
                <DiasBadge dias={row.dias_parado} />
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{formatTelefone(row.telefone)}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {formatFunil(row)}{row.origem ? ` · ${row.origem}` : ''}
              </p>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 min-w-0">
                <span className="truncate flex-shrink">{row.responsavel} ·</span>
                <UltimoContato row={row} />
              </div>
            </button>
          </li>
        ))}
      </ul>

      <table className="hidden lg:table w-full text-sm table-fixed">
        <thead>
          <tr className="text-left text-xs text-gray-600 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-gray-50">
            <th className="px-3 py-2 font-medium w-[18%]">Lead</th>
            <th className="px-3 py-2 font-medium w-[12%]">Telefone</th>
            <th className="px-3 py-2 font-medium w-[13%]">Responsável</th>
            <th className="px-3 py-2 font-medium w-[17%]">Funil / Etapa</th>
            <th className="px-3 py-2 font-medium w-[10%]">Origem</th>
            <th className="px-3 py-2 font-medium w-[18%]">Último contato</th>
            <th className="px-3 py-2 font-medium w-[8%]">Sem contato</th>
            <th className="px-3 py-2 w-[4%] text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.lead_id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-900"><TruncatedText text={row.nome} className="block" /></td>
              <td className="px-3 py-2 text-gray-600 truncate">{formatTelefone(row.telefone)}</td>
              <td className="px-3 py-2 text-gray-600"><TruncatedText text={row.responsavel} className="block" /></td>
              <td className="px-3 py-2 text-gray-600"><TruncatedText text={formatFunil(row)} className="block" /></td>
              <td className="px-3 py-2 text-gray-600">
                {row.origem ? <TruncatedText text={row.origem} className="block" /> : '—'}
              </td>
              <td className="px-3 py-2 text-gray-600"><UltimoContato row={row} /></td>
              <td className="px-3 py-2"><DiasBadge dias={row.dias_parado} /></td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => onOpenLead(row.lead_id)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  title="Abrir lead"
                  aria-label="Abrir lead"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
