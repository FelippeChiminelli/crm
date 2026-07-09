import { useState, useEffect } from 'react'
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useToastContext } from '../../contexts/ToastContext'
import { LoadingButton } from '../ui/LoadingStates'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import {
  saveMetaCapiConfig,
} from '../../services/metaCapiService'
import type { MetaCapiConfig } from '../../types'
import { ds } from '../../utils/designSystem'

interface MetaCapiDatasetModalProps {
  isOpen: boolean
  onClose: () => void
  config: MetaCapiConfig | null
  onSaved: () => void
  onDelete?: (config: MetaCapiConfig) => void
}

export function MetaCapiDatasetModal({
  isOpen,
  onClose,
  config,
  onSaved,
  onDelete,
}: MetaCapiDatasetModalProps) {
  const isEdit = !!config
  const { showSuccess, showError } = useToastContext()

  const [name, setName] = useState('')
  const [datasetId, setDatasetId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [testEventCode, setTestEventCode] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setShowToken(false)
    setAccessToken('')
    if (config) {
      setName(config.name)
      setDatasetId(config.dataset_id)
      setTestEventCode(config.test_event_code ?? '')
      setAtivo(config.ativo)
    } else {
      setName('')
      setDatasetId('')
      setTestEventCode('')
      setAtivo(true)
    }
  }, [isOpen, config])

  useEscapeKey(isOpen, onClose)

  const handleSave = async () => {
    const trimmedName = name.trim()
    const trimmedDatasetId = datasetId.trim()
    const trimmedToken = accessToken.trim()

    if (!trimmedName) {
      showError('Nome do pixel é obrigatório')
      return
    }
    if (!trimmedDatasetId) {
      showError('Dataset ID é obrigatório')
      return
    }
    if (!isEdit && !trimmedToken) {
      showError('Access Token é obrigatório')
      return
    }

    setSaving(true)
    try {
      await saveMetaCapiConfig({
        config_id: config?.id ?? null,
        name: trimmedName,
        dataset_id: trimmedDatasetId,
        access_token: trimmedToken || null,
        test_event_code: testEventCode.trim() || null,
        ativo,
      })
      showSuccess(
        isEdit ? 'Dataset atualizado com sucesso!' : 'Dataset cadastrado com sucesso!',
      )
      onSaved()
      onClose()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar configuração'
      showError(message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Editar dataset/pixel' : 'Cadastrar dataset/pixel'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="meta-capi-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome do pixel <span className="text-red-500">*</span>
              </label>
              <input
                id="meta-capi-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pixel Hyundai, Loja Centro"
                className={ds.input()}
                disabled={saving}
              />
            </div>

            <div>
              <label
                htmlFor="meta-capi-dataset-id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Dataset ID <span className="text-red-500">*</span>
              </label>
              <input
                id="meta-capi-dataset-id"
                type="text"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                placeholder="Ex: 902603921203610"
                className={ds.input()}
                disabled={saving}
              />
            </div>

            <div>
              <label
                htmlFor="meta-capi-access-token"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Access Token {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  id="meta-capi-access-token"
                  type={showToken ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={
                    isEdit
                      ? 'Token salvo — cole um novo para atualizar'
                      : 'Cole o access token da Meta'
                  }
                  className={`${ds.input()} pr-10`}
                  disabled={saving}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showToken ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="meta-capi-test-event-code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Código de teste (opcional)
              </label>
              <input
                id="meta-capi-test-event-code"
                type="text"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value)}
                placeholder="Ex: TEST12345"
                className={ds.input()}
                disabled={saving}
              />
            </div>

            <div className="flex items-start justify-between gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Integração ativa
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Quando desativada, eventos não serão enviados para este pixel.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ativo}
                onClick={() => setAtivo(!ativo)}
                disabled={saving}
                className={`inline-flex items-center justify-center w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50
                  ${ativo ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 hover:bg-gray-400'}`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full transform transition-transform
                    ${ativo ? 'translate-x-2.5' : '-translate-x-2.5'}`}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
            <div>
              {isEdit && config && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(config)}
                  disabled={saving}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Excluir dataset
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className={`${ds.button('secondary')} text-sm`}
              >
                Cancelar
              </button>
              <LoadingButton
                loading={saving}
                onClick={handleSave}
                variant="primary"
                className="text-sm"
              >
                Salvar
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
