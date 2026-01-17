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
      <div className="p-3 lg:p-6">
        <div className="flex items-center justify-between mb-3 lg:mb-6">
          <div>
            <h3 className="text-sm lg:text-lg font-semibold text-gray-900">Vendedores</h3>
            <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1">
              {vendedoresAtivos.length} ativo(s) na rotação
            </p>
          </div>
        </div>

        {/* Mensagens */}
        {error && <ErrorCard message={error} />}
        {success && <SuccessCard message={success} />}

        {/* Mobile: Cards */}
        <div className="lg:hidden space-y-3">
          {sortedVendors.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Nenhum vendedor encontrado
            </div>
          ) : (
            sortedVendors.map((vendor, index) => (
              <div 
                key={vendor.uuid} 
                className={`p-3 rounded-lg border ${vendor.participa_rotacao ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-full ${vendor.participa_rotacao ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <UserIcon className={`w-4 h-4 ${vendor.participa_rotacao ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {vendor.full_name}
                        {vendor.is_admin && <span className="text-xs text-gray-500"> (Admin)</span>}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{vendor.email}</div>
                    </div>
                  </div>
                  
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggleParticipacao(vendor.uuid, vendor.participa_rotacao)}
                    disabled={loading}
                    className={`
                      inline-flex items-center justify-center w-10 h-5 rounded-full transition-colors flex-shrink-0
                      ${vendor.participa_rotacao ? 'bg-green-600' : 'bg-gray-300'}
                      ${loading ? 'opacity-50' : ''}
                    `}
                  >
                    <span className={`block w-3.5 h-3.5 bg-white rounded-full transform transition-transform
                      ${vendor.participa_rotacao ? 'translate-x-2.5' : '-translate-x-2.5'}`} 
                    />
                  </button>
                </div>

                {/* Config se participa */}
                {vendor.participa_rotacao && (
                  <div className="space-y-2 pt-2 border-t border-green-200">
                    {/* Ordem e Peso */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-600 block mb-1">Ordem</label>
                        <input
                          type="number"
                          value={vendor.ordem_rotacao ?? ''}
                          onChange={(e) => handleUpdateOrdem(vendor.uuid, e.target.value ? parseInt(e.target.value) : null)}
                          disabled={loading}
                          className="w-full px-2 py-1 text-center border border-gray-300 rounded text-xs"
                          min="0"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-600 block mb-1">Peso</label>
                        <input
                          type="number"
                          value={vendor.peso_rotacao}
                          onChange={(e) => handleUpdatePeso(vendor.uuid, parseInt(e.target.value) || 1)}
                          disabled={loading}
                          className="w-full px-2 py-1 text-center border border-gray-300 rounded text-xs"
                          min="1"
                        />
                      </div>
                      <div className="flex items-end gap-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={loading || index === 0 || !sortedVendors[index - 1]?.participa_rotacao}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 border border-gray-200 rounded"
                        >
                          <ArrowUpIcon className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={loading || index >= sortedVendors.length - 1 || !sortedVendors[index + 1]?.participa_rotacao}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 border border-gray-200 rounded"
                        >
                          <ArrowDownIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Pipeline */}
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1">Pipeline de Roteamento</label>
                      <StyledSelect
                        options={[
                          { value: '', label: vendor.pipeline ? `Padrão (${vendor.pipeline.name})` : 'Padrão (Sem)' },
                          ...(vendor.available_pipelines || []).map(p => ({ value: p.id, label: p.name }))
                        ]}
                        value={vendor.pipeline_rotacao_id || ''}
                        onChange={(value) => handleUpdatePipelineRotacao(vendor.uuid, value || null)}
                        disabled={loading}
                        size="sm"
                      />
                    </div>
                  </div>
                )}

                {/* Pipeline atual se não participa */}
                {!vendor.participa_rotacao && vendor.pipeline && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                      {vendor.pipeline.name}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop: Tabela */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Participa</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ordem</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Peso</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pipeline Atual</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pipeline Roteamento</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum vendedor encontrado</td>
                </tr>
              ) : (
                sortedVendors.map((vendor, index) => (
                  <tr key={vendor.uuid} className={vendor.participa_rotacao ? 'bg-green-50' : ''}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${vendor.participa_rotacao ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <UserIcon className={`w-5 h-5 ${vendor.participa_rotacao ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vendor.full_name}
                            {vendor.is_admin && <span className="ml-2 text-xs text-gray-500">(Admin)</span>}
                          </div>
                          <div className="text-sm text-gray-500">{vendor.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleParticipacao(vendor.uuid, vendor.participa_rotacao)}
                        disabled={loading}
                        className={`inline-flex items-center justify-center w-12 h-6 rounded-full transition-colors
                          ${vendor.participa_rotacao ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 hover:bg-gray-400'}
                          ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`block w-4 h-4 bg-white rounded-full transform transition-transform
                          ${vendor.participa_rotacao ? 'translate-x-3' : '-translate-x-3'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {vendor.participa_rotacao ? (
                        <input type="number" value={vendor.ordem_rotacao ?? ''} onChange={(e) => handleUpdateOrdem(vendor.uuid, e.target.value ? parseInt(e.target.value) : null)} disabled={loading} className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm" min="0" />
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {vendor.participa_rotacao ? (
                        <input type="number" value={vendor.peso_rotacao} onChange={(e) => handleUpdatePeso(vendor.uuid, parseInt(e.target.value) || 1)} disabled={loading} className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm" min="1" />
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-4">
                      {vendor.pipeline ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{vendor.pipeline.name}</span>
                      ) : <span className="text-sm text-gray-400 italic">Sem pipeline</span>}
                    </td>
                    <td className="px-4 py-4">
                      {vendor.participa_rotacao ? (
                        <div className="min-w-[200px]">
                          <StyledSelect
                            options={[
                              { value: '', label: 'Usar pipeline padrão', description: vendor.pipeline ? `(${vendor.pipeline.name})` : '(Sem pipeline)' },
                              ...(vendor.available_pipelines || []).map(p => ({ value: p.id, label: p.name }))
                            ]}
                            value={vendor.pipeline_rotacao_id || ''}
                            onChange={(value) => handleUpdatePipelineRotacao(vendor.uuid, value || null)}
                            disabled={loading}
                            placeholder="Selecione uma pipeline"
                            size="sm"
                          />
                        </div>
                      ) : <span className="text-sm text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {vendor.participa_rotacao && (
                        <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => handleMoveUp(index)} disabled={loading || index === 0 || !sortedVendors[index - 1]?.participa_rotacao} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Mover para cima">
                            <ArrowUpIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleMoveDown(index)} disabled={loading || index >= sortedVendors.length - 1 || !sortedVendors[index + 1]?.participa_rotacao} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Mover para baixo">
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
        <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-start gap-2 lg:gap-4 text-[10px] lg:text-xs text-gray-600">
            <div className="flex items-center space-x-1 lg:space-x-2">
              <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-green-50 border border-green-200 rounded"></div>
              <span>Participa</span>
            </div>
            <div><strong>Ordem:</strong> Menor = primeiro</div>
          </div>
        </div>
      </div>
    </div>
  )
}

