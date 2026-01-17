import { useState } from 'react'
import { 
  BeakerIcon,
  UserIcon,
  FunnelIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { LoadingButton, ErrorCard } from '../ui/LoadingStates'
import { simulateRouting } from '../../services/leadRoutingService'
import type { SimulateRoutingResult } from '../../types'

export function RoutingSimulation() {
  const [result, setResult] = useState<SimulateRoutingResult | null>(null)

  const {
    loading,
    error,
    executeAsync,
    clearMessages
  } = useStandardizedLoading()

  const handleSimulate = async () => {
    clearMessages()
    await executeAsync(async () => {
      const simulationResult = await simulateRouting()
      setResult(simulationResult)
    })
  }

  return (
    <div className={ds.card()}>
      <div className="p-3 lg:p-6">
        <div className="flex items-center justify-between mb-3 lg:mb-6">
          <h3 className="text-sm lg:text-lg font-semibold text-gray-900">Simulação</h3>
          <BeakerIcon className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
        </div>

        {/* Descrição */}
        <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4 hidden sm:block">
          Simule a distribuição de um novo lead para ver qual vendedor receberá.
        </p>

        {/* Botão de Simulação */}
        <LoadingButton
          onClick={handleSimulate}
          loading={loading}
          className={`${ds.button('primary')} w-full justify-center text-xs lg:text-sm py-2 lg:py-2.5`}
        >
          <BeakerIcon className="w-4 h-4 lg:w-5 lg:h-5 mr-1.5 lg:mr-2" />
          Simular Próximo Lead
        </LoadingButton>

        {/* Mensagem de erro */}
        {error && (
          <div className="mt-3 lg:mt-4">
            <ErrorCard message={error} />
          </div>
        )}

        {/* Resultado da Simulação */}
        {result && !loading && (
          <div className="mt-4 lg:mt-6 space-y-2 lg:space-y-4">
            <div className="border-t border-gray-200 pt-3 lg:pt-4">
              <div className="text-xs lg:text-sm font-medium text-gray-700 mb-2 lg:mb-3">
                Resultado:
              </div>

              {/* Vendedor */}
              <div className="flex items-start space-x-2 lg:space-x-3 p-2 lg:p-3 bg-purple-50 rounded-lg mb-2 lg:mb-3">
                <div className="p-1.5 lg:p-2 bg-purple-100 rounded-lg">
                  <UserIcon className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] lg:text-xs text-gray-600 mb-0.5">Vendedor</div>
                  <div className="text-xs lg:text-sm font-semibold text-gray-900 truncate">
                    {result.vendedor.name}
                  </div>
                  <div className="text-[10px] lg:text-xs text-gray-500 mt-0.5">
                    {result.posicao_na_fila}/{result.total_vendedores}
                  </div>
                </div>
              </div>

              {/* Pipeline */}
              <div className="flex items-start space-x-2 lg:space-x-3 p-2 lg:p-3 bg-blue-50 rounded-lg mb-2 lg:mb-3">
                <div className="p-1.5 lg:p-2 bg-blue-100 rounded-lg">
                  <FunnelIcon className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] lg:text-xs text-gray-600 mb-0.5">Pipeline</div>
                  <div className="text-xs lg:text-sm font-semibold text-gray-900 truncate">
                    {result.pipeline.name}
                  </div>
                </div>
              </div>

              {/* Stage Inicial */}
              <div className="flex items-start space-x-2 lg:space-x-3 p-2 lg:p-3 bg-green-50 rounded-lg">
                <div className="p-1.5 lg:p-2 bg-green-100 rounded-lg">
                  <MapPinIcon className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] lg:text-xs text-gray-600 mb-0.5">Stage</div>
                  <div className="text-xs lg:text-sm font-semibold text-gray-900 truncate">
                    {result.stage.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Informação adicional */}
            <div className="bg-gray-50 p-2 lg:p-3 rounded-lg text-[10px] lg:text-xs text-gray-600 hidden lg:block">
              💡 Esta é apenas uma simulação.
            </div>
          </div>
        )}

        {/* Estado inicial (sem resultado) */}
        {!result && !loading && !error && (
          <div className="mt-4 lg:mt-6 p-3 lg:p-4 bg-gray-50 rounded-lg text-center">
            <BeakerIcon className="w-8 h-8 lg:w-12 lg:h-12 text-gray-300 mx-auto mb-1 lg:mb-2" />
            <p className="text-xs lg:text-sm text-gray-500">
              Clique para simular
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

