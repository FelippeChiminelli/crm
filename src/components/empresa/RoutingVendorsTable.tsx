import { 
  ArrowUpIcon,
  ArrowDownIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { ErrorCard, SuccessCard } from '../ui/LoadingStates'
import { StyledSelect } from '../ui/StyledSelect'
import { updateVendorRotation, updateMultipleVendorsRotation } from '../../services/leadRoutingService'
import type { VendorRotationConfig } from '../../types'

interface RoutingVendorsTableProps {
  vendors: VendorRotationConfig[]
  onUpdate: () => void
}

export function RoutingVendorsTable({ vendors, onUpdate }: RoutingVendorsTableProps) {
  const {
    loading,
    error,
    success,
    executeAsync
  } = useStandardizedLoading()

  // Ordenar vendedores: primeiro os que participam da rotação por ordem, depois os demais
  const sortedVendors = [...vendors].sort((a, b) => {
    if (a.participa_rotacao && !b.participa_rotacao) return -1
    if (!a.participa_rotacao && b.participa_rotacao) return 1
    
    if (a.participa_rotacao && b.participa_rotacao) {
      const ordemA = a.ordem_rotacao ?? 999999
      const ordemB = b.ordem_rotacao ?? 999999
      if (ordemA !== ordemB) return ordemA - ordemB
    }
    
    return a.full_name.localeCompare(b.full_name)
  })

  const handleToggleParticipacao = async (vendorId: string, currentValue: boolean) => {
    await executeAsync(async () => {
      await updateVendorRotation(vendorId, {
        participa_rotacao: !currentValue
      })
      await onUpdate()
    })
  }

  const handleUpdateOrdem = async (vendorId: string, newOrdem: number | null) => {
    await executeAsync(async () => {
      await updateVendorRotation(vendorId, {
        ordem_rotacao: newOrdem
      })
      await onUpdate()
    })
  }

  const handleUpdatePeso = async (vendorId: string, newPeso: number) => {
    if (newPeso < 1) return
    
    await executeAsync(async () => {
      await updateVendorRotation(vendorId, {
        peso_rotacao: newPeso
      })
      await onUpdate()
    })
  }

  const handleUpdatePipelineRotacao = async (vendorId: string, pipelineId: string | null) => {
    await executeAsync(async () => {
      await updateVendorRotation(vendorId, {
        pipeline_rotacao_id: pipelineId || null
      })
      await onUpdate()
    })
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return

    const current = sortedVendors[index]
    const previous = sortedVendors[index - 1]

    if (!current.participa_rotacao || !previous.participa_rotacao) return

    await executeAsync(async () => {
      const currentOrdem = current.ordem_rotacao ?? index + 1
      const previousOrdem = previous.ordem_rotacao ?? index

      await updateMultipleVendorsRotation([
        { vendorId: current.uuid, data: { ordem_rotacao: previousOrdem } },
        { vendorId: previous.uuid, data: { ordem_rotacao: currentOrdem } }
      ])

      await onUpdate()
    })
  }

  const handleMoveDown = async (index: number) => {
    if (index >= sortedVendors.length - 1) return

    const current = sortedVendors[index]
    const next = sortedVendors[index + 1]

    if (!current.participa_rotacao || !next.participa_rotacao) return

    await executeAsync(async () => {
      const currentOrdem = current.ordem_rotacao ?? index + 1
      const nextOrdem = next.ordem_rotacao ?? index + 2

      await updateMultipleVendorsRotation([
        { vendorId: current.uuid, data: { ordem_rotacao: nextOrdem } },
        { vendorId: next.uuid, data: { ordem_rotacao: currentOrdem } }
      ])

      await onUpdate()
    })
  }

  const vendedoresAtivos = sortedVendors.filter(v => v.participa_rotacao)

  return (
    <div className={ds.card()}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Vendedores</h3>
            <p className="text-sm text-gray-600 mt-1">
              {vendedoresAtivos.length} vendedor(es) ativo(s) na rotação
            </p>
          </div>
        </div>

        {/* Mensagens */}
        {error && <ErrorCard message={error} />}
        {success && <SuccessCard message={success} />}

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participa
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ordem
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pipeline Atual
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pipeline de Roteamento
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhum vendedor encontrado
                  </td>
                </tr>
              ) : (
                sortedVendors.map((vendor, index) => (
                  <tr key={vendor.uuid} className={vendor.participa_rotacao ? 'bg-green-50' : ''}>
                    {/* Vendedor */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${vendor.participa_rotacao ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <UserIcon className={`w-5 h-5 ${vendor.participa_rotacao ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vendor.full_name}
                            {vendor.is_admin && (
                              <span className="ml-2 text-xs text-gray-500">(Admin)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{vendor.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Participa da Rotação */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleParticipacao(vendor.uuid, vendor.participa_rotacao)}
                        disabled={loading}
                        className={`
                          inline-flex items-center justify-center w-12 h-6 rounded-full transition-colors
                          ${vendor.participa_rotacao 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-gray-300 hover:bg-gray-400'}
                          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <span className={`
                          block w-4 h-4 bg-white rounded-full transform transition-transform
                          ${vendor.participa_rotacao ? 'translate-x-3' : '-translate-x-3'}
                        `} />
                      </button>
                    </td>

                    {/* Ordem */}
                    <td className="px-4 py-4 text-center">
                      {vendor.participa_rotacao ? (
                        <input
                          type="number"
                          value={vendor.ordem_rotacao ?? ''}
                          onChange={(e) => handleUpdateOrdem(vendor.uuid, e.target.value ? parseInt(e.target.value) : null)}
                          disabled={loading}
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                          min="0"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Peso */}
                    <td className="px-4 py-4 text-center">
                      {vendor.participa_rotacao ? (
                        <input
                          type="number"
                          value={vendor.peso_rotacao}
                          onChange={(e) => handleUpdatePeso(vendor.uuid, parseInt(e.target.value) || 1)}
                          disabled={loading}
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                          min="1"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Pipeline Atual */}
                    <td className="px-4 py-4">
                      {vendor.pipeline ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {vendor.pipeline.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Sem pipeline</span>
                      )}
                    </td>

                    {/* Pipeline de Roteamento */}
                    <td className="px-4 py-4">
                      {vendor.participa_rotacao ? (
                        <div className="min-w-[200px]">
                          <StyledSelect
                            options={[
                              { 
                                value: '', 
                                label: 'Usar pipeline padrão',
                                description: vendor.pipeline ? `(${vendor.pipeline.name})` : '(Sem pipeline)'
                              },
                              ...(vendor.available_pipelines || []).map(p => ({
                                value: p.id,
                                label: p.name
                              }))
                            ]}
                            value={vendor.pipeline_rotacao_id || ''}
                            onChange={(value) => handleUpdatePipelineRotacao(vendor.uuid, value || null)}
                            disabled={loading}
                            placeholder="Selecione uma pipeline"
                            size="sm"
                          />
                          {vendor.pipeline_rotacao_id && (
                            <p className="text-xs text-gray-500 mt-1">
                              💡 Se não selecionar, usa pipeline padrão
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">-</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-4 text-center">
                      {vendor.participa_rotacao && (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={loading || index === 0 || !sortedVendors[index - 1]?.participa_rotacao}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Mover para cima"
                          >
                            <ArrowUpIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={loading || index >= sortedVendors.length - 1 || !sortedVendors[index + 1]?.participa_rotacao}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Mover para baixo"
                          >
                            <ArrowDownIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legenda */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-start space-x-4 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
              <span>Participa da rotação</span>
            </div>
            <div>
              <strong>Ordem:</strong> Define a sequência de distribuição (menor = primeiro)
            </div>
            <div>
              <strong>Peso:</strong> Futuramente permitirá distribuição ponderada
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

