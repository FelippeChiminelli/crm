import type { ContractVariable, LeadCustomField } from '../../types'

/**
 * Catálogo de variáveis disponíveis nos templates de contrato.
 *
 * Esta é a fonte única da verdade: o picker do editor e o resolver de valores
 * leem daqui. Se as duas pontas tivessem listas próprias, elas divergiriam no
 * primeiro campo novo e a falha só apareceria ao emitir um contrato real.
 */

export const CUSTOM_FIELD_PREFIX = 'campo.'

export const CONTRACT_FIXED_VARIABLES: ContractVariable[] = [
  { key: 'lead.nome', label: 'Nome do cliente', group: 'Lead', example: 'Maria Souza' },
  { key: 'lead.telefone', label: 'Telefone', group: 'Lead', example: '(11) 98888-7777' },
  { key: 'lead.email', label: 'E-mail', group: 'Lead', example: 'maria@email.com' },
  { key: 'lead.empresa', label: 'Empresa do cliente', group: 'Lead', example: 'Souza Comercio Ltda' },

  { key: 'venda.valor', label: 'Valor da venda', group: 'Venda', example: 'R$ 12.500,00' },
  { key: 'venda.valor_extenso', label: 'Valor por extenso', group: 'Venda', example: 'doze mil e quinhentos reais' },
  { key: 'venda.data', label: 'Data da venda', group: 'Venda', example: '23/09/2026' },
  { key: 'venda.observacoes', label: 'Observações da venda', group: 'Venda', example: 'Pagamento em 3x no cartão' },

  { key: 'empresa.nome', label: 'Nome da empresa', group: 'Empresa', example: 'Advocacia Exemplo' },
  { key: 'empresa.cnpj', label: 'CNPJ', group: 'Empresa', example: '12.345.678/0001-90' },
  { key: 'empresa.endereco', label: 'Endereço', group: 'Empresa', example: 'Rua das Flores, 100' },
  { key: 'empresa.email', label: 'E-mail da empresa', group: 'Empresa', example: 'contato@exemplo.com.br' },
  { key: 'empresa.telefone', label: 'Telefone da empresa', group: 'Empresa', example: '(11) 3333-4444' },

  { key: 'vendedor.nome', label: 'Responsável pela venda', group: 'Vendedor', example: 'João Pereira' },

  { key: 'contrato.numero', label: 'Número do contrato', group: 'Contrato', example: '0042' },
  { key: 'contrato.data_emissao', label: 'Data de emissão', group: 'Contrato', example: '23/09/2026' },
  { key: 'contrato.data_extenso', label: 'Data de emissão por extenso', group: 'Contrato', example: '23 de setembro de 2026' },
]

/** Token que aparece no corpo do template, ex.: `{{lead.nome}}`. */
export function formatVariableToken(key: string): string {
  return `{{${key}}}`
}

/**
 * Chave de um campo personalizado. Usa o nome exato do campo, sem
 * normalizar: a substituição é textual (split/join), então espaços e acentos
 * não causam problema, e o token fica legível para quem monta o template.
 */
export function customFieldVariableKey(fieldName: string): string {
  return `${CUSTOM_FIELD_PREFIX}${fieldName}`
}

/** Monta as variáveis de campos personalizados a partir das definições do pipeline. */
export function buildCustomFieldVariables(fields: LeadCustomField[]): ContractVariable[] {
  return fields.map((field) => ({
    key: customFieldVariableKey(field.name),
    label: field.name,
    group: 'Campos personalizados' as const,
    example: field.type === 'date' ? '01/01/2026' : field.name,
  }))
}

/** Catálogo completo para o picker do editor. */
export function buildContractVariableCatalog(customFields: LeadCustomField[]): ContractVariable[] {
  return [...CONTRACT_FIXED_VARIABLES, ...buildCustomFieldVariables(customFields)]
}
