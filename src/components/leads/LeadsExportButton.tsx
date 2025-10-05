import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { exportLeadsToCsv } from '../../services/leadImportExportService.ts'

interface LeadsExportButtonProps {
  filters?: Record<string, any>
}

export function LeadsExportButton({ filters }: LeadsExportButtonProps) {
  const handleExport = async () => {
    await exportLeadsToCsv({ filters, includeHeaders: true })
  }

  return (
    <button onClick={handleExport} className={ds.headerAction()}>
      <ArrowDownTrayIcon className="w-5 h-5" />
      Exportar CSV
    </button>
  )
}


