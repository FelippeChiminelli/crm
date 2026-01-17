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
}

/**
 * Componente responsivo de lista de leads
 * Alterna automaticamente entre visualização mobile (cards) e desktop (tabela)
 */
export function LeadsList({ 
  leads, 
  pipelines = [], 
  stages = [], 
  onDeleteLead, 
  onViewLead,
  onPipelineChange,
  onStageChange
}: LeadsListProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  // Renderiza versão mobile ou desktop baseado no tamanho da tela
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
      />
    )
  }

  return (
    <LeadsListMobile
      leads={leads}
      onDeleteLead={onDeleteLead}
      onViewLead={onViewLead}
    />
  )
}
