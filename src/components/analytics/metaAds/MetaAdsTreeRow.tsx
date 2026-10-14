import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { formatPercent } from './metaAdsLabels'
import type { MetaAdsTreeNode } from '../../../types'

const LEVEL_LABEL: Record<MetaAdsTreeNode['level'], string> = {
  campaign: 'Campanha',
  adset: 'Conjunto',
  ad: 'Anúncio'
}

const LEVEL_INDENT: Record<MetaAdsTreeNode['level'], string> = {
  campaign: 'pl-2',
  adset: 'pl-8',
  ad: 'pl-14'
}

interface MetaAdsTreeRowProps {
  node: MetaAdsTreeNode
  expanded: Set<string>
  onToggle: (key: string) => void
  formatCurrency: (value: number) => string
}

export function MetaAdsTreeRow({ node, expanded, onToggle, formatCurrency }: MetaAdsTreeRowProps) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.key)
  const Chevron = isOpen ? ChevronDownIcon : ChevronRightIcon

  return (
    <>
      <tr className={`border-b border-gray-100 ${node.level === 'campaign' ? 'bg-white' : 'bg-gray-50/60'}`}>
        <td className={`py-2.5 pr-3 ${LEVEL_INDENT[node.level]}`}>
          <button
            type="button"
            onClick={() => hasChildren && onToggle(node.key)}
            className={`flex items-start gap-1.5 text-left min-w-0 ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {hasChildren
              ? <Chevron className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
              : <span className="w-4 flex-shrink-0" />}
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                {LEVEL_LABEL[node.level]}
              </span>
              <span className={`block break-words ${node.level === 'campaign' ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                {node.name}
              </span>
            </span>
          </button>
        </td>
        <td className="py-2.5 px-3 text-right tabular-nums">{node.clicks}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{node.leads}</td>
        <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700">{node.sales}</td>
        <td className="py-2.5 px-3 text-right tabular-nums">{formatPercent(node.conversion_rate)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(node.revenue)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums text-red-600">{node.losses}</td>
        <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">{node.open_leads}</td>
      </tr>
      {isOpen && node.children.map((child) => (
        <MetaAdsTreeRow
          key={child.key}
          node={child}
          expanded={expanded}
          onToggle={onToggle}
          formatCurrency={formatCurrency}
        />
      ))}
    </>
  )
}
