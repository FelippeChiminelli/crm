import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'
import { useFormValidation, validationRules } from '../../hooks/useFormValidation'
import { MESSAGES, GENDER_OPTIONS } from '../../utils/constants'

import type { RegisterFormData } from '../../types'
import { supabase } from '../../services/supabaseClient'
import { validatePartnerCode } from '../../services/partnerService'

type PartnerValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

export function RegisterForm() {
  const { handleSignUp, loading, error } = useAuth()
  const { validateForm, getFieldError, clearErrors } = useFormValidation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<RegisterFormData>({
    codigoParceiro: '',
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [partnerValidationStatus, setPartnerValidationStatus] = useState<PartnerValidationStatus>('idle')
  const [validatedPartnerId, setValidatedPartnerId] = useState<string | null>(null)
  const [partnerValidationMessage, setPartnerValidationMessage] = useState<string | null>(null)
  const partnerValidationRequestRef = useRef(0)

  useEffect(() => {
    const codigo = formData.codigoParceiro.trim()

    if (!codigo) {
      setPartnerValidationStatus('idle')
      setValidatedPartnerId(null)
      setPartnerValidationMessage(null)
      return
    }

    setPartnerValidationStatus('validating')
    setValidatedPartnerId(null)
    setPartnerValidationMessage(null)

    const requestId = ++partnerValidationRequestRef.current
    const timeoutId = window.setTimeout(async () => {
      const result = await validatePartnerCode(codigo)

      if (partnerValidationRequestRef.current !== requestId) {
        return
      }

      if (result.valid && result.parceiroId) {
        setPartnerValidationStatus('valid')
        setValidatedPartnerId(result.parceiroId)
        setPartnerValidationMessage(result.nome ? `Parceiro: ${result.nome}` : 'Código válido')
        return
      }

      setPartnerValidationStatus('invalid')
      setValidatedPartnerId(null)
      setPartnerValidationMessage(result.message || 'Código de parceiro inválido')
    }, 500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [formData.codigoParceiro])

  const handlePartnerCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    setFormData(prev => ({ ...prev, codigoParceiro: value }))
    if (error || formError) {
      clearErrors()
      setFormError(null)
    }
  }

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
      codigoParceiro: [validationRules.required('Código do parceiro')],
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

    let parceiroId = validatedPartnerId

    if (partnerValidationStatus !== 'valid' || !parceiroId) {
      const partnerCheck = await validatePartnerCode(formData.codigoParceiro)
      if (!partnerCheck.valid || !partnerCheck.parceiroId) {
        setFormError(partnerCheck.message || 'Código de parceiro inválido ou inativo')
        setPartnerValidationStatus('invalid')
        setPartnerValidationMessage(partnerCheck.message || 'Código de parceiro inválido')
        return
      }
      parceiroId = partnerCheck.parceiroId
      setValidatedPartnerId(partnerCheck.parceiroId)
      setPartnerValidationStatus('valid')
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
        max_usuarios: 2,
        p_parceiro_id: parceiroId
      })
      
      const { data: empresaResult, error: empresaError } = await supabase
        .rpc('create_empresa_rpc', {
          nome: formData.empresaNome,
          cnpj: formData.empresaCnpj,
          plano: 'basico',
          max_usuarios: 2,
          p_parceiro_id: parceiroId
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
    <form onSubmit={onSubmit} className="w-full flex flex-col gap-4 pt-1 pb-2">
      {/* Linha 1: Nome completo | Telefone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* Nome completo */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome completo
          </label>
          <input
            id="fullName"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
            value={formData.fullName}
            onChange={handleInputChange('fullName')}
            required
            autoComplete="name"
            placeholder="Digite seu nome completo"
          />
          {getFieldError('fullName') && (
            <span className="text-red-500 text-xs mt-1 block">{getFieldError('fullName')}</span>
          )}
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <div className="flex items-stretch">
            <div className="flex items-center justify-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-gray-700 font-medium text-sm">
              +55
            </div>
            <input
              type="tel"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
              value={formData.phone ? (() => {
                const nums = formData.phone.replace(/^55/, '').replace(/\D/g, '')
                if (nums.length === 0) return ''
                if (nums.length <= 2) return `(${nums}`
                if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
                return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`
              })() : ''}
              onChange={(e) => {
                let cleaned = e.target.value.replace(/\D/g, '')
                if (cleaned.length > 11) cleaned = cleaned.slice(0, 11)
                setFormData({...formData, phone: cleaned ? '55' + cleaned : ''})
              }}
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          {getFieldError('phone') && (
            <span className="text-red-500 text-xs mt-1 block">{getFieldError('phone')}</span>
          )}
        </div>
      </div>

      {/* Linha 2: Data de nascimento | Gênero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* Data de nascimento */}
        <div>
          <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
            Data de nascimento
          </label>
          <input
            id="birthDate"
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
            value={formData.birthDate}
            onChange={handleInputChange('birthDate')}
            required
          />
          {getFieldError('birthDate') && (
            <span className="text-red-500 text-xs mt-1 block">{getFieldError('birthDate')}</span>
          )}
        </div>

        {/* Gênero */}
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gênero
          </label>
          <select
            id="gender"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm appearance-none"
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
            <span className="text-red-500 text-xs mt-1 block">{getFieldError('gender')}</span>
          )}
        </div>
      </div>

      {/* Linha 3: E-mail | Senha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
            value={formData.email}
            onChange={handleInputChange('email')}
            required
            autoComplete="email"
            placeholder="Digite seu email"
          />
          {getFieldError('email') && (
            <span className="text-red-500 text-xs mt-1 block">{getFieldError('email')}</span>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
              value={formData.password}
              onChange={handleInputChange('password')}
              required
              autoComplete="new-password"
              placeholder="Digite sua senha"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          {getFieldError('password') && (
            <span className="text-red-500 text-xs mt-1 block">{getFieldError('password')}</span>
          )}
          <p className="text-xs text-gray-500">
            Mínimo 6 caracteres
          </p>
        </div>
      </div>

      {/* Confirmar senha */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirmar senha
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            required
            autoComplete="new-password"
            placeholder="Confirme sua senha"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
            title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showConfirmPassword ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        {getFieldError('confirmPassword') && (
          <span className="text-red-500 text-xs mt-1 block">{getFieldError('confirmPassword')}</span>
        )}
      </div>

      {/* Seção 3: Dados da Empresa - Destacada */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Dados da Empresa</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Nome da Empresa */}
          <div>
            <label htmlFor="empresaNome" className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Empresa
            </label>
            <input
              id="empresaNome"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
              value={formData.empresaNome || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, empresaNome: e.target.value }))}
              required
              placeholder="Digite o nome da empresa"
            />
            {getFieldError('empresaNome') && (
              <span className="text-red-500 text-xs mt-1 block">{getFieldError('empresaNome')}</span>
            )}
          </div>

          {/* CNPJ */}
          <div>
            <label htmlFor="empresaCnpj" className="block text-sm font-medium text-gray-700 mb-1">
              CNPJ
            </label>
            <input
              id="empresaCnpj"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm"
              value={formData.empresaCnpj || ''}
              onChange={handleInputChange('empresaCnpj')}
              required
              placeholder="00.000.000/0000-00"
            />
            {getFieldError('empresaCnpj') && (
              <span className="text-red-500 text-xs mt-1 block">{getFieldError('empresaCnpj')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Código do parceiro */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Código do parceiro</h3>
        </div>
        <div>
          <input
            id="codigoParceiro"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all text-sm uppercase"
            value={formData.codigoParceiro}
            onChange={handlePartnerCodeChange}
            required
            autoComplete="off"
            placeholder="Ex: ADV2026"
            aria-label="Código do parceiro"
          />
          {getFieldError('codigoParceiro') && (
            <span className="text-red-500 text-xs mt-1 block">{getFieldError('codigoParceiro')}</span>
          )}
          {partnerValidationStatus === 'validating' && (
            <span className="text-gray-500 text-xs mt-1 block">Validando código...</span>
          )}
          {partnerValidationStatus === 'valid' && partnerValidationMessage && (
            <span className="text-green-600 text-xs mt-1 block">{partnerValidationMessage}</span>
          )}
          {partnerValidationStatus === 'invalid' && partnerValidationMessage && (
            <span className="text-red-500 text-xs mt-1 block">{partnerValidationMessage}</span>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {formError && (
        <div className="text-red-600 text-sm text-center py-2">
          {formError}
        </div>
      )}
      
      {error && (
        <div className="text-red-600 text-sm text-center py-2">
          {error}
        </div>
      )}
      
      {profileErrorDetail && (
        <div className="text-red-500 text-xs text-center py-2">
          {profileErrorDetail}
        </div>
      )}
      
      {success && (
        <div className="text-green-600 text-sm text-center py-2">
          {MESSAGES.SUCCESS.REGISTER}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex flex-col items-center w-full pt-2 pb-1">
        <button
          type="submit"
          className="w-full max-w-[300px] px-4 py-2 bg-[#ff4207] hover:bg-[#e63a06] text-white rounded-lg focus:ring-2 focus:ring-[#ff4207]/20 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || partnerValidationStatus !== 'valid' || !validatedPartnerId}
        >
          {loading ? 'Cadastrando...' : 'Criar Conta'}
        </button>
      </div>
    </form>
  )
} 