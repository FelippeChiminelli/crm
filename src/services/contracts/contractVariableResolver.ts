import { supabase } from '../supabaseClient'
import { getCurrentEmpresa } from '../empresaService'
import { getCustomFieldsByPipeline } from '../leadCustomFieldService'
import { getCustomValuesByLead } from '../leadCustomValueService'
import { customFieldVariableKey } from './contractVariableCatalog'
import {
  formatContractNumber,
  formatCurrency,
  formatCurrencyInWords,
  formatDate,
  formatLongDate,
} from './contractFormatters'
import type { Lead, LeadCustomField } from '../../types'

/**
 * Monta os valores das variáveis de um contrato.
 *
 * O lead é relido do banco porque `markLeadAsSold` grava `sold_value` antes de
 * disparar as automações: quem chama não precisa repassar dados da venda.
 */

export interface ResolvedContractVariables {
  values: Record<string, string>
  lead: Lead
  customFields: LeadCustomField[]
}

export async function resolveContractVariables(params: {
  leadId: string
  empresaId: string
  contractNumber: number | null
}): Promise<ResolvedContractVariables> {
  const { leadId, empresaId, contractNumber } = params

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('empresa_id', empresaId)
    .single()

  if (leadError || !lead) {
    throw new Error('Lead não encontrado para emissão do contrato')
  }

  const typedLead = lead as Lead

  const [empresa, responsibleName, customFieldsResult, customValuesResult] = await Promise.all([
    getCurrentEmpresa(),
    resolveResponsibleName(typedLead.responsible_uuid),
    getCustomFieldsByPipeline(typedLead.pipeline_id),
    getCustomValuesByLead(leadId),
  ])

  const customFields = (customFieldsResult.data || []) as LeadCustomField[]
  const customValues = customValuesResult.data || []
  const now = new Date().toISOString()

  const values: Record<string, string> = {
    'lead.nome': typedLead.name || '',
    'lead.telefone': typedLead.phone || '',
    'lead.email': typedLead.email || '',
    'lead.empresa': typedLead.company || '',

    'venda.valor': formatCurrency(typedLead.sold_value ?? typedLead.value),
    'venda.valor_extenso': formatCurrencyInWords(typedLead.sold_value ?? typedLead.value),
    'venda.data': formatDate(typedLead.sold_at),
    'venda.observacoes': typedLead.sale_notes || '',

    'empresa.nome': empresa?.nome || '',
    'empresa.cnpj': empresa?.cnpj || '',
    'empresa.endereco': empresa?.endereco || '',
    'empresa.email': empresa?.email || '',
    'empresa.telefone': empresa?.telefone || '',

    'vendedor.nome': responsibleName,

    'contrato.numero': formatContractNumber(contractNumber),
    'contrato.data_emissao': formatDate(now),
    'contrato.data_extenso': formatLongDate(now),
  }

  // Campos personalizados: o valor é indexado por field_id, então precisamos
  // das definições para chegar ao nome que aparece no token do template.
  const valueByFieldId = new Map(customValues.map((item: any) => [item.field_id, item.value]))
  for (const field of customFields) {
    const rawValue = valueByFieldId.get(field.id)
    values[customFieldVariableKey(field.name)] = formatCustomFieldValue(field, rawValue)
  }

  return { values, lead: typedLead, customFields }
}

async function resolveResponsibleName(responsibleUuid?: string | null): Promise<string> {
  if (!responsibleUuid) return ''

  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('uuid', responsibleUuid)
    .maybeSingle()

  return (data as any)?.full_name || ''
}

function formatCustomFieldValue(field: LeadCustomField, rawValue: unknown): string {
  if (rawValue == null || rawValue === '') return ''
  const value = String(rawValue)

  if (field.type === 'date') return formatDate(value)
  if (field.type === 'multiselect') return value.split(',').join(', ')
  return value
}

/**
 * Variáveis obrigatórias do template que ficaram sem valor. A emissão é
 * bloqueada quando esta lista não está vazia, para não circular contrato com
 * lacuna em dado essencial (CPF, endereço do contratante, etc).
 */
export function findMissingRequiredVariables(
  requiredVariables: string[],
  values: Record<string, string>
): string[] {
  return requiredVariables.filter((key) => !values[key] || !values[key].trim())
}
