import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useFormValidation, validationRules } from '../../hooks/useFormValidation'
import { MESSAGES, GENDER_OPTIONS } from '../../utils/constants'

import type { RegisterFormData } from '../../types'
import { supabase } from '../../services/supabaseClient'

export function RegisterForm() {
  const { handleSignUp, loading, error } = useAuth()
  const { validateForm, getFieldError, clearErrors } = useFormValidation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    gender: 'masculino',
    // Dados da empresa - agora obrigatório
    empresaNome: '',
    empresaCnpj: ''
  })
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [profileErrorDetail, setProfileErrorDetail] = useState<string | null>(null)

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let value = e.target.value
    
    // Formatar CNPJ automaticamente
    if (field === 'empresaCnpj') {
      value = value.replace(/\D/g, '') // Remove tudo que não é dígito
      if (value.length <= 14) {
        value = value.replace(/^(\d{2})(\d)/, '$1.$2')
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2')
        value = value.replace(/(\d{4})(\d)/, '$1-$2')
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error || formError) {
      clearErrors()
      setFormError(null)
    }
  }

  const validateRegisterForm = () => {
    const rules = {
      fullName: [validationRules.required('Nome completo')],
      phone: [validationRules.required('Telefone'), validationRules.phone('Telefone')],
      email: [validationRules.required('E-mail'), validationRules.email('E-mail')],
      password: [
        validationRules.required('Senha'),
        validationRules.minLength('Senha', 6)
      ],
      confirmPassword: [
        validationRules.required('Confirmar senha'),
        validationRules.passwordMatch('Confirmar senha', 'password')
      ],
      birthDate: [validationRules.required('Data de nascimento')],
      gender: [validationRules.required('Gênero')],
      // Dados da empresa agora obrigatórios
      empresaNome: [validationRules.required('Nome da empresa')],
      empresaCnpj: [validationRules.required('CNPJ da empresa'), validationRules.cnpj('CNPJ da empresa')]
    }

    return validateForm(formData, rules)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setFormError(null)
    setProfileErrorDetail(null)
    clearErrors()

    console.log('🚀 Iniciando processo de registro...')

    const validation = validateRegisterForm()
    if (!validation.isValid) {
      console.error('❌ Validação falhou:', validation.errors)
      
      // Mostrar erros específicos dos campos
      const errorMessages = validation.errors.map(err => `${err.field}: ${err.message}`).join(', ')
      setFormError(`Erro de validação: ${errorMessages}`)
      
      // Log detalhado dos erros
      validation.errors.forEach(error => {
        console.error(`❌ Campo "${error.field}": ${error.message}`)
      })
      
      return
    }

    console.log('✅ Validação passou, iniciando processo sequencial...')

    try {
      // PASSO 1: Criar usuário no Supabase Auth
      console.log('👤 PASSO 1: Criando usuário no Supabase Auth...')
      const { data, error: signUpError } = await handleSignUp(
        formData.email,
        formData.password,
        {
          full_name: formData.fullName,
          phone: formData.phone,
          birth_date: formData.birthDate,
          gender: formData.gender,
          empresa_id: undefined, // será preenchido após criar empresa
          uuid: '', // será preenchido pelo backend
          email: formData.email
        }
      )
      
      if (signUpError) {
        console.error('❌ Erro no SignUp:', signUpError)
        setFormError(signUpError.message)
        return
      }
      
      if (!data?.user) {
        console.error('❌ SignUp não retornou usuário')
        setFormError('Erro ao criar usuário')
        return
      }
      
      const userId = data.user.id
      console.log('✅ PASSO 1 CONCLUÍDO: Usuário criado no Auth:', userId)
      
      // PASSO 2: Fazer login temporário para contornar RLS
      console.log('🔐 PASSO 2: Fazendo login temporário...')
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })
      
      if (loginError) {
        console.error('❌ Erro ao fazer login temporário:', loginError)
        setFormError('Erro ao fazer login temporário')
        return
      }
      
      console.log('✅ PASSO 2 CONCLUÍDO: Login temporário realizado')
      
      // PASSO 3: Verificar se perfil já existe ou criar novo
      console.log('👤 PASSO 3: Verificando se perfil já existe...')
      
      // Primeiro, tentar buscar o perfil existente
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('uuid', userId)
        .single()

      let profileData: any

      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        // Perfil não existe, criar novo usando RPC
        console.log('📝 Perfil não existe, criando novo via RPC...')
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('create_profile_rpc', {
            user_uuid: userId,
            full_name: formData.fullName,
            phone: formData.phone,
            email: formData.email,
            birth_date: formData.birthDate,
            gender: formData.gender
          })

        if (rpcError || !rpcResult?.success) {
          console.error('❌ Erro ao criar perfil via RPC:', rpcError || rpcResult?.message)
          setFormError(`Erro ao criar perfil: ${rpcError?.message || rpcResult?.message}`)
          return
        }

        // Buscar o perfil criado
        const { data: newProfileData, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('uuid', userId)
          .single()

        if (fetchError) {
          console.error('❌ Erro ao buscar perfil criado:', fetchError)
          setFormError(`Erro ao buscar perfil criado: ${fetchError.message}`)
          return
        }

        profileData = newProfileData
        console.log('✅ Perfil criado com sucesso via RPC:', profileData)
      } else if (existingProfile) {
        // Perfil já existe
        console.log('✅ Perfil já existe:', existingProfile)
        profileData = existingProfile
      } else {
        // Outro erro
        console.error('❌ Erro ao verificar perfil:', profileCheckError)
        setFormError(`Erro ao verificar perfil: ${profileCheckError?.message}`)
        return
      }

      console.log('✅ PASSO 3 CONCLUÍDO: Perfil verificado/criado:', profileData)
      
      // PASSO 4: Criar empresa usando RPC
      console.log('🏢 PASSO 4: Criando empresa via RPC...')
      console.log('📋 Dados da empresa:', {
        nome: formData.empresaNome,
        cnpj: formData.empresaCnpj,
        plano: 'basico',
        max_usuarios: 2
      })
      
      const { data: empresaResult, error: empresaError } = await supabase
        .rpc('create_empresa_rpc', {
          nome: formData.empresaNome,
          cnpj: formData.empresaCnpj,
          plano: 'basico',
          max_usuarios: 2
        })

      if (empresaError || !empresaResult?.success) {
        console.error('❌ Erro ao criar empresa via RPC:', empresaError || empresaResult?.message)
        console.error('❌ Detalhes do erro:', {
          code: empresaError?.code,
          message: empresaError?.message,
          details: empresaError?.details,
          hint: empresaError?.hint
        })
        setFormError(`Erro ao criar empresa: ${empresaError?.message || empresaResult?.message}`)
        return
      }

      const empresaId = empresaResult.empresa_id
      console.log('✅ PASSO 4 CONCLUÍDO: Empresa criada via RPC:', empresaId)
      console.log('📋 Dados da empresa criada:', empresaResult)
      
      // PASSO 5: Criar role Admin para a empresa usando RPC
      console.log('🎭 PASSO 5: Criando role Admin via RPC...')
      console.log('📋 Dados do role:', {
        empresa_id: empresaId
      })
      
      const { data: roleResult, error: roleError } = await supabase
        .rpc('create_admin_role_rpc', {
          empresa_id: empresaId
        })

      if (roleError || !roleResult?.success) {
        console.error('❌ Erro ao criar role Admin via RPC:', roleError || roleResult?.message)
        console.error('❌ Detalhes do erro:', {
          code: roleError?.code,
          message: roleError?.message,
          details: roleError?.details,
          hint: roleError?.hint
        })
        setFormError(`Erro ao criar role: ${roleError?.message || roleResult?.message}`)
        return
      }

      const roleId = roleResult.role_id
      console.log('✅ PASSO 5 CONCLUÍDO: Role Admin criado via RPC:', roleId)
      console.log('📋 Dados do role criado:', roleResult)
      
      // PASSO 6: Atualizar perfil com empresa_id e role_id
      console.log('👤 PASSO 6: Atualizando perfil com empresa_id e role_id...')
      console.log('📋 Dados para atualização:', {
        empresa_id: empresaId,
        role_id: roleId,
        is_admin: true,
        user_uuid: userId
      })
      
      const { data: updatedProfileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          empresa_id: empresaId,
          role_id: roleId,
          is_admin: true
        })
        .eq('uuid', userId)
        .select()
        .single()

      if (profileError) {
        console.error('❌ Erro ao atualizar perfil:', profileError)
        setFormError(`Erro ao atualizar perfil: ${profileError.message}`)
        return
      }

      console.log('✅ PASSO 6 CONCLUÍDO: Perfil atualizado com sucesso!')
      console.log('📋 Dados finais do perfil:', updatedProfileData)
      
      // Verificar se os campos foram realmente atualizados
      if (!updatedProfileData.empresa_id || !updatedProfileData.role_id) {
        console.error('❌ Campos empresa_id ou role_id não foram preenchidos:', {
          empresa_id: updatedProfileData.empresa_id,
          role_id: updatedProfileData.role_id
        })
        setFormError('Erro: Campos empresa_id ou role_id não foram preenchidos corretamente')
        return
      }
      
      console.log('✅ Verificação final: Todos os campos foram preenchidos corretamente!')
      setSuccess(true)
      
      // Aguardar um momento para garantir que a autenticação foi processada
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
      
    } catch (error) {
      console.error('❌ Erro no processo de cadastro:', error)
      setFormError('Erro inesperado durante o cadastro.')
      return
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1" htmlFor="fullName">
          Nome completo
        </label>
        <input
          id="fullName"
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.fullName}
          onChange={handleInputChange('fullName')}
          required
          autoComplete="name"
        />
        {getFieldError('fullName') && (
          <span className="text-red-500 text-sm">{getFieldError('fullName')}</span>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1" htmlFor="phone">
          Telefone
        </label>
        <input
          id="phone"
          type="tel"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.phone}
          onChange={handleInputChange('phone')}
          required
          autoComplete="tel"
        />
        {getFieldError('phone') && (
          <span className="text-red-500 text-sm">{getFieldError('phone')}</span>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1" htmlFor="birthDate">
          Data de nascimento
        </label>
        <input
          id="birthDate"
          type="date"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.birthDate}
          onChange={handleInputChange('birthDate')}
          required
        />
        {getFieldError('birthDate') && (
          <span className="text-red-500 text-sm">{getFieldError('birthDate')}</span>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1" htmlFor="gender">
          Gênero
        </label>
        <select
          id="gender"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.gender}
          onChange={handleInputChange('gender')}
          required
        >
          <option value="">Selecione...</option>
          {GENDER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {getFieldError('gender') && (
          <span className="text-red-500 text-sm">{getFieldError('gender')}</span>
        )}
      </div>

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
          autoComplete="new-password"
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
          Confirmar senha
        </label>
        <input
          id="confirmPassword"
          type="password"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          required
          autoComplete="new-password"
        />
        {getFieldError('confirmPassword') && (
          <span className="text-red-500 text-sm">{getFieldError('confirmPassword')}</span>
        )}
      </div>

      {/* Seção da Empresa - Agora Obrigatória */}
      <div className="border-t pt-4 mb-4">
        <div className="mb-3">
          <h4 className="font-medium text-gray-900">Dados da Empresa</h4>
          <p className="text-sm text-gray-600">Configure sua empresa (obrigatório)</p>
        </div>

        {/* Campos da empresa (sempre visíveis e obrigatórios) */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <label className="block text-gray-700 mb-1 text-sm font-medium" htmlFor="empresaNome">
              Nome da Empresa *
            </label>
            <input
              id="empresaNome"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.empresaNome || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, empresaNome: e.target.value }))}
              placeholder="Nome da sua empresa"
              required
            />
            {getFieldError('empresaNome') && (
              <span className="text-red-500 text-sm">{getFieldError('empresaNome')}</span>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1 text-sm font-medium" htmlFor="empresaCnpj">
              CNPJ *
            </label>
            <input
              id="empresaCnpj"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.empresaCnpj || ''}
              onChange={handleInputChange('empresaCnpj')}
              placeholder="XX.XXX.XXX/XXXX-XX"
              required
            />
            {getFieldError('empresaCnpj') && (
              <span className="text-red-500 text-sm">{getFieldError('empresaCnpj')}</span>
            )}
          </div>
        </div>

        {/* Informação sobre o processo */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
          <p className="text-sm text-green-700">
            <strong>✅ Você será o administrador</strong> da empresa e poderá adicionar novos usuários e completar os dados da empresa posteriormente na página de administração.
          </p>
        </div>
      </div>

      {(formError || error) && (
        <div className="mb-4 text-red-600 text-sm text-center">
          {formError || error}
        </div>
      )}
      
      {profileErrorDetail && (
        <div className="mb-4 text-red-500 text-xs text-center">
          {profileErrorDetail}
        </div>
      )}
      
      {success && (
        <div className="mb-4 text-green-600 text-sm text-center">
          {MESSAGES.SUCCESS.REGISTER}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-60 mt-4"
        disabled={loading}
      >
        {loading ? 'Cadastrando...' : 'Criar Conta'}
      </button>
    </form>
  )
} 