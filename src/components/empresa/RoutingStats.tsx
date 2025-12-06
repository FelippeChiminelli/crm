import { 
  ChartBarIcon,
  UserGroupIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import type { RoutingStats as RoutingStatsType } from '../../types'

interface RoutingStatsProps {
  stats: RoutingStatsType
}

export function RoutingStats({ stats }: RoutingStatsProps) {
  return (
    <div className={ds.card()}>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <ChartBarIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Estatísticas de Roteamento</h3>
        </div>

        {/* Cards de Totais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">
              {stats.total_distribuicoes}
            </div>
            <div className="text-xs text-blue-700 mt-1">Total distribuições</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-900">
              {stats.distribuicoes_hoje}
            </div>
            <div className="text-xs text-green-700 mt-1">Hoje</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-900">
              {stats.distribuicoes_semana}
            </div>
            <div className="text-xs text-purple-700 mt-1">Esta semana</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-900">
              {stats.distribuicoes_mes}
            </div>
            <div className="text-xs text-orange-700 mt-1">Este mês</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por Vendedor */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <UserGroupIcon className="w-5 h-5 text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-900">Por Vendedor</h4>
            </div>
            
            {stats.por_vendedor.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma distribuição ainda</p>
            ) : (
              <div className="space-y-3">
                {stats.por_vendedor.map((vendedor) => (
                  <div key={vendedor.vendedor_id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {vendedor.vendedor_name}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {vendedor.total}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <span>Hoje: {vendedor.hoje}</span>
                      <span>•</span>
                      <span>Semana: {vendedor.semana}</span>
                      <span>•</span>
                      <span>Mês: {vendedor.mes}</span>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(vendedor.total / stats.total_distribuicoes) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Distribuição por Origem */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <TagIcon className="w-5 h-5 text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-900">Por Origem</h4>
            </div>
            
            {stats.por_origem.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma distribuição ainda</p>
            ) : (
              <div className="space-y-3">
                {stats.por_origem.map((origem) => (
                  <div key={origem.origem} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {origem.origem}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900">
                          {origem.total}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({origem.porcentagem}%)
                        </span>
                      </div>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${origem.porcentagem}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Informação adicional */}
        {stats.total_distribuicoes === 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-800">
              📊 As estatísticas aparecerão aqui assim que os primeiros leads forem distribuídos.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

