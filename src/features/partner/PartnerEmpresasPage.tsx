import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { PartnerLayout } from './PartnerLayout'
import { EmpresasList } from './components/EmpresasList'
import { usePartnerEmpresas } from './hooks/usePartnerEmpresas'
import { Card, CardContent } from '../../components/ui/Card'
import { BrandLoader } from '../../components/ui/BrandLoader'
import { ds, statusColors } from '../../utils/designSystem'
import { useImpersonation } from '../../contexts/ImpersonationContext'
import {
  getEmpresasStats,
  type AdminEmpresa,
  type EmpresasStats,
} from '../../services/admin/partnerAdminService'

export default function PartnerEmpresasPage() {
  const {
    empresas,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setSearch,
    setPage,
  } = usePartnerEmpresas()

  const { enter } = useImpersonation()
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const [enterError, setEnterError] = useState<string | null>(null)
  const [stats, setStats] = useState<EmpresasStats | null>(null)

  useEffect(() => {
    let active = true
    getEmpresasStats()
      .then((data) => {
        if (active) setStats(data)
      })
      .catch(() => {
        if (active) setStats(null)
      })
    return () => {
      active = false
    }
  }, [])

  const handleEnter = async (empresa: AdminEmpresa) => {
    if (enteringId) return
    setEnterError(null)
    setEnteringId(empresa.id)
    try {
      await enter({ id: empresa.id, nome: empresa.nome })
      // Reload "hard": reinicializa o app ja com a sessao da empresa. Evita o
      // deadlock do supabase-js ao trocar a sessao dentro da SPA.
      window.location.assign('/dashboard')
    } catch (err) {
      setEnterError(
        err instanceof Error ? err.message : 'Não foi possível acessar a empresa.'
      )
      setEnteringId(null)
    }
  }

  return (
    <PartnerLayout title="Clientes" subtitle="Empresas vinculadas ao parceiro">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou email..."
            className={`${ds.input()} pl-10`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            Total
            <span className="font-semibold text-gray-900">{stats?.total ?? total}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Ativas
            <span className="font-semibold text-green-800">{stats?.ativas ?? '—'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            Inativas
            <span className="font-semibold text-red-800">{stats?.inativas ?? '—'}</span>
          </span>
        </div>
      </div>

      {enterError && (
        <div
          className={`${statusColors.error.bg} ${statusColors.error.border} mb-4 flex items-center gap-3 rounded-lg border p-4`}
        >
          <ExclamationTriangleIcon className={`h-6 w-6 ${statusColors.error.icon}`} />
          <p className={`text-sm font-medium ${statusColors.error.text}`}>{enterError}</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <div
                className={`${statusColors.error.bg} ${statusColors.error.border} flex items-center gap-3 rounded-lg border p-4`}
              >
                <ExclamationTriangleIcon className={`h-6 w-6 ${statusColors.error.icon}`} />
                <p className={`text-sm font-medium ${statusColors.error.text}`}>{error}</p>
              </div>
            </div>
          ) : loading && empresas.length === 0 ? (
            <div className="py-12">
              <BrandLoader variant="inline" text="Carregando empresas..." />
            </div>
          ) : empresas.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Nenhuma empresa encontrada.
            </div>
          ) : (
            <div className="p-2 sm:p-4">
              <EmpresasList
                empresas={empresas}
                onEnter={handleEnter}
                enteringId={enteringId}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            className={ds.button('outline')}
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Pagina {page} de {totalPages}
          </span>
          <button
            className={ds.button('outline')}
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
          >
            Proxima
          </button>
        </div>
      )}
    </PartnerLayout>
  )
}
