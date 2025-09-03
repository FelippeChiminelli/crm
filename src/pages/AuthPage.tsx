import { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'

function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-primary-600 mb-6 text-center">
          ADV CRM
        </h2>
        
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