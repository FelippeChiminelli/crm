import { CreateLeadActionForm } from './CreateLeadActionForm'
import { MoveLeadActionForm } from './MoveLeadActionForm'
import { CreateTaskActionForm } from './CreateTaskActionForm'
import { AssignResponsibleActionForm } from './AssignResponsibleActionForm'
import { RoundRobinActionInfo } from './RoundRobinActionInfo'
import { MarkSoldActionInfo } from './MarkSoldActionInfo'
import { MarkLostActionInfo } from './MarkLostActionInfo'
import { GenerateContractActionForm } from './GenerateContractActionForm'
import { WebhookActionForm } from './WebhookActionForm'
import { WhatsAppActionForm } from './WhatsAppActionForm'
import { MetaCapiActionForm } from './MetaCapiActionForm'

/** Campos da ação em edição; cada formulário só aparece para o seu tipo. */
export function ActionFormFields() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CreateLeadActionForm />
      <MoveLeadActionForm />
      <CreateTaskActionForm />
      <AssignResponsibleActionForm />
      <RoundRobinActionInfo />
      <MarkSoldActionInfo />
      <MarkLostActionInfo />
      <GenerateContractActionForm />
      <WebhookActionForm />
      <WhatsAppActionForm />
      <MetaCapiActionForm />
    </div>
  )
}
