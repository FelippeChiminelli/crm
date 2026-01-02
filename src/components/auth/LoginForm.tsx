import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'
import { useFormValidation } from '../../hooks/useFormValidation'
import { MESSAGES } from '../../utils/constants'
import type { LoginFormData } from '../../types'

export function LoginForm() {
  const { handleLogin, loading, error } = useAuth()
  const { getFieldError, clearErrors } = useFormValidation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (error) clearErrors()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    clearErrors()
    
    const { error } = await handleLogin(formData.email, formData.password)
    if (!error) {
      setSuccess(true)
      // Aguardar um momento para garantir que a autenticação foi processada
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full flex flex-col gap-6">
      {/* Email Field */}
      <div className="flex flex-col items-center">
        <label htmlFor="email" className="block w-full max-w-[400px] text-sm font-medium text-gray-700 mb-2">
          Endereço de e-mail
        </label>
        <div className="flex justify-center w-full">
          <input
            id="email"
            type="email"
            className="w-full max-w-[400px] px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
            value={formData.email}
            onChange={handleInputChange('email')}
            required
            autoComplete="email"
            placeholder="Digite seu email"
          />
        </div>
        {getFieldError('email') && (
          <span className="text-red-500 text-xs mt-1 block w-full max-w-[400px]">{getFieldError('email')}</span>
        )}
      </div>

      {/* Password Section */}
      <div className="flex flex-col gap-1 items-center">
        <label htmlFor="password" className="block w-full max-w-[400px] text-sm font-medium text-gray-700 mb-2">
          Senha
        </label>
        <div className="flex justify-center w-full">
          <div className="relative w-full max-w-[400px]">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
              value={formData.password}
              onChange={handleInputChange('password')}
              required
              autoComplete="current-password"
              placeholder="Digite sua senha"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        {getFieldError('password') && (
          <span className="text-red-500 text-xs mt-1 block w-full max-w-[400px]">{getFieldError('password')}</span>
        )}
        
        {/* Forgot Password Link */}
        <div className="flex justify-end w-full max-w-[400px] mt-2">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm font-medium text-gray-600 hover:text-[#ff4207] transition-colors"
          >
            Esqueci minha senha
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="text-red-600 text-sm text-center py-2">
          {error}
        </div>
      )}
      
      {success && (
        <div className="text-green-600 text-sm text-center py-2">
          {MESSAGES.SUCCESS.LOGIN}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex flex-col items-center w-full mt-2">
        <button
          type="submit"
          className="w-full max-w-[400px] px-4 py-2.5 bg-[#ff4207] hover:bg-[#e63a06] text-white rounded-lg focus:ring-2 focus:ring-[#ff4207]/20 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </form>
  )
} 