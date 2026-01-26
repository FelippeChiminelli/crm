import { useState, useEffect } from 'react'
import { 
  EyeIcon, 
  EyeSlashIcon 
} from '@heroicons/react/24/outline'
import type { CreateUserData } from '../../types'
import type { UserRole } from '../../contexts/AuthContext'
import { ds } from '../../utils/designSystem'
import { StyledSelect } from '../ui/StyledSelect'
import { PhoneInput } from '../ui/PhoneInput'
import { GENDER_OPTIONS } from '../../utils/constants'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { LoadingButton, ErrorCard, SuccessCard } from '../ui/LoadingStates'
import { validateBrazilianPhone } from '../../utils/validations'
import { ResponsiveModal } from '../common/ResponsiveModal'

interface EmpresaUser {
  uuid: string
  full_name: string
  email: string
  phone: string
  birth_date?: string
  gender?: 'masculino' | 'feminino' | 'outro'
  created_at: string
  is_admin?: boolean
  role?: string
}

interface CreateUserWithRoleData extends CreateUserData {
  role: UserRole
}

interface UpdateUserData {
  full_name?: string
  email?: string
  phone?: string
  birth_date?: string
  gender?: 'masculino' | 'feminino' | 'outro'
  is_admin?: boolean
}

interface UserFormModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  user?: EmpresaUser | null
  onClose: () => void
  onCreateUser?: (userData: CreateUserWithRoleData) => Promise<void>
  onUpdateUser?: (userId: string, data: UpdateUserData) => Promise<void>
  onRefresh: () => Promise<void>
}

