import { supabase } from '../supabaseClient'
import { getUserEmpresaId } from '../authService'
import { uploadLeadAttachment } from '../leadAttachmentService'
import { getContractTemplateById } from './contractTemplateService'
import { buildContractPdf } from './contractPdfBuilder'
import { sendContractByWhatsApp } from './contractWhatsAppSender'
import { formatContractNumber } from './contractFormatters'
import {
  findMissingRequiredVariables,
  resolveContractVariables,
} from './contractVariableResolver'
import SecureLogger from '../../utils/logger'
import type { Contract, ContractTemplate, LeadAttachment } from '../../types'

/** Emissão de contratos: valida, numera, gera o PDF, anexa ao lead e registra. */

const TABLE = 'contracts'

// Variáveis preenchidas pelo próprio sistema no momento da emissão; exigi-las
// na validação bloquearia a geração sem motivo.
const SYSTEM_VARIABLE_PREFIX = 'contrato.'

export class MissingContractVariablesError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Dados obrigatórios ausentes: ${missing.join(', ')}`)
    this.name = 'MissingContractVariablesError'
  }
}

export interface GenerateContractParams {
  leadId: string
  templateId: string
  automationId?: string | null
  sendWhatsApp?: boolean
  waInstanceId?: string | null
  waCaption?: string | null
}

export interface GenerateContractResult {
  contract: Contract
  attachment: LeadAttachment
  unknownTokens: string[]
  /** Preenchido quando o PDF foi gerado mas o envio por WhatsApp falhou. */
  whatsAppError?: string
}

export async function generateContract(
  params: GenerateContractParams
): Promise<GenerateContractResult> {
  const { leadId, templateId, automationId, sendWhatsApp, waInstanceId, waCaption } = params

  const empresaId = await getUserEmpresaId()
  if (!empresaId) throw new Error('Empresa não identificada')

  const { data: template, error: templateError } = await getContractTemplateById(templateId)
  if (templateError || !template) {
    throw new Error('Modelo de contrato não encontrado')
  }

  const typedTemplate = template as ContractTemplate

  // Resolve sem número para validar antes de consumir a numeração.
  const resolved = await resolveContractVariables({ leadId, empresaId, contractNumber: null })

  const required = (typedTemplate.required_variables || []).filter(
    (key) => !key.startsWith(SYSTEM_VARIABLE_PREFIX)
  )
  const missing = findMissingRequiredVariables(required, resolved.values)

  if (missing.length > 0) {
    await registerFailedContract({
      empresaId,
      leadId,
      templateId,
      automationId,
      errorMessage: `Dados obrigatórios ausentes: ${missing.join(', ')}`,
      values: resolved.values,
    })
    throw new MissingContractVariablesError(missing)
  }

  const contractNumber = await nextContractNumber()
  const values = {
    ...resolved.values,
    'contrato.numero': formatContractNumber(contractNumber),
  }

  const { blob, unknownTokens } = await buildContractPdf(typedTemplate, values)

  const fileName = buildFileName(typedTemplate.name, contractNumber, resolved.lead.name)
  const file = new File([blob], fileName, { type: 'application/pdf' })
  const attachment = await uploadLeadAttachment(leadId, file)

  const { data: { user } } = await supabase.auth.getUser()

  const { data: contract, error: contractError } = await supabase
    .from(TABLE)
    .insert({
      empresa_id: empresaId,
      template_id: templateId,
      lead_id: leadId,
      attachment_id: attachment.id,
      contract_number: contractNumber,
      status: 'generated',
      file_name: attachment.file_name,
      file_path: attachment.file_path,
      url: attachment.url,
      variables_snapshot: values,
      generated_by: user?.id ?? null,
      automation_id: automationId ?? null,
    })
    .select()
    .single()

  if (contractError) throw contractError

  const result: GenerateContractResult = {
    contract: contract as Contract,
    attachment,
    unknownTokens,
  }

  if (sendWhatsApp) {
    try {
      await sendContractByWhatsApp({
        leadId,
        leadPhone: resolved.lead.phone,
        empresaId,
        instanceId: waInstanceId || '',
        mediaUrl: attachment.url,
        fileName: attachment.file_name,
        caption: waCaption,
      })
    } catch (error) {
      // O contrato já existe e está anexado: o envio falhar não invalida a emissão.
      result.whatsAppError = error instanceof Error ? error.message : String(error)
      SecureLogger.error('Falha ao enviar contrato por WhatsApp', error)
    }
  }

  return result
}

export async function getContractsByLead(leadId: string) {
  const empresaId = await getUserEmpresaId()

  return supabase
    .from(TABLE)
    .select('*')
    .eq('lead_id', leadId)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
}

/**
 * Numeração sequencial por empresa. O incremento acontece no banco porque a
 * emissão parte do cliente: um `count + 1` aqui duplicaria número em vendas
 * marcadas ao mesmo tempo.
 */
async function nextContractNumber(): Promise<number> {
  const { data, error } = await supabase.rpc('next_contract_number')
  if (error) throw error
  return data as number
}

async function registerFailedContract(params: {
  empresaId: string
  leadId: string
  templateId: string
  automationId?: string | null
  errorMessage: string
  values: Record<string, string>
}): Promise<void> {
  const { error } = await supabase.from(TABLE).insert({
    empresa_id: params.empresaId,
    template_id: params.templateId,
    lead_id: params.leadId,
    status: 'error',
    error_message: params.errorMessage,
    variables_snapshot: params.values,
    automation_id: params.automationId ?? null,
  })

  if (error) {
    SecureLogger.error('Falha ao registrar tentativa de contrato com erro', error)
  }
}

function buildFileName(
  templateName: string,
  contractNumber: number,
  leadName?: string
): string {
  const parts = [`Contrato ${formatContractNumber(contractNumber)}`, templateName]
  if (leadName) parts.push(leadName)
  return `${parts.join(' - ').replace(/[/\\?%*:|"<>]/g, '-')}.pdf`
}
