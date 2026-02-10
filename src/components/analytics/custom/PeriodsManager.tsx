import { useState, useCallback } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { VariablePeriod } from '../../../types'
import { upsertVariablePeriod, deleteVariablePeriod } from '../../../services/calculationService'

interface PeriodsManagerProps {
  variableId: string
  periods: VariablePeriod[]
  onPeriodsChange: (periods: VariablePeriod[]) => void
}

export function PeriodsManager({ variableId, periods, onPeriodsChange }: PeriodsManagerProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setFormOpen(false)
    setEditingId(null)
    setStartDate('')
    setEndDate('')
    setValue('')
  }, [])

  const openCreate = useCallback(() => {
    resetForm()
    setFormOpen(true)
  }, [resetForm])

  const openEdit = useCallback((period: VariablePeriod) => {
    setEditingId(period.id)
    setStartDate(period.start_date)
    setEndDate(period.end_date)
    setValue(String(period.value))
    setFormOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!startDate || !endDate || !value || isNaN(parseFloat(value))) return
    if (endDate < startDate) return

    setSaving(true)
    try {
      const result = await upsertVariablePeriod(
        variableId,
        { start_date: startDate, end_date: endDate, value: parseFloat(value) },
        editingId || undefined
      )

      if (editingId) {
        onPeriodsChange(periods.map(p => p.id === editingId ? result : p))
      } else {
        onPeriodsChange([...periods, result].sort((a, b) => a.start_date.localeCompare(b.start_date)))
      }
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar período:', error)
    } finally {
      setSaving(false)
    }
  }, [variableId, startDate, endDate, value, editingId, periods, onPeriodsChange, resetForm])

  const handleDelete = useCallback(async (periodId: string) => {
    if (!confirm('Excluir este período?')) return
    try {
      await deleteVariablePeriod(periodId)
      onPeriodsChange(periods.filter(p => p.id !== periodId))
    } catch (error) {
      console.error('Erro ao excluir período:', error)
    }
  }, [periods, onPeriodsChange])

  const canSave = startDate && endDate && value && !isNaN(parseFloat(value)) && endDate >= startDate

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">
          Períodos ({periods.length})
        </label>
        {!formOpen && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded hover:bg-violet-100 transition-colors"
          >
            <PlusIcon className="w-3 h-3" />
            Período
          </button>
        )}
      </div>

      {/* Formulário inline */}
      {formOpen && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Data início</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Data fim</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Valor do período</label>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Ex: 1000"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-transparent"
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
              className="p-1.5 text-violet-600 hover:text-violet-800 rounded transition-colors disabled:opacity-40"
              title="Salvar"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de períodos */}
      {periods.length > 0 ? (
        <div className="space-y-1">
          {periods.map(period => (
            <PeriodRow
              key={period.id}
              period={period}
              isEditing={editingId === period.id}
              onEdit={() => openEdit(period)}
              onDelete={() => handleDelete(period.id)}
            />
          ))}
        </div>
      ) : !formOpen && (
        <p className="text-[10px] text-gray-400 text-center py-2">
          Nenhum período definido. O valor padrão será usado.
        </p>
      )}
    </div>
  )
}

// =====================================================
// Linha de período
// =====================================================

function PeriodRow({
  period,
  isEditing,
  onEdit,
  onDelete
}: {
  period: VariablePeriod
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs group ${
      isEditing ? 'bg-violet-50 border border-violet-200' : 'bg-white border border-gray-100 hover:border-gray-200'
    }`}>
      <span className="text-gray-600 flex-1 truncate">
        {formatDate(period.start_date)} - {formatDate(period.end_date)}
      </span>
      <span className="font-mono font-semibold text-gray-900 shrink-0">
        {Number(period.value).toLocaleString('pt-BR')}
      </span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="p-1 text-gray-400 hover:text-violet-600 rounded transition-colors"
          title="Editar"
        >
          <PencilIcon className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
          title="Excluir"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
