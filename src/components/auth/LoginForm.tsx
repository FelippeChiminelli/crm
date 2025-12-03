import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <form onSubmit={onSubmit}>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.email}
          onChange={handleInputChange('email')}
          required
          autoComplete="email"
        />
        {getFieldError('email') && (
          <span className="text-red-500 text-sm">{getFieldError('email')}</span>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-1" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.password}
          onChange={handleInputChange('password')}
          required
          autoComplete="current-password"
        />
        {getFieldError('password') && (
          <span className="text-red-500 text-sm">{getFieldError('password')}</span>
        )}
      </div>
      
      {error && (
        <div className="mb-4 text-red-600 text-sm text-center">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 text-green-600 text-sm text-center">
          {MESSAGES.SUCCESS.LOGIN}
        </div>
      )}
      
      <button
        type="submit"
        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-60 mt-2"
        disabled={loading}
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => navigate('/forgot-password')}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          Esqueci minha senha
        </button>
      </div>
    </form>
  )
} 