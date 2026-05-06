import type { Lead, Pipeline, Stage } from '../../types'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { LeadsListMobile } from './LeadsListMobile'
import { LeadsListDesktop } from './LeadsListDesktop'

interface LeadsListProps {
  leads: Lead[]
  pipelines?: Pipeline[]
  stages?: Stage[]
  onDeleteLead?: (leadId: string) => Promise<void>
  onViewLead?: (lead: Lead) => void
  onPipelineChange?: (leadId: string, pipelineId: string) => Promise<void>
  onStageChange?: (leadId: string, stageId: string) => Promise<void>
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAllPage?: (selected: boolean) => void
  sortBy?: 'name' | 'responsible_uuid' | 'origin' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  onSort?: (field: 'name' | 'responsible_uuid' | 'origin' | 'created_at') => void
}

export function LeadsList({ 
  leads, 
  pipelines = [], 
  stages = [], 
  onDeleteLead, 
  onViewLead,
  onPipelineChange,
  onStageChange,
  selectedIds,
  onToggleSelect,
  onSelectAllPage,
  sortBy,
  sortOrder,
  onSort
}: LeadsListProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  if (isDesktop) {
    return (
      <LeadsListDesktop
        leads={leads}
        pipelines={pipelines}
        stages={stages}
        onDeleteLead={onDeleteLead}
        onViewLead={onViewLead}
        onPipelineChange={onPipelineChange}
        onStageChange={onStageChange}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onSelectAllPage={onSelectAllPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
      />
    )
  }

  return (
    <LeadsListMobile
      leads={leads}
      onDeleteLead={onDeleteLead}
      onViewLead={onViewLead}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectAllPage={onSelectAllPage}
    />
  )
}
