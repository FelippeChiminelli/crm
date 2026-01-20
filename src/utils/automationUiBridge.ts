// =============================================
// CREATE TASK PROMPT
// =============================================

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

type CreateTaskPromptHandler = (input: AutomationCreateTaskPromptInput) => Promise<AutomationCreateTaskPromptOutput | null>

let createTaskPromptHandler: CreateTaskPromptHandler | null = null

export function registerAutomationCreateTaskPrompt(handler: CreateTaskPromptHandler) {
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

// =============================================
// SALE PROMPT (Marcar como vendido)
// =============================================

export interface AutomationSalePromptInput {
  ruleId: string
  leadId: string
  leadName: string
  estimatedValue?: number
}

export interface AutomationSalePromptOutput {
  soldValue: number
  saleNotes?: string
}

type SalePromptHandler = (input: AutomationSalePromptInput) => Promise<AutomationSalePromptOutput | null>

let salePromptHandler: SalePromptHandler | null = null

export function registerAutomationSalePrompt(handler: SalePromptHandler) {
  salePromptHandler = handler
}

export async function requestAutomationSalePrompt(input: AutomationSalePromptInput): Promise<AutomationSalePromptOutput | null> {
  if (!salePromptHandler) {
    return null
  }
  try {
    return await salePromptHandler(input)
  } catch {
    return null
  }
}

// =============================================
// LOSS PROMPT (Marcar como perdido)
// =============================================

export interface AutomationLossPromptInput {
  ruleId: string
  leadId: string
  leadName: string
  pipelineId?: string
}

export interface AutomationLossPromptOutput {
  lossReasonCategory: string
  lossReasonNotes?: string
}

type LossPromptHandler = (input: AutomationLossPromptInput) => Promise<AutomationLossPromptOutput | null>

let lossPromptHandler: LossPromptHandler | null = null

export function registerAutomationLossPrompt(handler: LossPromptHandler) {
  lossPromptHandler = handler
}

export async function requestAutomationLossPrompt(input: AutomationLossPromptInput): Promise<AutomationLossPromptOutput | null> {
  if (!lossPromptHandler) {
    return null
  }
  try {
    return await lossPromptHandler(input)
  } catch {
    return null
  }
}

// =============================================
// AUTOMATION COMPLETE CALLBACK
// Notifica quando uma ação de automação foi completada
// para que a UI possa recarregar os dados
// =============================================

type AutomationCompleteHandler = () => void

let automationCompleteHandler: AutomationCompleteHandler | null = null

export function registerAutomationCompleteHandler(handler: AutomationCompleteHandler) {
  automationCompleteHandler = handler
}

export function notifyAutomationComplete() {
  if (automationCompleteHandler) {
    try {
      automationCompleteHandler()
    } catch {
      // Ignorar erros no handler
    }
  }
}


