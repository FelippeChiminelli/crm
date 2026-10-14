import { useMemo, useState } from 'react'
import { ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { MetaAdsTreeRow } from './MetaAdsTreeRow'
import { sortMetaAdsTree, type MetaAdsSortKey } from './buildMetaAdsTree'
import type { MetaAdsTreeNode } from '../../../types'

interface MetaAdsHierarchyTableProps {
  tree: MetaAdsTreeNode[]
  loading: boolean
  formatCurrency: (value: number) => string
}

const COLUMNS: { key: MetaAdsSortKey; label: string }[] = [
  { key: 'clicks', label: 'Cliques' },
  { key: 'leads', label: 'Leads' },
  { key: 'sales', label: 'Vendas' },
  { key: 'conversion_rate', label: 'Conversão' },
  { key: 'revenue', label: 'Receita' },
  { key: 'losses', label: 'Perdas' },
  { key: 'open_leads', label: 'Em aberto' }
]

function collectKeys(nodes: MetaAdsTreeNode[]): string[] {
  return nodes.flatMap((node) => [node.key, ...collectKeys(node.children)])
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-gray-400" />
  const Icon = direction === 'asc' ? ChevronUpIcon : ChevronDownIcon
  return <Icon className="w-3.5 h-3.5 text-gray-700" />
}

export function MetaAdsHierarchyTable({ tree, loading, formatCurrency }: MetaAdsHierarchyTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<MetaAdsSortKey>('leads')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')

  const sortedTree = useMemo(() => sortMetaAdsTree(tree, sortKey, direction), [tree, sortKey, direction])

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSort = (key: MetaAdsSortKey) => {
    if (key === sortKey) {
      setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDirection(key === 'name' ? 'asc' : 'desc')
    }
  }

  const allKeys = useMemo(() => collectKeys(tree), [tree])
  const allExpanded = allKeys.length > 0 && allKeys.every((key) => expanded.has(key))

  if (loading) {
    return <div className="bg-white rounded-lg border border-gray-200 p-6 h-64 animate-pulse" />
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-2 p-4 lg:p-6 pb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Campanhas, conjuntos e anúncios</h3>
          <p className="text-xs text-gray-500 mt-1">
            Um lead que clicou em mais de um anúncio conta em cada um deles, mas só uma vez no
            conjunto e na campanha. Por isso a soma das linhas internas pode passar do total acima.
          </p>
        </div>
        {tree.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(allExpanded ? new Set() : new Set(allKeys))}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
          </button>
        )}
      </div>

      {tree.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          Nenhum dado disponível para o período selecionado
        </div>
      ) : (
        <div className="overflow-auto max-h-[560px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-y border-gray-200 bg-gray-50 text-xs text-gray-600">
                <th className="py-2 pl-2 pr-3 text-left font-medium min-w-[260px]">
                  <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1">
                    Nome <SortIcon active={sortKey === 'name'} direction={direction} />
                  </button>
                </th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="py-2 px-3 text-right font-medium whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="inline-flex items-center gap-1"
                    >
                      {column.label} <SortIcon active={sortKey === column.key} direction={direction} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTree.map((node) => (
                <MetaAdsTreeRow
                  key={node.key}
                  node={node}
                  expanded={expanded}
                  onToggle={toggle}
                  formatCurrency={formatCurrency}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
