// Validações específicas para o CRM
export const crmValidation = {
  // Validação de CPF
  cpf: (cpf: string): boolean => {
    const cleanCpf = cpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) return false
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false
    
    // Validação do primeiro dígito verificador
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (10 - i)
    }
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCpf.charAt(9))) return false
    
    // Validação do segundo dígito verificador
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (11 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCpf.charAt(10))) return false
    
    return true
  },

  // Validação de CNPJ
  cnpj: (cnpj: string): boolean => {
    const cleanCnpj = cnpj.replace(/\D/g, '')
    if (cleanCnpj.length !== 14) return false
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cleanCnpj)) return false
    
    // Validação do primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCnpj.charAt(i)) * weights1[i]
    }
    let remainder = sum % 11
    let digit1 = remainder < 2 ? 0 : 11 - remainder
    if (digit1 !== parseInt(cleanCnpj.charAt(12))) return false
    
    // Validação do segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum = 0
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCnpj.charAt(i)) * weights2[i]
    }
    remainder = sum % 11
    let digit2 = remainder < 2 ? 0 : 11 - remainder
    if (digit2 !== parseInt(cleanCnpj.charAt(13))) return false
    
    return true
  },

  // Validação de telefone brasileiro
  phone: (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '')
    // Aceita telefones com 10 ou 11 dígitos (com DDD)
    return cleanPhone.length >= 10 && cleanPhone.length <= 11
  },

  // Validação de CEP
  cep: (cep: string): boolean => {
    const cleanCep = cep.replace(/\D/g, '')
    return cleanCep.length === 8
  },

  // Validação de data de nascimento (maior de 18 anos)
  birthDate: (date: string): boolean => {
    const birthDate = new Date(date)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18
    }
    
    return age >= 18
  }
}

// Funções de formatação
export const formatters = {
  // Formatar CPF
  cpf: (cpf: string): string => {
    const cleanCpf = cpf.replace(/\D/g, '')
    return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  },

  // Formatar CNPJ
  cnpj: (cnpj: string): string => {
    const cleanCnpj = cnpj.replace(/\D/g, '')
    return cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  },

  // Formatar telefone
  phone: (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return phone
  },

  // Formatar CEP
  cep: (cep: string): string => {
    const cleanCep = cep.replace(/\D/g, '')
    return cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2')
  },

  // Formatar data
  date: (date: string): string => {
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }
} 