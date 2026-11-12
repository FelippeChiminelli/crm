import { useLeadProcuras } from '../../../hooks/useLeadProcuras'
import { useIsLojaVeiculo } from '../../../hooks/useIsLojaVeiculo'
import { LeadProcuraCard } from '../detail-modal/LeadProcuraCard'

interface LeadProcuraSectionProps {
  leadId: string
  empresaId?: string
  readOnly?: boolean
}

/** Procura de veículo na página do lead (destino do aviso "chegou um carro"). */
export function LeadProcuraSection({ leadId, empresaId, readOnly }: LeadProcuraSectionProps) {
  // Procura de veículo é exclusiva de lojas de veículos
  const isLojaVeiculo = useIsLojaVeiculo()
  const procura = useLeadProcuras(leadId, empresaId, isLojaVeiculo)

  if (!isLojaVeiculo || !empresaId) return null

  return (
    <LeadProcuraCard
      leadId={leadId}
      empresaId={empresaId}
      readOnly={readOnly}
      procuras={procura.procuras}
      matches={procura.matches}
      loading={procura.loading}
      onChanged={procura.refresh}
    />
  )
}
