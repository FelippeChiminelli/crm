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
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Simulação de Roteamento</h3>
          <BeakerIcon className="w-6 h-6 text-purple-600" />
        </div>

        {/* Descrição */}
        <p className="text-sm text-gray-600 mb-4">
          Simule a distribuição de um novo lead para ver qual vendedor receberá o próximo atendimento
          e em qual pipeline/stage o lead será posicionado.
        </p>

        {/* Botão de Simulação */}
        <LoadingButton
          onClick={handleSimulate}
          loading={loading}
          className={`${ds.button('primary')} w-full justify-center`}
        >
          <BeakerIcon className="w-5 h-5 mr-2" />
          Simular Próximo Lead
        </LoadingButton>

        {/* Mensagem de erro */}
        {error && (
          <div className="mt-4">
            <ErrorCard message={error} />
          </div>
        )}

        {/* Resultado da Simulação */}
        {result && !loading && (
          <div className="mt-6 space-y-4">
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-medium text-gray-700 mb-3">
                Resultado da simulação:
              </div>

              {/* Vendedor */}
              <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-1">Vendedor</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {result.vendedor.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Posição {result.posicao_na_fila} de {result.total_vendedores}
                  </div>
                </div>
              </div>

              {/* Pipeline */}
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FunnelIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-1">Pipeline</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {result.pipeline.name}
                  </div>
                </div>
              </div>

              {/* Stage Inicial */}
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPinIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-1">Stage Inicial</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {result.stage.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Informação adicional */}
            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
              💡 <strong>Dica:</strong> Esta é apenas uma simulação. O lead real será atribuído
              quando a função de roteamento for chamada pela integração real de leads.
            </div>
          </div>
        )}

        {/* Estado inicial (sem resultado) */}
        {!result && !loading && !error && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
            <BeakerIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Clique no botão acima para simular
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

