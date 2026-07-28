import { ArrowRightOnRectangleIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../../components/ui/Badge'
import type { AdminEmpresa } from '../../../services/admin/partnerAdminService'

interface EmpresasListProps {
  empresas: AdminEmpresa[]
  onEnter: (empresa: AdminEmpresa) => void
  enteringId: string | null
}

const ENTER_BTN =
  'inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50'

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR')
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <Badge variant={ativo ? 'success' : 'destructive'} appearance="light" size="sm">
      {ativo ? 'Ativa' : 'Inativa'}
    </Badge>
  )
}

export function EmpresasList({ empresas, onEnter, enteringId }: EmpresasListProps) {
  return (
    <>
      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Criada em</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((empresa) => (
              <tr key={empresa.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{empresa.nome}</div>
                  {empresa.nicho && (
                    <div className="text-xs text-gray-500">{empresa.nicho}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{empresa.cnpj || '-'}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{empresa.email || '-'}</div>
                  <div className="text-xs text-gray-400">{empresa.telefone || ''}</div>
                </td>
                <td className="px-4 py-3">
                  {empresa.plano ? (
                    <Badge variant="info" appearance="light" size="sm">
                      {empresa.plano}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge ativo={empresa.ativo} />
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(empresa.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className={ENTER_BTN}
                    disabled={enteringId !== null}
                    onClick={() => onEnter(empresa)}
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    {enteringId === empresa.id ? 'Entrando...' : 'Entrar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 lg:hidden">
        {empresas.map((empresa) => (
          <div
            key={empresa.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BuildingOfficeIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <span className="truncate font-medium text-gray-900">{empresa.nome}</span>
              </div>
              <StatusBadge ativo={empresa.ativo} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">CNPJ</dt>
                <dd className="text-gray-700">{empresa.cnpj || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Plano</dt>
                <dd className="text-gray-700">{empresa.plano || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-gray-400">Contato</dt>
                <dd className="text-gray-700">{empresa.email || '-'}</dd>
              </div>
            </dl>
            <button
              type="button"
              className={`${ENTER_BTN} mt-3 w-full justify-center`}
              disabled={enteringId !== null}
              onClick={() => onEnter(empresa)}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              {enteringId === empresa.id ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

export default EmpresasList
