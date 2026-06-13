import { supabase } from './supabaseClient'

export interface ValidatePartnerCodeResult {
  valid: boolean
  parceiroId?: string
  nome?: string
  message?: string
}

interface ValidatePartnerCodeRpcResult {
  success?: boolean
  valid?: boolean
  parceiro_id?: string
  nome?: string
  message?: string
}

export async function validatePartnerCode(codigo: string): Promise<ValidatePartnerCodeResult> {
  const trimmed = codigo.trim()

  if (!trimmed) {
    return {
      valid: false,
      message: 'Informe o código do parceiro',
    }
  }

  const { data, error } = await supabase.rpc('validate_parceiro_codigo', {
    p_codigo: trimmed,
  })

  if (error) {
    return {
      valid: false,
      message: error.message || 'Erro ao validar código do parceiro',
    }
  }

  const result = data as ValidatePartnerCodeRpcResult | null

  if (!result?.success) {
    return {
      valid: false,
      message: result?.message || 'Erro ao validar código do parceiro',
    }
  }

  if (!result.valid) {
    return {
      valid: false,
      message: result.message || 'Código de parceiro inválido',
    }
  }

  return {
    valid: true,
    parceiroId: result.parceiro_id,
    nome: result.nome,
    message: result.message,
  }
}
