import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '../services/authService'
import { useFormValidation, validationRules } from '../hooks/useFormValidation'
import { supabase } from '../services/supabaseClient'
import AuctaLogo from '../assets/logo-aucta.svg'
import AuctaLogoText from '../assets/logo-aucta-text-dark.svg'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { validateForm, getFieldError, clearErrors } = useFormValidation()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  // Validar token ao carregar a página
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Aguardar um pouco para o Supabase processar o hash fragment da URL
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // O Supabase automaticamente detecta o token na URL quando há hash fragments
        // Verificamos se há uma sessão válida após o redirecionamento
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          setTokenValid(false)
          setError('Link inválido ou expirado. Solicite um novo link de recuperação.')
        } else {
          // Verificar se é uma sessão de recuperação de senha
          // O tipo de sessão pode ser verificado através do tipo de token
          setTokenValid(true)
        }
      } catch (err) {
        setTokenValid(false)
        setError('Erro ao validar o link. Tente novamente.')
      } finally {
        setValidatingToken(false)
      }
    }

    validateToken()
  }, [])

  const handleInputChange = (field: 'password' | 'confirmPassword') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (error) {
      clearErrors()
      setError(null)
    }
  }

  const validatePasswordForm = () => {
    const rules = {
      password: [
        validationRules.required('Senha'),
        validationRules.minLength('Senha', 6)
      ],
      confirmPassword: [
        validationRules.required('Confirmar senha'),
        validationRules.passwordMatch('Confirmar senha', 'password')
      ]
    }

    return validateForm(formData, rules)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setError(null)
    clearErrors()

    const validation = validatePasswordForm()
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(err => err.message).join(', ')
      setError(`Erro de validação: ${errorMessages}`)
      return
    }

    try {
      setLoading(true)
      await updatePassword(formData.password)
      setSuccess(true)
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/auth')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Validando link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <img 
              src={AuctaLogo} 
              alt="Aucta" 
              className="h-24 w-auto mb-4"
            />
            <img 
              src={AuctaLogoText} 
              alt="Aucta.crm" 
              className="w-48 h-auto"
            />
          </div>
          
          <div className="text-center">
            <div className="mb-4 text-red-600">
              <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-semibold mb-2">Link Inválido</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
            </div>
            
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Solicitar Novo Link
            </button>
            
            <button
              onClick={() => navigate('/auth')}
              className="w-full mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Voltar para o login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img 
            src={AuctaLogo} 
            alt="Aucta" 
            className="h-24 w-auto mb-4"
          />
          <img 
            src={AuctaLogoText} 
            alt="Aucta.crm" 
            className="w-48 h-auto"
          />
        </div>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Redefinir Senha
          </h2>
          <p className="text-gray-600 text-center text-sm">
            Digite sua nova senha abaixo
          </p>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="password">
              Nova Senha
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.password}
              onChange={handleInputChange('password')}
              required
              autoComplete="new-password"
              placeholder="Digite sua nova senha"
            />
            {getFieldError('password') && (
              <span className="text-red-500 text-sm">{getFieldError('password')}</span>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Mínimo 6 caracteres
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-1" htmlFor="confirmPassword">
              Confirmar Nova Senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              required
              autoComplete="new-password"
              placeholder="Confirme sua nova senha"
            />
            {getFieldError('confirmPassword') && (
              <span className="text-red-500 text-sm">{getFieldError('confirmPassword')}</span>
            )}
          </div>
          
          {error && (
            <div className="mb-4 text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 text-green-600 text-sm text-center">
              <p className="font-semibold mb-2">Senha redefinida com sucesso!</p>
              <p className="text-sm">Redirecionando para o login...</p>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-60 mt-2"
            disabled={loading || success}
          >
            {loading ? 'Atualizando...' : success ? 'Senha Atualizada' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage

