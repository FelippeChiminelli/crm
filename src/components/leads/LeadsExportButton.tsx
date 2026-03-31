import { useRef, useState, useEffect } from 'react'
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { exportLeadsToCsv, exportLeadsToXlsx } from '../../services/leadImportExportService'

interface LeadsExportButtonProps {
  filters?: Record<string, any>
}

export function LeadsExportButton({ filters }: LeadsExportButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const handleExportCsv = async () => {
    setShowDropdown(false)
    setLoading(true)
    try {
      await exportLeadsToCsv({ filters, includeHeaders: true })
    } finally {
      setLoading(false)
    }
  }

  const handleExportXlsx = async () => {
    setShowDropdown(false)
    setLoading(true)
    try {
      await exportLeadsToXlsx({ filters })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Botão principal (CSV) + seta para dropdown */}
      <div className="flex">
        <button
          onClick={handleExportCsv}
          disabled={loading}
          className={`${ds.headerAction()} rounded-r-none border-r border-orange-600 disabled:opacity-50`}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          {loading ? 'Exportando...' : 'Exportar'}
        </button>
        <button
          onClick={() => setShowDropdown(prev => !prev)}
          disabled={loading}
          className={`${ds.headerAction()} rounded-l-none px-2 disabled:opacity-50`}
          aria-label="Mais opções de exportação"
          title="Mais opções de exportação"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <button
            onClick={handleExportCsv}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-gray-500" />
            Exportar CSV
          </button>
          <button
            onClick={handleExportXlsx}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-green-600" />
            Exportar Excel (.xlsx)
          </button>
        </div>
      )}
    </div>
  )
}
