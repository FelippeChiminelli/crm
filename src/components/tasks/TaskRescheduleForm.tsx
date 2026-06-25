import { useState } from 'react'
import { CalendarIcon, ClockIcon, ChatBubbleLeftEllipsisIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'
import { formatDueDateTimePTBR } from '../../utils/date'

export interface RescheduleFormData {
  due_date: string
  due_time: string
  reason: string
}

interface TaskRescheduleFormProps {
  currentDueDate?: string
  currentDueTime?: string
  isSubmitting: boolean
  onSubmit: (data: RescheduleFormData) => Promise<void>
  onCancel: () => void
}

export function TaskRescheduleForm({
  currentDueDate,
  currentDueTime,
  isSubmitting,
  onSubmit,
  onCancel,
}: TaskRescheduleFormProps) {
  const [dueDate, setDueDate] = useState(currentDueDate || '')
  const [dueTime, setDueTime] = useState(currentDueTime || '')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!dueDate.trim()) {
      newErrors.due_date = 'Informe a nova data de vencimento'
    }

    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      newErrors.reason = 'Informe o motivo do reagendamento'
    } else if (trimmedReason.length < 3) {
      newErrors.reason = 'O motivo deve ter pelo menos 3 caracteres'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    await onSubmit({ due_date: dueDate.trim(), due_time: dueTime.trim(), reason: trimmedReason })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
      <div className="rounded-lg p-3 lg:p-4 bg-blue-50 border border-blue-100">
        <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          Prazo atual
        </h4>
        <p className="text-sm text-blue-800">
          {formatDueDateTimePTBR(currentDueDate, currentDueTime)}
        </p>
      </div>

      <div className="rounded-lg p-3 lg:p-4 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 lg:mb-4 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-orange-600" />
          Novo prazo
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nova data de vencimento *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.due_date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.due_date && (
              <p className="text-red-600 text-xs mt-1">{errors.due_date}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <ClockIcon className="w-3 h-3 inline mr-1" />
              Novo horário (opcional)
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg p-3 lg:p-4 bg-gray-50">
        <label className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-orange-600" />
          Motivo do reagendamento *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          placeholder="Descreva o motivo do reagendamento..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${
            errors.reason ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.reason && (
          <p className="text-red-600 text-xs mt-1">{errors.reason}</p>
        )}
      </div>

      <div className="flex flex-row items-center justify-end gap-2 sm:gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors whitespace-nowrap"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-orange-500 text-white px-4 py-2.5 text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          {isSubmitting ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Reagendando...
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4" />
              Confirmar reagendamento
            </>
          )}
        </button>
      </div>
    </form>
  )
}
