import { useState } from 'react'
import { BuildingOfficeIcon, PencilIcon, CheckIcon, XMarkIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import type { Empresa, EmpresaStats, UpdateEmpresaData } from '../../types'
import { PhoneInput } from '../ui/PhoneInput'
import { ds } from '../../utils/designSystem'
import { useStandardizedLoading } from '../../hooks/useStandardizedLoading'
import { LoadingButton, ErrorCard, SuccessCard } from '../ui/LoadingStates'
import { validateCNPJ, formatCNPJ } from '../../utils/validations'

interface EmpresaOverviewProps {
  empresa: Empresa
  stats: EmpresaStats | null
  onUpdate: (data: UpdateEmpresaData) => Promise<void>
  canEdit: boolean
}

export function EmpresaOverview({ empresa, stats, onUpdate, canEdit }: EmpresaOverviewProps) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<UpdateEmpresaData>({})
  
  const {
    loading: saving,
    error,
    success,
    executeAsync,
    clearMessages
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
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className={ds.card()}>
          <div className="p-3 lg:p-6">
            <div className="flex items-center space-x-2 lg:space-x-3 mb-4 lg:mb-6">
              <ChartBarIcon className="w-5 h-5 lg:w-6 lg:h-6 text-primary-600" />
              <h2 className="text-base lg:text-xl font-semibold text-gray-900">Estatísticas</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:gap-4">
              <div className="bg-blue-50 rounded-lg p-2 lg:p-4">
                <div className="flex flex-col lg:flex-row lg:items-center">
                  <div className="text-lg lg:text-2xl font-bold text-blue-600">{stats.usuarios}</div>
                  <div className="lg:ml-2 text-[10px] lg:text-sm text-blue-600">usuários</div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-2 lg:p-4">
                <div className="flex flex-col lg:flex-row lg:items-center">
                  <div className="text-lg lg:text-2xl font-bold text-green-600">{stats.leads}</div>
                  <div className="lg:ml-2 text-[10px] lg:text-sm text-green-600">leads</div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-2 lg:p-4">
                <div className="flex flex-col lg:flex-row lg:items-center">
                  <div className="text-lg lg:text-2xl font-bold text-purple-600">{stats.pipelines}</div>
                  <div className="lg:ml-2 text-[10px] lg:text-sm text-purple-600">pipelines</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
