import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm'
import AuctaLogo from '../assets/logo-aucta.svg'
import AuctaLogoText from '../assets/logo-aucta-text-dark.svg'

function ForgotPasswordPage() {
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
            Recuperar Senha
          </h2>
          <p className="text-gray-600 text-center text-sm">
            Digite seu e-mail e enviaremos um link para redefinir sua senha
          </p>
        </div>
        
        <ForgotPasswordForm />
      </div>
    </div>
  )
}

export default ForgotPasswordPage 