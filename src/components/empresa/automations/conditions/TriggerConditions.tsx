import { LeadCreatedConditions } from './LeadCreatedConditions'
import { StageChangedConditions } from './StageChangedConditions'
import { SoldLostConditions } from './SoldLostConditions'
import { ResponsibleAssignedConditions } from './ResponsibleAssignedConditions'
import { IdleInStageConditions } from './IdleInStageConditions'
import { CustomFieldDateConditions } from './CustomFieldDateConditions'
import { TaskDueDateConditions } from './TaskDueDateConditions'
import { ConversationCreatedConditions } from './ConversationCreatedConditions'
import { BookingCreatedConditions } from './BookingCreatedConditions'
import { TaskCreatedConditions } from './TaskCreatedConditions'

/** Filtros específicos do gatilho escolhido; cada bloco só aparece para o seu gatilho. */
export function TriggerConditions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <LeadCreatedConditions />
      <StageChangedConditions />
      <SoldLostConditions />
      <ResponsibleAssignedConditions />
      <IdleInStageConditions />
      <CustomFieldDateConditions />
      <TaskDueDateConditions />
      <ConversationCreatedConditions />
      <BookingCreatedConditions />
      <TaskCreatedConditions />
    </div>
  )
}
