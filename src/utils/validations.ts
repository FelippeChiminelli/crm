/**
 * Módulo centralizado de validações
 * Elimina duplicação de lógica de validação espalhada pelo projeto
 */

// ========================================
// TIPOS DE VALIDAÇÃO
// ========================================

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean
  message: string
}

// ========================================
// VALIDAÇÕES BÁSICAS
// ========================================

export const validators = {
  required: (message = 'Campo obrigatório'): ValidationRule<any> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0
      return value !== null && value !== undefined
    },
    message
  }),

  email: (message = 'Email inválido'): ValidationRule<string> => ({
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length >= min,
    message: message || `Mínimo de ${min} caracteres`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length <= max,
    message: message || `Máximo de ${max} caracteres`
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => regex.test(value),
    message
  }),

  numeric: (message = 'Deve ser um número'): ValidationRule<any> => ({
    validate: (value) => !isNaN(Number(value)),
    message
  }),

  positive: (message = 'Deve ser um número positivo'): ValidationRule<number> => ({
    validate: (value) => Number(value) > 0,
    message
  }),

  min: (minimum: number, message?: string): ValidationRule<number> => ({
    validate: (value) => Number(value) >= minimum,
    message: message || `Valor mínimo: ${minimum}`
  }),

  max: (maximum: number, message?: string): ValidationRule<number> => ({
    validate: (value) => Number(value) <= maximum,
    message: message || `Valor máximo: ${maximum}`
  })
}

// ========================================
// VALIDAÇÕES ESPECÍFICAS DO DOMÍNIO
// ========================================

/**
 * Valida telefone brasileiro
 * Formatos aceitos: 5511999999999, 11999999999, (11) 99999-9999
 */
export function validateBrazilianPhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, errors: ['Telefone é obrigatório'] }
  }

  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Verifica se tem pelo menos 10 dígitos (DDD + número)
  if (cleanPhone.length < 10) {
    return { 
      isValid: false, 
      errors: ['Telefone deve ter pelo menos 10 dígitos'] 
    }
  }
  
  // Se não começa com 55, adiciona automaticamente
  let normalizedPhone = cleanPhone
  if (!cleanPhone.startsWith('55')) {
    normalizedPhone = '55' + cleanPhone
  }
  
  // Verifica se tem o formato correto: 55 + DDD (2 dígitos) + número (8-9 dígitos)
  const ddd = normalizedPhone.substring(2, 4)
  const number = normalizedPhone.substring(4)
  
  // DDD deve estar entre 11 e 99
  const dddNum = parseInt(ddd)
  if (dddNum < 11 || dddNum > 99) {
    return { 
      isValid: false, 
      errors: ['DDD inválido. Deve estar entre 11 e 99'] 
    }
  }
  
  // Número deve ter 8 ou 9 dígitos
  if (number.length < 8 || number.length > 9) {
    return { 
      isValid: false, 
      errors: ['Número de telefone deve ter 8 ou 9 dígitos'] 
    }
  }
  
  // Se tem 9 dígitos, deve começar com 9
  if (number.length === 9 && !number.startsWith('9')) {
    return { 
      isValid: false, 
      errors: ['Celular deve começar com 9'] 
    }
  }
  
  return { isValid: true, errors: [] }
}

/**
 * Valida CNPJ brasileiro
 */
export function validateCNPJ(cnpj: string): ValidationResult {
  if (!cnpj) {
    return { isValid: false, errors: ['CNPJ é obrigatório'] }
  }

  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) {
    return { 
      isValid: false, 
      errors: ['CNPJ deve ter 14 dígitos'] 
    }
  }
  
  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1+$/.test(cleanCNPJ)) {
    return { 
      isValid: false, 
      errors: ['CNPJ inválido'] 
    }
  }
  
  // Validação do dígito verificador
  let length = cleanCNPJ.length - 2
  let numbers = cleanCNPJ.substring(0, length)
  const digits = cleanCNPJ.substring(length)
  let sum = 0
  let pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11
  if (result !== parseInt(digits.charAt(0))) {
    return { isValid: false, errors: ['CNPJ inválido'] }
  }
  
  length = length + 1
  numbers = cleanCNPJ.substring(0, length)
  sum = 0
  pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11
  if (result !== parseInt(digits.charAt(1))) {
    return { isValid: false, errors: ['CNPJ inválido'] }
  }
  
  return { isValid: true, errors: [] }
}

