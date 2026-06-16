import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuildingOffice2Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuthContext } from '../contexts/AuthContext'
import AuctaLogoPrincipal from '../assets/logo-principal-login.svg'
import FundoLogin from '../assets/fundo-login.svg'

export default function EmpresaDesativadaPage() {
  const { empresaNome, logout } = useAuthContext()
  const navigate = useNavigate()
  const [saindo, setSaindo] = useState(false)

  const handleLogout = async () => {
    setSaindo(true)
    try {
      await logout()
      navigate('/auth', { replace: true })
    } finally {
      setSaindo(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f5f9] relative flex items-center justify-center overflow-x-hidden px-4 py-8">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img src={FundoLogin} alt="" className="w-full h-full object-cover" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <img src={AuctaLogoPrincipal} alt="AuctaCRM" className="h-10 sm:h-12 w-auto" />

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <BuildingOffice2Icon className="h-7 w-7 text-red-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Empresa desativada
              </h1>
              {empresaNome && (
                <p className="text-base font-medium text-gray-800">{empresaNome}</p>
              )}
              <p className="text-sm text-gray-600 leading-relaxed">
                Sua empresa está desativada no momento. Entre em contato com o administrador
                da sua empresa para mais informações.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={saindo}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff4207] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#e63a06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {saindo ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
