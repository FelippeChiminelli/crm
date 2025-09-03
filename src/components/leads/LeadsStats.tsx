import type { Lead } from '../../types'
import { UserGroupIcon, FireIcon, ExclamationTriangleIcon, CloudIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'

interface LeadsStatsProps {
  leads: Lead[]
}

export function LeadsStats({ leads }: LeadsStatsProps) {
  const totalLeads = leads.length
  const quenteLeads = leads.filter(lead => lead.status === 'quente').length
  const mornoLeads = leads.filter(lead => lead.status === 'morno').length
  const frioLeads = leads.filter(lead => lead.status === 'frio').length
  
  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)

  return (
    <div className={ds.stats.container()}>
      <div className={ds.stats.card()}>
        <div className="flex items-center justify-between">
          <div>
            <p className={ds.stats.label()}>Total</p>
            <p className={ds.stats.value()}>{totalLeads}</p>
          </div>
          <div className={ds.stats.icon('bg-gray-100')}>
            <UserGroupIcon className="w-5 h-5 text-gray-500" />
          </div>
        </div>
      </div>

      <div className={ds.stats.card()}>
        <div className="flex items-center justify-between">
          <div>
            <p className={ds.stats.label()}>Quentes</p>
            <p className={`${ds.stats.value()} text-red-600`}>{quenteLeads}</p>
          </div>
          <div className={ds.stats.icon('bg-red-100')}>
            <FireIcon className="w-5 h-5 text-red-500" />
          </div>
        </div>
      </div>

      <div className={ds.stats.card()}>
        <div className="flex items-center justify-between">
          <div>
            <p className={ds.stats.label()}>Mornos</p>
            <p className={`${ds.stats.value()} text-yellow-600`}>{mornoLeads}</p>
          </div>
          <div className={ds.stats.icon('bg-yellow-100')}>
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className={ds.stats.card()}>
        <div className="flex items-center justify-between">
          <div>
            <p className={ds.stats.label()}>Frios</p>
            <p className={`${ds.stats.value()} text-blue-600`}>{frioLeads}</p>
          </div>
          <div className={ds.stats.icon('bg-blue-100')}>
            <CloudIcon className="w-5 h-5 text-blue-500" />
          </div>
        </div>
      </div>

      <div className={ds.stats.card()}>
        <div className="flex items-center justify-between">
          <div>
            <p className={ds.stats.label()}>Valor Total</p>
            <p className={`${ds.stats.value()} text-green-600`}>
              {totalValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </p>
          </div>
          <div className={ds.stats.icon('bg-green-100')}>
            <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  )
} 