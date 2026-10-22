import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { MainLayout } from '../components/layout/MainLayout'
import { Pagination } from '../components/common/Pagination'
import { LeadsSemContatoFilters } from '../components/leads/sem-contato/LeadsSemContatoFilters'
import { LeadsSemContatoList } from '../components/leads/sem-contato/LeadsSemContatoList'
import { useAuthContext } from '../contexts/AuthContext'
import {
  useLeadsSemContato,
  useLeadsSemContatoFilters,
  useVendedoresOptions
} from '../hooks/useLeadsSemContato'
import { ds } from '../utils/designSystem'

export default function LeadsSemContatoPage() {
  const navigate = useNavigate()
  const { isAdmin, profile } = useAuthContext()
  const canViewAll = isAdmin || Boolean(profile?.ver_todos_leads)

  const { filters, page, limit, setFilters, setPage, setLimit } = useLeadsSemContatoFilters()
  const maxInvalido = filters.maxDiasParado !== null && filters.maxDiasParado <= filters.diasParado
  const { data, isLoading, isFetching, error } = useLeadsSemContato(filters, page, limit)
  const { data: vendedores } = useVendedoresOptions(canViewAll)

  const total = maxInvalido ? 0 : data?.total ?? 0
  const pagination = { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }

  return (
    <MainLayout>
      <div className="h-full flex flex-col p-3 lg:p-1.5 space-y-3 overflow-hidden">
        <div className={`${ds.card()} space-y-4`}>
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/leads')}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              aria-label="Voltar para Leads"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-gray-900">Leads sem contato</h1>
              <p className="text-sm text-gray-500">
                Leads abertos sem nenhuma mensagem ou ligação com o cliente no período.
                Mover o card no kanban não conta como contato.
              </p>
            </div>
          </div>

          <LeadsSemContatoFilters
            filters={filters}
            onChange={setFilters}
            vendedores={canViewAll ? vendedores ?? [] : null}
          />
        </div>

        <div className={`${ds.card()} flex-1 min-h-0 flex flex-col !p-0 overflow-hidden`}>
          <div className="px-3 py-2 border-b border-gray-100 text-sm text-gray-600">
            {maxInvalido ? 'Ajuste o intervalo de dias.' : (
              <><span className="font-semibold text-gray-900">{total}</span> {total === 1 ? 'lead' : 'leads'}{isFetching && !isLoading ? ' · atualizando…' : ''}</>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <LeadsSemContatoList
              rows={maxInvalido ? [] : data?.rows ?? []}
              loading={isLoading && !maxInvalido}
              error={error ? 'Não foi possível carregar os leads sem contato.' : null}
              onOpenLead={leadId => navigate(`/leads/${leadId}`)}
            />
          </div>

          {total > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <Pagination
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={setLimit}
                limitOptions={[25, 50, 100, 200]}
              />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
