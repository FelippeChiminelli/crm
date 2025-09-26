export interface AutomationCreateTaskPromptInput {
  ruleId: string
  leadId: string
  pipelineId?: string
  defaultTitle?: string
  defaultPriority?: string
  defaultAssignedTo?: string
  defaultDueDate?: string
  defaultDueTime?: string
}

export interface AutomationCreateTaskPromptOutput {
  due_date?: string
  due_time?: string
}

type PromptHandler = (input: AutomationCreateTaskPromptInput) => Promise<AutomationCreateTaskPromptOutput | null>

let createTaskPromptHandler: PromptHandler | null = null

export function registerAutomationCreateTaskPrompt(handler: PromptHandler) {
  createTaskPromptHandler = handler
}

export async function requestAutomationCreateTaskPrompt(input: AutomationCreateTaskPromptInput): Promise<AutomationCreateTaskPromptOutput | null> {
  if (!createTaskPromptHandler) {
    return null
  }
  try {
    return await createTaskPromptHandler(input)
  } catch {
    return null
  }
}


