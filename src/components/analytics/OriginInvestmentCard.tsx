import { useState, useCallback } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import type { OriginInvestment } from '../../types'

interface OriginInvestmentCardProps {
  origin: string
  investments: OriginInvestment[]
  totalValue: number
  isExpanded: boolean
  onToggle: () => void
  onCreateInvestment: (data: { start_date: string; end_date: string; value: number; notes?: string }) => Promise<OriginInvestment | null>
  onUpdateInvestment: (id: string, data: { start_date: string; end_date: string; value: number; notes?: string }) => Promise<OriginInvestment | null>
  onDeleteInvestment: (id: string) => Promise<boolean>
}

export function OriginInvestmentCard({
  origin,
  investments,
  totalValue,
  isExpanded,
  onToggle,
  onCreateInvestment,
  onUpdateInvestment,
  onDeleteInvestment
}: OriginInvestmentCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header da origem */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-900 flex-1 text-left">{origin}</span>
        <span className="text-xs text-gray-500">{investments.length} período(s)</span>
        {totalValue > 0 && (
          <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            {formatCurrency(totalValue)}
          </span>
        )}
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <OriginInvestmentDetail
          investments={investments}
          onCreateInvestment={onCreateInvestment}
          onUpdateInvestment={onUpdateInvestment}
          onDeleteInvestment={onDeleteInvestment}
        />
      )}
    </div>
  )
}

function OriginInvestmentDetail({
  investments,
  onCreateInvestment,
  onUpdateInvestment,
  onDeleteInvestment
}: {
  investments: OriginInvestment[]
  onCreateInvestment: (data: { start_date: string; end_date: string; value: number; notes?: string }) => Promise<OriginInvestment | null>
  onUpdateInvestment: (id: string, data: { start_date: string; end_date: string; value: number; notes?: string }) => Promise<OriginInvestment | null>
  onDeleteInvestment: (id: string) => Promise<boolean>
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setFormOpen(false)
    setEditingId(null)
    setStartDate('')
    setEndDate('')
    setValue('')
    setNotes('')
  }, [])

  const openEdit = useCallback((inv: OriginInvestment) => {
    setEditingId(inv.id)
    setStartDate(inv.start_date)
    setEndDate(inv.end_date)
    setValue(String(inv.value))
    setNotes(inv.notes || '')
    setFormOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    const numValue = parseFloat(value)
    if (!startDate || !endDate || isNaN(numValue) || endDate < startDate) return

    setSaving(true)
    try {
      const data = { start_date: startDate, end_date: endDate, value: numValue, notes: notes || undefined }
      if (editingId) {
        await onUpdateInvestment(editingId, data)
      } else {
        await onCreateInvestment(data)
      }
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar investimento:', error)
    } finally {
      setSaving(false)
    }
  }, [startDate, endDate, value, notes, editingId, onCreateInvestment, onUpdateInvestment, resetForm])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Excluir este investimento?')) return
    await onDeleteInvestment(id)
  }, [onDeleteInvestment])

  const canSave = startDate && endDate && value && !isNaN(parseFloat(value)) && endDate >= startDate

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
      {/* Botão adicionar */}
      {!formOpen && (
        <button
          onClick={() => { resetForm(); setFormOpen(true) }}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Novo Período
        </button>
      )}

      {/* Formulário inline */}
      {formOpen && (
        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Data início</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Data fim</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Valor investido (R$)</label>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Ex: 5000"
              step="0.01"
              min="0"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Campanha de verão"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-1">
            <button
              onClick={resetForm}
              disabled={saving}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Cancelar"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded transition-colors disabled:opacity-40"
              title="Salvar"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lista de investimentos */}
      {investments.length > 0 ? (
        <div className="space-y-1">
          {investments.map(inv => (
            <div
              key={inv.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs group bg-white border border-gray-100 hover:border-gray-200"
            >
              <span className="text-gray-600 flex-1 truncate">
                {formatDate(inv.start_date)} - {formatDate(inv.end_date)}
                {inv.notes && <span className="text-gray-400 ml-1">({inv.notes})</span>}
              </span>
              <span className="font-mono font-semibold text-gray-900 shrink-0">
                {formatCurrency(Number(inv.value))}
              </span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => openEdit(inv)}
                  className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                  title="Editar"
                >
                  <PencilIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(inv.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                  title="Excluir"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !formOpen && (
        <p className="text-[10px] text-gray-400 text-center py-2">
          Nenhum investimento cadastrado para esta origem.
        </p>
      )}
    </div>
  )
}
