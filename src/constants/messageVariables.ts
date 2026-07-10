/**
 * Variáveis dinâmicas disponíveis para uso em mensagens (campanhas, automações, etc).
 *
 * O formato de chave simples ({token}) é o mesmo interpretado pelo n8n no disparo.
 * O front apenas insere o placeholder cru; a substituição real é feita no n8n.
 *
 * Fonte única para evitar duplicação entre os módulos que oferecem inserção de variáveis.
 */
export interface MessageVariable {
  token: string
  label: string
}

export const LEAD_MESSAGE_VARIABLES: MessageVariable[] = [
  { token: '{nome_lead}', label: 'Nome' },
  { token: '{primeiro_nome}', label: 'Primeiro Nome' },
  { token: '{empresa_lead}', label: 'Empresa' },
  { token: '{telefone}', label: 'Telefone' },
  { token: '{email}', label: 'Email' },
  { token: '{valor}', label: 'Valor' },
  { token: '{origem}', label: 'Origem' },
]
