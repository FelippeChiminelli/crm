import { useState, useCallback } from 'react'
import type { ValidationError, FormValidationResult } from '../types'

interface ValidationRule {
  field: string
  validator: (value: any, formData?: Record<string, any>) => string | null
}

export function useFormValidation() {
  const [errors, setErrors] = useState<ValidationError[]>([])

  const validateField = useCallback((value: any, rules: ValidationRule[], formData?: Record<string, any>): ValidationError[] => {
    const fieldErrors: ValidationError[] = []
    
    rules.forEach(rule => {
      const errorMessage = rule.validator(value, formData)
      if (errorMessage) {
        fieldErrors.push({
          field: rule.field,
          message: errorMessage
        })
      }
    })
    
    return fieldErrors
  }, [])

  const validateForm = useCallback((formData: Record<string, any>, validationRules: Record<string, ValidationRule[]>): FormValidationResult => {
    const allErrors: ValidationError[] = []
    
    Object.keys(validationRules).forEach(field => {
      const fieldRules = validationRules[field]
      const fieldValue = formData[field]
      const fieldErrors = validateField(fieldValue, fieldRules, formData)
      allErrors.push(...fieldErrors)
    })
    
    setErrors(allErrors)
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    }
  }, [validateField])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const getFieldError = useCallback((fieldName: string): string | null => {
    const error = errors.find(err => err.field === fieldName)
    return error?.message || null
  }, [errors])

  return {
    errors,
    validateForm,
    validateField,
    clearErrors,
    getFieldError
  }
}

// Regras de validação pré-definidas
export const validationRules = {
  required: (fieldName: string) => ({
    field: fieldName,
    validator: (value: any) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} é obrigatório`
      }
      return null
    }
  }),
  
  email: (fieldName: string) => ({
    field: fieldName,
    validator: (value: string) => {
      if (!value) return null
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return 'E-mail inválido'
      }
      return null
    }
  }),
  
  minLength: (fieldName: string, min: number) => ({
    field: fieldName,
    validator: (value: string) => {
      if (!value) return null
      if (value.length < min) {
        return `${fieldName} deve ter pelo menos ${min} caracteres`
      }
      return null
    }
  }),
  
  passwordMatch: (fieldName: string, passwordField: string) => ({
    field: fieldName,
    validator: (value: string, formData?: Record<string, any>) => {
      if (!value) return null
      if (formData && value !== formData[passwordField]) {
        return 'As senhas não coincidem'
      }
      return null
    }
  }),
  
  phone: (fieldName: string) => ({
    field: fieldName,
    validator: (value: string) => {
      if (!value) return null
      
      // Remover espaços e caracteres especiais para validação
      const cleanPhone = value.replace(/[\s\(\)\-\+]/g, '')
      
      // Verificar se tem pelo menos 10 dígitos (formato brasileiro)
      if (cleanPhone.length < 10) {
        return 'Telefone deve ter pelo menos 10 dígitos'
      }
      
      // Verificar se tem no máximo 12 dígitos (com código do país)
      if (cleanPhone.length > 13) {
        return 'Telefone deve ter no máximo 13 dígitos'
      }
      
      // Verificar se contém apenas números
      if (!/^\d+$/.test(cleanPhone)) {
        return 'Telefone deve conter apenas números'
      }
      
      return null
    }
  }),
  
  cnpj: (fieldName: string) => ({
    field: fieldName,
    validator: (value: string) => {
      if (!value) return null
      
      // Remover caracteres especiais
      const cleanCnpj = value.replace(/[^\d]/g, '')
      
      // Verificar se tem 14 dígitos
      if (cleanCnpj.length !== 14) {
        return 'CNPJ deve ter 14 dígitos'
      }
      
      // Verificar se contém apenas números
      if (!/^\d+$/.test(cleanCnpj)) {
        return 'CNPJ deve conter apenas números'
      }
      
      return null
    }
  })
} 