export function UserFormModal({ 
  isOpen, 
  mode, 
  user, 
  onClose, 
  onCreateUser, 
  onUpdateUser,
  onRefresh 
}: UserFormModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  
  // Formulário de criação
  const [createForm, setCreateForm] = useState<CreateUserWithRoleData>({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: 'masculino',
    password: '',
    role: 'VENDEDOR'
  })

  // Formulário de edição
  const [editForm, setEditForm] = useState<{
    full_name: string
    email: string
    phone: string
    birth_date: string
    gender: 'masculino' | 'feminino' | 'outro'
    is_admin: boolean
  }>({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: 'masculino',
    is_admin: false
  })

  const {
    loading: submitting,
    error,
    success,
    executeAsync,
    clearMessages
  } = useStandardizedLoading({
    successMessage: mode === 'create' ? 'Usuário criado com sucesso!' : 'Usuário atualizado com sucesso!',
    errorMessage: mode === 'create' ? 'Erro ao criar usuário' : 'Erro ao atualizar usuário'
  })

  // Carregar dados do usuário quando estiver editando
  useEffect(() => {
    if (mode === 'edit' && user) {
      setEditForm({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || '',
        birth_date: user.birth_date || '',
        gender: (user.gender as 'masculino' | 'feminino' | 'outro') || 'masculino',
        is_admin: user.is_admin || false
      })
    }
  }, [mode, user])

  // Limpar formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      setCreateForm({
        fullName: '',
        email: '',
        phone: '',
        birthDate: '',
        gender: 'masculino',
        password: '',
        role: 'VENDEDOR'
      })
      setEditForm({
        full_name: '',
        email: '',
        phone: '',
        birth_date: '',
        gender: 'masculino',
        is_admin: false
      })
      setShowPassword(false)
      clearMessages()
    }
  }, [isOpen, clearMessages])

  const handleSubmit = async () => {
    await executeAsync(async () => {
      if (mode === 'create' && onCreateUser) {
        // Validações de criação
        if (!createForm.fullName.trim()) {
          throw new Error('Nome completo é obrigatório')
        }
        if (!createForm.email.trim()) {
          throw new Error('Email é obrigatório')
        }
        if (!createForm.phone.trim()) {
          throw new Error('Telefone é obrigatório')
        }
        const phoneValidation = validateBrazilianPhone(createForm.phone)
        if (!phoneValidation.isValid) {
          throw new Error(phoneValidation.errors[0])
        }
        if (!createForm.password.trim() || createForm.password.length < 6) {
          throw new Error('Senha deve ter pelo menos 6 caracteres')
        }

        await onCreateUser(createForm)
        await onRefresh()
        onClose()
      } else if (mode === 'edit' && onUpdateUser && user) {
        // Validações de edição
        if (!editForm.full_name.trim()) {
          throw new Error('Nome completo é obrigatório')
        }
        if (!editForm.email.trim()) {
          throw new Error('Email é obrigatório')
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(editForm.email.trim())) {
          throw new Error('Email inválido')
        }
        if (!editForm.phone.trim()) {
          throw new Error('Telefone é obrigatório')
        }
        const phoneValidation = validateBrazilianPhone(editForm.phone)
        if (!phoneValidation.isValid) {
          throw new Error(phoneValidation.errors[0])
        }

        await onUpdateUser(user.uuid, editForm)
        await onRefresh()
        onClose()
      }
    })
  }

  const handleClose = () => {
    if (!submitting) {
      onClose()
    }
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
      size="md"
    >
      <div className="space-y-4">
        {/* Mensagens */}
        {error && <ErrorCard message={error} />}
        {success && <SuccessCard message={success} />}

        {mode === 'create' ? (
          // Formulário de Criação
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={createForm.fullName}
                onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                className={`${ds.input()} text-sm`}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                className={`${ds.input()} text-sm`}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Telefone *
              </label>
              <PhoneInput
                value={createForm.phone}
                onChange={(value) => setCreateForm(prev => ({ ...prev, phone: value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={createForm.birthDate}
                onChange={(e) => setCreateForm(prev => ({ ...prev, birthDate: e.target.value }))}
                className={`${ds.input()} text-sm`}
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Gênero
              </label>
              <StyledSelect
                options={GENDER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                value={createForm.gender}
                onChange={(val) => setCreateForm(prev => ({ ...prev, gender: val as 'masculino' | 'feminino' | 'outro' }))}
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Nível de Acesso *
              </label>
              <StyledSelect
                options={[
                  { value: 'VENDEDOR', label: 'Vendedor' },
                  { value: 'ADMIN', label: 'Administrador' }
                ]}
                value={createForm.role}
                onChange={(val) => setCreateForm(prev => ({ ...prev, role: val as UserRole }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Senha *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className={`${ds.input()} text-sm pr-10`}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Formulário de Edição
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                className={`${ds.input()} text-sm`}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Email *
                <span className="ml-1 text-[10px] lg:text-xs text-amber-600">(altera login)</span>
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className={`${ds.input()} text-sm`}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Telefone *
              </label>
              <PhoneInput
                value={editForm.phone}
                onChange={(value) => setEditForm(prev => ({ ...prev, phone: value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={editForm.birth_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))}
                className={`${ds.input()} text-sm`}
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Gênero
              </label>
              <StyledSelect
                options={GENDER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                value={editForm.gender}
                onChange={(val) => setEditForm(prev => ({ ...prev, gender: val as 'masculino' | 'feminino' | 'outro' }))}
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Nível de Acesso *
              </label>
              <StyledSelect
                options={[
                  { value: 'false', label: 'Vendedor' },
                  { value: 'true', label: 'Administrador' }
                ]}
                value={String(editForm.is_admin)}
                onChange={(val) => setEditForm(prev => ({ ...prev, is_admin: val === 'true' }))}
              />
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={submitting}
            className={`${ds.button('secondary')} text-sm px-4 py-2`}
          >
            Cancelar
          </button>
          <LoadingButton
            loading={submitting}
            onClick={handleSubmit}
            variant="primary"
            className="text-sm px-4 py-2"
          >
            {mode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
          </LoadingButton>
        </div>
      </div>
    </ResponsiveModal>
  )
}
