import { format } from 'date-fns'
import { EyeIcon } from '@heroicons/react/24/outline'
import { formatBrazilianPhone } from '../../../utils/validations'
import type { LeadSemContato } from '../../../services/leadsSemContatoService'

interface LeadsSemContatoListProps {
  rows: LeadSemContato[]
  loading: boolean
  error: string | null
  onOpenLead: (leadId: string) => void
}

function formatTelefone(telefone: string | null): string {
  return telefone ? formatBrazilianPhone(telefone) : 'Sem telefone'
}

function formatUltimoContato(row: LeadSemContato): string {
  if (row.nunca_contatado || !row.ultimo_contato) return 'Nunca contatado'
  return format(new Date(row.ultimo_contato), 'dd/MM/yyyy HH:mm')
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
        Nenhum lead sem contato nesse intervalo. 🎉
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
              <p className="text-xs text-gray-500 mt-1 truncate">
                {row.responsavel} · {formatUltimoContato(row)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <table className="hidden lg:table w-full text-sm table-fixed">
        <thead>
          <tr className="text-left text-xs text-gray-600 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-gray-50">
            <th className="px-3 py-2 font-medium w-[28%]">Lead</th>
            <th className="px-3 py-2 font-medium w-[18%]">Telefone</th>
            <th className="px-3 py-2 font-medium w-[20%]">Responsável</th>
            <th className="px-3 py-2 font-medium w-[18%]">Último contato</th>
            <th className="px-3 py-2 font-medium w-[10%]">Sem contato</th>
            <th className="px-3 py-2 w-[6%] text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.lead_id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-900 truncate">{row.nome}</td>
              <td className="px-3 py-2 text-gray-600 truncate">{formatTelefone(row.telefone)}</td>
              <td className="px-3 py-2 text-gray-600 truncate">{row.responsavel}</td>
              <td className={`px-3 py-2 truncate ${row.nunca_contatado ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                {formatUltimoContato(row)}
              </td>
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
