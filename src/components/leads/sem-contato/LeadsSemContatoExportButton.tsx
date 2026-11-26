import { useEffect, useRef, useState } from 'react'
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useToastContext } from '../../../contexts/ToastContext'
import { exportLeadsSemContato, type ExportFormat } from '../../../services/leadsSemContatoExportService'
import type { LeadsSemContatoFilters } from '../../../services/leadsSemContatoService'

const FORMATS: { value: ExportFormat; label: string; iconClass: string }[] = [
  { value: 'pdf', label: 'PDF', iconClass: 'text-red-600' },
  { value: 'xlsx', label: 'Excel (.xlsx)', iconClass: 'text-green-600' },
  { value: 'csv', label: 'CSV', iconClass: 'text-gray-500' }
]

interface LeadsSemContatoExportButtonProps {
  filters: LeadsSemContatoFilters
  disabled?: boolean
}

export function LeadsSemContatoExportButton({ filters, disabled }: LeadsSemContatoExportButtonProps) {
  const { showError, showSuccess } = useToastContext()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleExport = async (exportFormat: ExportFormat) => {
    setOpen(false)
    setLoading(true)
    try {
      const count = await exportLeadsSemContato(filters, exportFormat)
      showSuccess(`${count} ${count === 1 ? 'lead exportado' : 'leads exportados'}`)
    } catch (e) {
      showError('Não foi possível exportar.', e instanceof Error ? e.message : undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        disabled={disabled || loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        {loading ? 'Exportando…' : 'Exportar'}
        <ChevronDownIcon className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          {FORMATS.map(({ value, label, iconClass }) => (
            <button
              key={value}
              onClick={() => handleExport(value)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className={`w-4 h-4 ${iconClass}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
