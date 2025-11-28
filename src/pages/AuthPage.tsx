import { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import AuctaLogo from '../assets/logo-aucta.svg'
import AuctaLogoText from '../assets/logo-aucta-text-dark.svg'

function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')

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
        
        <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-200">
          <button
            className={`flex-1 py-2 text-center font-semibold transition-colors ${
              tab === 'login' 
                ? 'bg-primary-500 text-white' 
                : 'bg-white text-primary-600 hover:bg-gray-100'
            }`}
            onClick={() => setTab('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 text-center font-semibold transition-colors ${
              tab === 'register' 
                ? 'bg-primary-500 text-white' 
                : 'bg-white text-primary-600 hover:bg-gray-100'
            }`}
            onClick={() => setTab('register')}
          >
            Criar Conta
          </button>
        </div>
        
        {tab === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  )
}

export default AuthPage 