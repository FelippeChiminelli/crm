import { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import AuctaLogoBranco from '../assets/logo-aucta-branco-login.svg'
import AuctaLogoPrincipal from '../assets/logo-principal-login.svg'
import FundoLogin from '../assets/fundo-login.svg'

function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen bg-[#f4f5f9] relative flex items-center justify-center overflow-hidden">
      {/* Background Pattern Vector - Decorative */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img 
          src={FundoLogin} 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full lg:w-[1260px] max-w-[1782px] mx-auto px-4 py-8">
        <div className="relative flex items-center justify-center min-h-[600px]">
          
          {/* Mobile/Tablet: Single Column Layout - Only Form */}
          <div className="lg:hidden w-full flex flex-col items-center">
            {/* White Login Form - Mobile/Tablet */}
            <div className="w-full max-w-md">
              <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 ${
                tab === 'register' ? 'min-h-[500px]' : 'min-h-[400px]'
              }`}>
                <div className="flex flex-col items-center gap-8 sm:gap-10 w-full">
                  {/* Logo */}
                  <div className="h-10 sm:h-12 w-auto">
                    <img 
                      src={AuctaLogoPrincipal} 
                      alt="AuctaCRM" 
                      className="h-full w-auto"
                    />
                  </div>
                  
                  {/* Tabs */}
                  <div className="relative w-full flex justify-center">
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden w-full max-w-[300px]">
                      <button
                        className={`px-4 sm:px-6 py-2 min-h-[40px] text-center font-medium text-xs sm:text-sm transition-colors border-r border-gray-200 flex-1 ${
                          tab === 'login' 
                            ? 'bg-[#ff5700] text-white' 
                            : 'bg-white text-[#f84d00] hover:bg-gray-50'
                        }`}
                        onClick={() => setTab('login')}
                      >
                        Login
                      </button>
                      <button
                        className={`px-4 sm:px-6 py-2 min-h-[40px] text-center font-medium text-xs sm:text-sm transition-colors flex-1 ${
                          tab === 'register' 
                            ? 'bg-[#ff5700] text-white' 
                            : 'bg-white text-[#f84d00] hover:bg-gray-50'
                        }`}
                        onClick={() => setTab('register')}
                      >
                        Criar Conta
                      </button>
                    </div>
                  </div>
                  
                  {/* Form */}
                  <div className="w-full">
                    {tab === 'login' ? <LoginForm /> : <RegisterForm />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Original Layout with Absolute Positioning */}
          <div className="hidden lg:block">
            {/* Orange Rectangle - Extends behind the form */}
            <div className="hidden lg:flex lg:justify-center lg:items-center absolute left-[calc(50%-50.5px)] top-[calc(50%+10.5px)] -translate-x-1/2 -translate-y-1/2 w-[1300px] h-[400px] bg-[#ff4207] rounded-lg">
              {/* Promotional Content - Inside orange rectangle */}
              <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col items-start gap-8 w-[500px]">
                {/* Logo */}
                <div className="h-10 w-auto">
                  <img 
                    src={AuctaLogoBranco} 
                    alt="Aucta" 
                    className="h-full w-auto"
                  />
                </div>
                
                {/* Headline and Description Container */}
                <div className="flex flex-col gap-2 items-start">
                  {/* Headline */}
                  <h1 className="text-[2.5rem] font-semibold leading-tight text-white">
                    Gestão inteligente resultados consistentes
                  </h1>
                  {/* Description */}
                  <p className="text-[1.475rem] font-normal leading-relaxed text-white">
                    O equilíbrio ideal entre controle e performance
                  </p>
                </div>
              </div>
            </div>

            {/* White Login Form - On top of orange rectangle */}
            <div className="absolute z-20 left-[calc(50%+270px)] top-[calc(50%+7.82px)] -translate-x-1/2 -translate-y-1/2">
              <div className={`bg-white rounded-xl shadow-lg p-6 ${
                tab === 'register' ? 'w-[800px] min-h-[600px]' : 'w-[500px] min-h-[500px]'
              }`}>
                <div className="flex flex-col items-center gap-10 w-full">
                  {/* Logo */}
                  <div className="h-12 w-auto">
                    <img 
                      src={AuctaLogoPrincipal} 
                      alt="AuctaCRM" 
                      className="h-full w-auto"
                    />
                  </div>
                  
                  {/* Tabs */}
                  <div className="relative w-full flex justify-center">
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden w-[300px]">
                      <button
                        className={`px-6 py-2 min-h-[40px] text-center font-medium text-sm transition-colors border-r border-gray-200 flex-1 ${
                          tab === 'login' 
                            ? 'bg-[#ff5700] text-white' 
                            : 'bg-white text-[#f84d00] hover:bg-gray-50'
                        }`}
                        onClick={() => setTab('login')}
                      >
                        Login
                      </button>
                      <button
                        className={`px-6 py-2 min-h-[40px] text-center font-medium text-sm transition-colors flex-1 ${
                          tab === 'register' 
                            ? 'bg-[#ff5700] text-white' 
                            : 'bg-white text-[#f84d00] hover:bg-gray-50'
                        }`}
                        onClick={() => setTab('register')}
                      >
                        Criar Conta
                      </button>
                    </div>
                  </div>
                  
                  {/* Form */}
                  <div className="w-full">
                    {tab === 'login' ? <LoginForm /> : <RegisterForm />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage 