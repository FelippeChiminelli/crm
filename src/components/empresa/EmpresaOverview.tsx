import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BuildingOfficeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import type { Empresa, UpdateEmpresaData } from '../../types'
import { PhoneInput } from '../ui/PhoneInput'
import { ds } from '../../utils/designSystem'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { useConfirm } from '../../hooks/useConfirm'
import { useAuthContext } from '../../contexts/AuthContext'
import { LoadingButton, ErrorCard, SuccessCard } from '../ui/LoadingStates'
import { validateCNPJ, formatCNPJ } from '../../utils/validations'

interface EmpresaOverviewProps {
  empresa: Empresa
  onUpdate: (data: UpdateEmpresaData) => Promise<void>
  canEdit: boolean
}

export function EmpresaOverview({ empresa, onUpdate, canEdit }: EmpresaOverviewProps) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<UpdateEmpresaData>({})
  const [deactivating, setDeactivating] = useState(false)
  const { confirm } = useConfirm()
  const { logout } = useAuthContext()
  const navigate = useNavigate()
  
  const {
    loading: saving,
    error,
    success,
    executeAsync,
    clearMessages,
    setError,
  } = useStandardizedLoading({
    successMessage: 'Empresa atualizada com sucesso!',
    errorMessage: 'Erro ao atualizar empresa'
  })

  const handleEdit = () => {
    setEditForm({
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      email: empresa.email || '',
      telefone: empresa.telefone || '',
      endereco: empresa.endereco || ''
    })
    setEditing(true)
    clearMessages()
  }

  const handleCancel = () => {
    setEditing(false)
    setEditForm({})
    clearMessages()
  }

  const handleSave = async () => {
    await executeAsync(async () => {
      // Validar CNPJ se foi alterado
      if (editForm.cnpj && editForm.cnpj !== empresa.cnpj) {
        const cnpjValidation = validateCNPJ(editForm.cnpj)
        if (!cnpjValidation.isValid) {
          throw new Error(cnpjValidation.errors[0])
        }
      }

      await onUpdate(editForm)
      setEditing(false)
    })
  }

  const updateEditForm = (field: keyof UpdateEmpresaData, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleDeactivateEmpresa = async () => {
    const confirmed = await confirm({
      title: 'Desativar empresa',
      message:
        `Tem certeza que deseja desativar a empresa "${empresa.nome}"?\n\nTodos os usuários perderão o acesso ao sistema até que a empresa seja reativada. Você será desconectado imediatamente após confirmar.`,
      confirmText: 'Desativar empresa',
      cancelText: 'Cancelar',
      type: 'danger',
    })

    if (!confirmed) return

    setDeactivating(true)
    clearMessages()
    try {
      await onUpdate({ ativo: false })
      await logout()
      navigate('/auth', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar empresa')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Mensagens */}
      {error && <ErrorCard message={error} />}
      {success && <SuccessCard message={success} />}

      {/* Informações da Empresa */}
      <div className={ds.card()}>
        <div className="p-3 lg:p-6">
          <div className="flex items-center justify-between mb-4 lg:mb-6 gap-2">
            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0">
              <BuildingOfficeIcon className="w-5 h-5 lg:w-6 lg:h-6 text-primary-600 flex-shrink-0" />
              <h2 className="text-base lg:text-xl font-semibold text-gray-900 truncate">Informações da Empresa</h2>
            </div>
            
            {canEdit && (
              <div className="flex space-x-1.5 lg:space-x-2 flex-shrink-0">
                {editing ? (
                  <>
                    <LoadingButton
                      loading={saving}
                      onClick={handleSave}
                      variant="primary"
                      className="inline-flex items-center px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm"
                    >
                      <CheckIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1" />
                      <span className="hidden sm:inline">Salvar</span>
                    </LoadingButton>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className={`${ds.button('secondary')} inline-flex items-center px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm`}
                    >
                      <XMarkIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center px-2 lg:px-3 py-1.5 lg:py-2 border border-gray-300 rounded-md text-xs lg:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            {/* ID da Empresa */}
            <div className="sm:col-span-2">
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">ID da Empresa</label>
              <div className="flex items-center gap-2">
                <code className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs lg:text-sm font-mono">
                  {empresa.id}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(empresa.id)
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copiar ID"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
              {editing ? (
                <input
                  type="text"
                  value={editForm.nome || ''}
                  onChange={(e) => updateEditForm('nome', e.target.value)}
                  className={`${ds.input()} text-sm`}
                  placeholder="Nome da empresa"
                />
              ) : (
                <p className="text-gray-900 font-medium text-sm lg:text-base">{empresa.nome}</p>
              )}
            </div>

            {/* CNPJ */}
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              {editing ? (
                <input
                  type="text"
                  value={editForm.cnpj || ''}
                  onChange={(e) => updateEditForm('cnpj', e.target.value)}
                  className={`${ds.input()} text-sm`}
                  placeholder="00.000.000/0000-00"
                />
              ) : (
                <p className="text-gray-900 font-medium text-sm lg:text-base">
                  {empresa.cnpj ? formatCNPJ(empresa.cnpj) : 'Não informado'}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Email</label>
              {editing ? (
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => updateEditForm('email', e.target.value)}
                  className={`${ds.input()} text-sm`}
                  placeholder="contato@empresa.com"
                />
              ) : (
                <p className="text-gray-900 text-sm lg:text-base truncate">{empresa.email || 'Não informado'}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Telefone</label>
              {editing ? (
                <PhoneInput
                  value={editForm.telefone || ''}
                  onChange={(value) => updateEditForm('telefone', value)}
                />
              ) : (
                <p className="text-gray-900 text-sm lg:text-base">{empresa.telefone || 'Não informado'}</p>
              )}
            </div>

            {/* Endereço */}
            <div className="sm:col-span-2">
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Endereço</label>
              {editing ? (
                <textarea
                  value={editForm.endereco || ''}
                  onChange={(e) => updateEditForm('endereco', e.target.value)}
                  className={`${ds.input()} text-sm`}
                  placeholder="Endereço completo da empresa"
                  rows={2}
                />
              ) : (
                <p className="text-gray-900 text-sm lg:text-base">{empresa.endereco || 'Não informado'}</p>
              )}
            </div>

            {/* Informações do Plano */}
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Plano</label>
              <p className="text-gray-900 font-medium capitalize text-sm lg:text-base">{empresa.plano}</p>
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Máx. Usuários</label>
              <p className="text-gray-900 font-medium text-sm lg:text-base">{empresa.max_usuarios}</p>
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Status</label>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  empresa.ativo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {empresa.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>

          {canEdit && empresa.ativo && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 lg:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-red-900">Zona de perigo</h3>
                    <p className="mt-1 text-xs lg:text-sm text-red-700">
                      Ao desativar a empresa, todos os usuários serão impedidos de acessar o sistema.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeactivateEmpresa}
                    disabled={deactivating}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
                  >
                    {deactivating ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                        Desativando...
                      </>
                    ) : (
                      <>
                        <NoSymbolIcon className="h-4 w-4" />
                        Desativar empresa
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
