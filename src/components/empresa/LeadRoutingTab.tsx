import { useEffect, useState } from 'react'
import { 
  ArrowPathIcon, 
  InformationCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { LoadingCard, ErrorCard, SuccessCard } from '../ui/LoadingStates'
import { RoutingVendorsTable } from './RoutingVendorsTable'
import { RoutingQueueState } from './RoutingQueueState'
import { RoutingSimulation } from './RoutingSimulation'
import { RoutingStats } from './RoutingStats'
import {
  getVendorsRotationConfig,
  getQueueState,
  getRoutingStats as fetchRoutingStats
} from '../../services/leadRoutingService'
import type { VendorRotationConfig, QueueState, RoutingStats as RoutingStatsType } from '../../types'

export function LeadRoutingTab() {
  const [vendors, setVendors] = useState<VendorRotationConfig[]>([])
  const [queueState, setQueueState] = useState<QueueState | null>(null)
  const [stats, setStats] = useState<RoutingStatsType | null>(null)
  const [showStats, setShowStats] = useState(false)

  const {
    loading,
    error,
    success,
    executeAsync,
    clearMessages
  } = useStandardizedLoading()

  // Carregar dados iniciais
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await executeAsync(async () => {
      const [vendorsData, queueData, statsData] = await Promise.all([
        getVendorsRotationConfig(),
        getQueueState(),
        fetchRoutingStats()
      ])

      setVendors(vendorsData)
      setQueueState(queueData)
      setStats(statsData)
    })
  }

  const handleRefresh = () => {
    clearMessages()
    loadData()
  }

  if (loading && vendors.length === 0) {
    return <LoadingCard title="Carregando configurações de roteamento..." />
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-h-[calc(100vh-160px)] overflow-y-auto pr-1 lg:pr-2 pb-8">
      {/* Mensagens */}
      {error && <ErrorCard message={error} />}
      {success && <SuccessCard message={success} />}

      {/* Cabeçalho */}
      <div className={ds.card()}>
        <div className="p-3 lg:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base lg:text-2xl font-semibold text-gray-900 mb-1 lg:mb-2">
                Roteamento de Leads
              </h2>
              <p className="text-xs lg:text-base text-gray-600 hidden sm:block">
                Configure a distribuição automática de leads usando round-robin.
              </p>
            </div>
            <div className="flex space-x-1 lg:space-x-2 flex-shrink-0">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`${ds.button('secondary')} p-1.5 lg:p-2`}
                title={showStats ? 'Ocultar estatísticas' : 'Ver estatísticas'}
              >
                <ChartBarIcon className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={handleRefresh}
                className={`${ds.button('secondary')} p-1.5 lg:p-2`}
                disabled={loading}
                title="Atualizar"
              >
                <ArrowPathIcon className={`w-4 h-4 lg:w-5 lg:h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Informações adicionais - colapsado no mobile */}
          <div className="mt-3 lg:mt-4 p-2 lg:p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start space-x-2 lg:space-x-3">
              <InformationCircleIcon className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs lg:text-sm text-blue-800">
                <p className="font-medium mb-1">Como funciona?</p>
                <ul className="list-disc list-inside space-y-0.5 lg:space-y-1 text-blue-700">
                  <li className="hidden lg:list-item">Os leads são distribuídos de forma circular (round-robin) entre os vendedores ativos</li>
                  <li className="lg:hidden">Distribuição circular entre vendedores ativos</li>
                  <li className="hidden lg:list-item">Cada vendedor recebe um lead por vez, seguindo a ordem configurada</li>
                  <li className="hidden lg:list-item">O lead é automaticamente atribuído à pipeline do vendedor no stage inicial</li>
                  <li className="lg:hidden">Ordem e pipeline configuráveis por vendedor</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas (condicional) */}
      {showStats && stats && (
        <RoutingStats stats={stats} />
      )}

      {/* Estado da Fila e Simulação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
        <RoutingQueueState 
          queueState={queueState} 
          onRefresh={loadData}
        />
        <RoutingSimulation />
      </div>

      {/* Tabela de Vendedores */}
      <RoutingVendorsTable 
        vendors={vendors}
        onUpdate={loadData}
      />
    </div>
  )
}

