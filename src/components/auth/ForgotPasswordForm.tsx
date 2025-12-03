import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetPassword } from '../../services/authService'
import { useFormValidation, validationRules } from '../../hooks/useFormValidation'

export function ForgotPasswordForm() {
  const { validateForm, getFieldError, clearErrors } = useFormValidation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) {
      clearErrors()
      setError(null)
    }
  }

  const validateEmailForm = () => {
    const rules = {
      email: [
        validationRules.required('E-mail'),
        validationRules.email('E-mail')
      ]
    }

    return validateForm({ email }, rules)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setError(null)
    clearErrors()

    const validation = validateEmailForm()
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(err => err.message).join(', ')
      setError(`Erro de validação: ${errorMessages}`)
      return
    }

    try {
      setLoading(true)
      await resetPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação. Tente novamente.')
    } finally {
      setLoading(false)
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
          value={email}
          onChange={handleInputChange}
          required
          autoComplete="email"
          placeholder="Digite seu e-mail"
        />
        {getFieldError('email') && (
          <span className="text-red-500 text-sm">{getFieldError('email')}</span>
        )}
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 text-green-600 text-sm text-center">
          <p className="font-semibold mb-2">Email enviado com sucesso!</p>
          <p className="text-sm">
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </p>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-60 mt-2"
        disabled={loading || success}
      >
        {loading ? 'Enviando...' : success ? 'Email Enviado' : 'Enviar Link de Recuperação'}
      </button>

      <button
        type="button"
        onClick={() => navigate('/auth')}
        className="w-full mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
      >
        Voltar para o login
      </button>
    </form>
  )
}

