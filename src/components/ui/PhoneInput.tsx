import { useState, useEffect } from 'react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
}

export function PhoneInput({ 
  value, 
  onChange, 
  placeholder = "(11) 99999-9999",
  required = false,
  disabled = false,
  className = "",
  error
}: PhoneInputProps) {
  // Remover o 55 se já estiver no valor para exibição
  const getDisplayValue = (val: string) => {
    if (!val) return ''
    const cleaned = val.replace(/\D/g, '')
    return cleaned.startsWith('55') ? cleaned.slice(2) : cleaned
  }

  const [displayValue, setDisplayValue] = useState(getDisplayValue(value))

  useEffect(() => {
    setDisplayValue(getDisplayValue(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let cleaned = e.target.value.replace(/\D/g, '') // Remove não-numéricos
    
    // Limitar a 11 dígitos (DDD + número)
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(0, 11)
    }
    
    setDisplayValue(cleaned)
    
    // SEMPRE adicionar 55 na frente ao salvar
    const valueWithCountryCode = cleaned ? '55' + cleaned : ''
    onChange(valueWithCountryCode)
  }

  // Formatar visualmente: (11) 99999-9999
  const formatDisplay = (val: string) => {
    const nums = val.replace(/\D/g, '')
    if (nums.length === 0) return ''
    if (nums.length <= 2) return `(${nums}`
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`
  }

  return (
    <div>
      <div className="flex items-stretch">
        {/* Prefixo fixo +55 */}
        <div className="flex items-center justify-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700 font-medium text-sm">
          +55
        </div>
        
        {/* Input do telefone */}
        <input
          type="tel"
          value={formatDisplay(displayValue)}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            flex-1 px-3 py-2 border border-gray-300 rounded-r-lg 
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      <p className="mt-1 text-xs text-gray-500">
        O código +55 do Brasil é adicionado automaticamente
      </p>
    </div>
  )
}