/**
 * Valida CPF brasileiro
 */
export function validateCPF(cpf: string): ValidationResult {
  if (!cpf) {
    return { isValid: false, errors: ['CPF é obrigatório'] }
  }

  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return { 
      isValid: false, 
      errors: ['CPF deve ter 11 dígitos'] 
    }
  }
  
  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1+$/.test(cleanCPF)) {
    return { 
      isValid: false, 
      errors: ['CPF inválido'] 
    }
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(9))) {
    return { isValid: false, errors: ['CPF inválido'] }
  }
  
  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(10))) {
    return { isValid: false, errors: ['CPF inválido'] }
  }
  
  return { isValid: true, errors: [] }
}

/**
 * Valida formato de data
 */
export function validateDate(date: string | Date, format = 'YYYY-MM-DD'): ValidationResult {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return { isValid: false, errors: ['Data inválida'] }
    }
    
    return { isValid: true, errors: [] }
  } catch (error) {
    return { isValid: false, errors: ['Formato de data inválido'] }
  }
}

/**
 * Valida se uma data é futura
 */
export function validateFutureDate(date: string | Date): ValidationResult {
  const validation = validateDate(date)
  if (!validation.isValid) return validation
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  
  if (dateObj <= now) {
    return { isValid: false, errors: ['Data deve ser no futuro'] }
  }
  
  return { isValid: true, errors: [] }
}

/**
 * Valida senha forte
 */
export function validateStrongPassword(password: string): ValidationResult {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// ========================================
// VALIDADOR GENÉRICO
// ========================================

/**
 * Aplica múltiplas regras de validação a um valor
 */
export function validateField<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  const errors: string[] = []
  
  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Valida um objeto completo com múltiplos campos
 */
export function validateObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, ValidationRule<any>[]>
): { isValid: boolean; errors: Record<keyof T, string[]> } {
  const errors: Record<keyof T, string[]> = {} as any
  let isValid = true
  
  for (const [field, rules] of Object.entries(schema) as [keyof T, ValidationRule<any>[]][]) {
    const result = validateField(obj[field], rules)
    if (!result.isValid) {
      errors[field] = result.errors
      isValid = false
    }
  }
  
  return { isValid, errors }
}

// ========================================
// FORMATADORES
// ========================================

/**
 * Formata telefone brasileiro
 */
export function formatBrazilianPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (cleanPhone.length === 11) {
    // Celular: (XX) 9XXXX-XXXX
    return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`
  } else if (cleanPhone.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 6)}-${cleanPhone.substring(6)}`
  } else if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
    // Com código do país: +55 (XX) 9XXXX-XXXX
    return `+55 (${cleanPhone.substring(2, 4)}) ${cleanPhone.substring(4, 9)}-${cleanPhone.substring(9)}`
  }
  
  return phone // Retorna original se não conseguir formatar
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  if (cleanCNPJ.length === 14) {
    return `${cleanCNPJ.substring(0, 2)}.${cleanCNPJ.substring(2, 5)}.${cleanCNPJ.substring(5, 8)}/${cleanCNPJ.substring(8, 12)}-${cleanCNPJ.substring(12)}`
  }
  return cnpj
}

/**
 * Formata CPF
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length === 11) {
    return `${cleanCPF.substring(0, 3)}.${cleanCPF.substring(3, 6)}.${cleanCPF.substring(6, 9)}-${cleanCPF.substring(9)}`
  }
  return cpf
}
