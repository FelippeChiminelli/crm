import { useState, useEffect, useCallback } from 'react'
import {
  XMarkIcon,
  BanknotesIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { getAllLeadOrigins } from '../../services/leadService'
import {
  getOriginInvestments,
  createOriginInvestment,
  updateOriginInvestment,
  deleteOriginInvestment
} from '../../services/originInvestmentService'
import type { OriginInvestment } from '../../types'
import { OriginInvestmentCard } from './OriginInvestmentCard'

interface OriginInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  onInvestmentsChanged?: () => void
}

export function OriginInvestmentModal({ isOpen, onClose, onInvestmentsChanged }: OriginInvestmentModalProps) {
  const [origins, setOrigins] = useState<string[]>([])
  const [investments, setInvestments] = useState<OriginInvestment[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [newOriginInput, setNewOriginInput] = useState('')
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [originsData, investmentsData] = await Promise.all([
        getAllLeadOrigins(),
        getOriginInvestments()
      ])

      const investmentOrigins = investmentsData.map(i => i.origin)
      const allOrigins = [...new Set([...originsData, ...investmentOrigins])].sort(
        (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
      )

      setOrigins(allOrigins)
      setInvestments(investmentsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) loadData()
  }, [isOpen, loadData])

  const handleAddOrigin = useCallback(() => {
    const trimmed = newOriginInput.trim()
    if (!trimmed || origins.includes(trimmed)) return
    setOrigins(prev => [...prev, trimmed].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())))
    setNewOriginInput('')
    setExpandedOrigin(trimmed)
  }, [newOriginInput, origins])

  const handleCreateInvestment = useCallback(async (
    origin: string,
    data: { start_date: string; end_date: string; value: number; notes?: string }
  ) => {
    const result = await createOriginInvestment({ origin, ...data })
    if (result) {
      setInvestments(prev => [...prev, result])
      onInvestmentsChanged?.()
    }
    return result
  }, [onInvestmentsChanged])

  const handleUpdateInvestment = useCallback(async (
    id: string,
    data: { start_date: string; end_date: string; value: number; notes?: string }
  ) => {
    const result = await updateOriginInvestment(id, data)
    if (result) {
      setInvestments(prev => prev.map(inv => inv.id === id ? result : inv))
      onInvestmentsChanged?.()
    }
    return result
  }, [onInvestmentsChanged])

  const handleDeleteInvestment = useCallback(async (id: string) => {
    const success = await deleteOriginInvestment(id)
    if (success) {
      setInvestments(prev => prev.filter(inv => inv.id !== id))
      onInvestmentsChanged?.()
    }
    return success
  }, [onInvestmentsChanged])

  const filteredOrigins = origins.filter(
    o => o.toLowerCase().includes(search.toLowerCase())
  )

  const getInvestmentsForOrigin = (origin: string) =>
    investments.filter(inv => inv.origin === origin)

  const getTotalForOrigin = (origin: string) =>
    getInvestmentsForOrigin(origin).reduce((sum, inv) => sum + Number(inv.value), 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <BanknotesIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Investimentos por Origem</h2>
              <p className="text-xs text-gray-500">Cadastre o valor investido por origem e período</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search + Add Origin */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar origem..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOriginInput}
              onChange={e => setNewOriginInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddOrigin()}
              placeholder="Nova origem (ex: Google Ads)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={handleAddOrigin}
              disabled={!newOriginInput.trim()}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40"
            >
              <PlusIcon className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredOrigins.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              {search ? 'Nenhuma origem encontrada' : 'Nenhuma origem cadastrada nos leads'}
            </div>
          ) : (
            filteredOrigins.map(origin => (
              <OriginInvestmentCard
                key={origin}
                origin={origin}
                investments={getInvestmentsForOrigin(origin)}
                totalValue={getTotalForOrigin(origin)}
                isExpanded={expandedOrigin === origin}
                onToggle={() => setExpandedOrigin(expandedOrigin === origin ? null : origin)}
                onCreateInvestment={(data) => handleCreateInvestment(origin, data)}
                onUpdateInvestment={handleUpdateInvestment}
                onDeleteInvestment={handleDeleteInvestment}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
