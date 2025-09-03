import { useState } from 'react'
import { BuildingOfficeIcon, PencilIcon, CheckIcon, XMarkIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import type { Empresa, EmpresaStats, UpdateEmpresaData } from '../../types'
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
    <div className="space-y-6">
      {/* Mensagens */}
      {error && <ErrorCard message={error} />}
      {success && <SuccessCard message={success} />}

      {/* Informações da Empresa */}
      <div className={ds.card()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BuildingOfficeIcon className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Informações da Empresa</h2>
            </div>
            
            {canEdit && (
              <div className="flex space-x-2">
                {editing ? (
                  <>
                    <LoadingButton
                      loading={saving}
                      onClick={handleSave}
                      variant="primary"
                      className="inline-flex items-center px-3 py-2 text-sm"
                    >
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Salvar
                    </LoadingButton>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className={`${ds.button('secondary')} inline-flex items-center px-3 py-2 text-sm`}
                    >
                      <XMarkIcon className="w-4 h-4 mr-1" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Editar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
              {editing ? (
                <input
                  type="text"
                  value={editForm.nome || ''}
                  onChange={(e) => updateEditForm('nome', e.target.value)}
                  className={ds.input()}
                  placeholder="Nome da empresa"
                />
              ) : (
                <p className="text-gray-900 font-medium">{empresa.nome}</p>
              )}
            </div>

            {/* CNPJ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              {editing ? (
                <input
                  type="text"
                  value={editForm.cnpj || ''}
                  onChange={(e) => updateEditForm('cnpj', e.target.value)}
                  className={ds.input()}
                  placeholder="00.000.000/0000-00"
                />
              ) : (
                <p className="text-gray-900 font-medium">
                  {empresa.cnpj ? formatCNPJ(empresa.cnpj) : 'Não informado'}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {editing ? (
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => updateEditForm('email', e.target.value)}
                  className={ds.input()}
                  placeholder="contato@empresa.com"
                />
              ) : (
                <p className="text-gray-900">{empresa.email || 'Não informado'}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              {editing ? (
                <input
                  type="tel"
                  value={editForm.telefone || ''}
                  onChange={(e) => updateEditForm('telefone', e.target.value)}
                  className={ds.input()}
                  placeholder="(11) 99999-9999"
                />
              ) : (
                <p className="text-gray-900">{empresa.telefone || 'Não informado'}</p>
              )}
            </div>

            {/* Endereço */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              {editing ? (
                <textarea
                  value={editForm.endereco || ''}
                  onChange={(e) => updateEditForm('endereco', e.target.value)}
                  className={ds.input()}
                  placeholder="Endereço completo da empresa"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900">{empresa.endereco || 'Não informado'}</p>
              )}
            </div>

            {/* Informações do Plano */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
              <p className="text-gray-900 font-medium capitalize">{empresa.plano}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Usuários</label>
              <p className="text-gray-900 font-medium">{empresa.max_usuarios}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className={ds.card()}>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <ChartBarIcon className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Estatísticas da Empresa</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.usuarios}</div>
                  <div className="ml-2 text-sm text-blue-600">usuários ativos</div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-green-600">{stats.leads}</div>
                  <div className="ml-2 text-sm text-green-600">leads cadastrados</div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.pipelines}</div>
                  <div className="ml-2 text-sm text-purple-600">pipelines criados</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
