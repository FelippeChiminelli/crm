import { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { getCurrentUserProfile, updateCurrentUserProfile, updateUserPassword } from '../services/profileService'
import type { ProfileWithRole, UpdateProfileData } from '../types'
import {
  UserCircleIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function ProfilesPage() {
  const [profile, setProfile] = useState<ProfileWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    birth_date: '',
    gender: '' as 'masculino' | 'feminino' | ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const [isUpdating, setIsUpdating] = useState(false)

  // Load user profile
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: profileError } = await getCurrentUserProfile()
      
      if (profileError) {
        setError(profileError.message || 'Erro ao carregar perfil')
        return
      }

      if (data) {
        setProfile(data)
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: data.email || '',
          birth_date: data.birth_date || '',
          gender: data.gender || ''
        })
      }
    } catch (err) {
      setError('Erro interno do sistema')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsUpdating(true)
      setError(null)
      setSuccess(null)

      const updateData: UpdateProfileData = {
        full_name: formData.full_name,
        phone: formData.phone,
        birth_date: formData.birth_date || undefined,
        gender: formData.gender || undefined
      }

      const { data, error: updateError } = await updateCurrentUserProfile(updateData)
      
      if (updateError) {
        setError(updateError.message || 'Erro ao atualizar perfil')
        return
      }

      if (data) {
        setSuccess('Perfil atualizado com sucesso!')
        await loadProfile() // Recarregar dados
      }
    } catch (err) {
      setError('Erro interno do sistema')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsUpdating(true)
      setError(null)
      setSuccess(null)

      // Validar senhas
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('As senhas não coincidem')
        return
      }

      if (passwordData.newPassword.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres')
        return
      }

      const { error: passwordError } = await updateUserPassword(
        passwordData.currentPassword,
        passwordData.newPassword
      )
      
      if (passwordError) {
        setError(passwordError.message || 'Erro ao atualizar senha')
        return
      }

      setSuccess('Senha atualizada com sucesso!')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (err) {
      setError('Erro interno do sistema')
    } finally {
      setIsUpdating(false)
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando perfil...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 p-3 lg:p-4">
          <div className="h-full flex flex-col space-y-3">
            {/* Cabeçalho */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <UserCircleIcon className="w-8 h-8 text-primary-500" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Meu Perfil
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Gerencie suas informações pessoais e configurações de segurança
                  </p>
                </div>
              </div>
            </div>

            {/* Alertas */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm text-green-800">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Principal */}
            <div className="bg-white rounded-lg shadow flex-1 min-h-0 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-4" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'profile'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCircleIcon className="w-4 h-4" />
                      Informações Pessoais
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'security'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <KeyIcon className="w-4 h-4" />
                      Segurança
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {activeTab === 'profile' && (
                  <div className="max-w-2xl">
                    {/* Informações do Role */}
                    {profile?.role && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheckIcon className="w-5 h-5 text-blue-500" />
                          <h3 className="font-medium text-blue-900">Perfil de Acesso</h3>
                        </div>
                        <div className="text-sm text-blue-800">
                          <p><strong>Role:</strong> {profile.role.name}</p>
                          {profile.role.description && (
                            <p><strong>Descrição:</strong> {profile.role.description}</p>
                          )}
                          {profile.is_admin && (
                            <p className="mt-1 font-medium text-blue-900">🔑 Administrador da Empresa</p>
                          )}
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nome Completo */}
                        <div className="md:col-span-2">
                          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Completo *
                          </label>
                          <input
                            type="text"
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                          />
                        </div>

                        {/* Telefone */}
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone *
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                          />
                        </div>

                        {/* Email (readonly) */}
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            id="email"
                            value={formData.email}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                            disabled
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Para alterar o email, entre em contato com o administrador
                          </p>
                        </div>

                        {/* Data de Nascimento */}
                        <div>
                          <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Data de Nascimento
                          </label>
                          <input
                            type="date"
                            id="birth_date"
                            value={formData.birth_date}
                            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>

                        {/* Gênero */}
                        <div>
                          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                            Gênero
                          </label>
                          <select
                            id="gender"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'masculino' | 'feminino' | '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Selecione...</option>
                            <option value="masculino">Masculino</option>
                            <option value="feminino">Feminino</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isUpdating}
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                          {isUpdating ? 'Atualizando...' : 'Salvar Alterações'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="max-w-md">
                    <form onSubmit={handlePasswordUpdate} className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Alterar Senha</h3>
                        
                        {/* Senha Atual */}
                        <div className="mb-4">
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Senha Atual *
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.current ? "text" : "password"}
                              id="currentPassword"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('current')}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPasswords.current ? (
                                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <EyeIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Nova Senha */}
                        <div className="mb-4">
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Nova Senha *
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.new ? "text" : "password"}
                              id="newPassword"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              required
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('new')}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPasswords.new ? (
                                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <EyeIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Confirmar Nova Senha */}
                        <div className="mb-6">
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Nova Senha *
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.confirm ? "text" : "password"}
                              id="confirmPassword"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              required
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('confirm')}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPasswords.confirm ? (
                                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <EyeIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isUpdating}
                          className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                          {isUpdating ? 'Atualizando...' : 'Alterar Senha'}
                        </button>
                      </div>
                    </form>

                    {/* Dicas de Segurança */}
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Dicas de Segurança</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Use pelo menos 6 caracteres</li>
                        <li>• Combine letras, números e símbolos</li>
                        <li>• Não use informações pessoais</li>
                        <li>• Altere sua senha periodicamente</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 