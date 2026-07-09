import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { MetaCapiDatasetRow } from './MetaCapiDatasetRow'
import { MetaCapiDatasetModal } from './MetaCapiDatasetModal'
import { MetaCapiEventos } from './MetaCapiEventos'
import { useConfirm } from '../../hooks/useConfirm'
import { useToastContext } from '../../contexts/ToastContext'
import {
  listMetaCapiConfigs,
  deleteMetaCapiConfig,
} from '../../services/metaCapiService'
import type { MetaCapiConfig } from '../../types'
import { ds } from '../../utils/designSystem'

export function MetaCapiTab() {
  const { showSuccess, showError } = useToastContext()
  const { confirm } = useConfirm()

  const [configs, setConfigs] = useState<MetaCapiConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<MetaCapiConfig | null>(null)

  const loadConfigs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listMetaCapiConfigs()
      setConfigs(data)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar datasets'
      showError(message)
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const summary = useMemo(() => {
    const active = configs.filter((c) => c.ativo).length
    const total = configs.length
    if (total === 0) return 'Nenhum pixel configurado'
    return `${active} pixel${active !== 1 ? 's' : ''} ativo${active !== 1 ? 's' : ''} de ${total} configurado${total !== 1 ? 's' : ''}`
  }, [configs])

  const openCreateModal = () => {
    setEditingConfig(null)
    setModalOpen(true)
  }

  const openEditModal = (config: MetaCapiConfig) => {
    setEditingConfig(config)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingConfig(null)
  }

  const handleSaved = () => {
    loadConfigs()
    setEventsRefreshKey((k) => k + 1)
  }

  const handleDelete = async (config: MetaCapiConfig) => {
    const confirmed = await confirm({
      title: 'Excluir dataset/pixel',
      message: `Deseja excluir "${config.name}"?\n\nEventos já enviados permanecerão no histórico, mas novos envios para este pixel deixarão de funcionar.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    })
    if (!confirmed) return

    setSavingId(config.id)
    try {
      await deleteMetaCapiConfig(config.id)
      showSuccess('Dataset excluído com sucesso')
      closeModal()
      await loadConfigs()
      setEventsRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao excluir dataset'
      showError(message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <MetaCapiDatasetModal
        isOpen={modalOpen}
        onClose={closeModal}
        config={editingConfig}
        onSaved={handleSaved}
        onDelete={handleDelete}
      />

      <div className="space-y-8">
        <div className="space-y-4 lg:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs lg:text-sm text-gray-600">{summary}</p>
            <button
              type="button"
              onClick={openCreateModal}
              className={`${ds.button('primary')} text-sm`}
            >
              <PlusIcon className="w-4 h-4" />
              Cadastrar dataset/pixel
            </button>
          </div>

          <div className="bg-white border rounded-lg shadow-sm">
            <div className="p-3 lg:p-6 border-b border-gray-200">
              <h3 className="text-base lg:text-xl font-semibold text-gray-900">
                Datasets cadastrados
              </h3>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">
                Gerencie os pixels/datasets da Meta Conversions API conectados
                à sua empresa.
              </p>
            </div>

            <div className="px-2 lg:px-4">
              {loading ? (
                <div className="p-6 lg:p-8 text-center">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2 lg:mb-3" />
                  <p className="text-xs lg:text-sm text-gray-500">
                    Carregando...
                  </p>
                </div>
              ) : configs.length === 0 ? (
                <div className="p-6 lg:p-8 text-center">
                  <h4 className="text-sm lg:text-lg font-medium text-gray-900 mb-1 lg:mb-2">
                    Nenhum dataset cadastrado
                  </h4>
                  <p className="text-xs lg:text-sm text-gray-600 mb-4">
                    Cadastre um pixel para enviar eventos offline à Meta.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className={`${ds.button('primary')} text-sm`}
                  >
                    <PlusIcon className="w-4 h-4" />
                    Cadastrar dataset/pixel
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 pb-4">
                  {configs.map((config) => (
                    <MetaCapiDatasetRow
                      key={config.id}
                      config={config}
                      savingId={savingId}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        <MetaCapiEventos refreshKey={eventsRefreshKey} />
      </div>
    </>
  )
}
