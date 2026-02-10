import { useState } from 'react'
import {
  PlusIcon,
  EllipsisVerticalIcon,
  StarIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  ShareIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import type { CustomDashboard } from '../../../types'

interface DashboardListProps {
  dashboards: CustomDashboard[]
  activeDashboard: CustomDashboard | null
  loading: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onEdit: (dashboard: CustomDashboard) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onSetDefault: (id: string) => void
  onShare: (dashboard: CustomDashboard) => void
}

export function DashboardList({
  dashboards,
  activeDashboard,
  loading,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onDuplicate,
  onSetDefault,
  onShare
}: DashboardListProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)

  // Fechar dropdown ao clicar fora
  const handleClickOutside = () => {
    setIsDropdownOpen(false)
    setMenuOpenFor(null)
  }

  // Meus dashboards
  const myDashboards = dashboards.filter(d => d.user_permission === 'owner')
  // Compartilhados comigo
  const sharedDashboards = dashboards.filter(d => d.user_permission !== 'owner')

  if (loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Dropdown de seleção de dashboard */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]"
        >
          <span className="flex-1 text-left truncate">
            {activeDashboard?.name || 'Selecionar Dashboard'}
          </span>
          {activeDashboard?.is_default && (
            <StarIconSolid className="w-4 h-4 text-amber-500 flex-shrink-0" />
          )}
          <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={handleClickOutside}
            />
            <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-auto">
              {/* Meus Dashboards */}
              {myDashboards.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Meus Dashboards
                  </div>
                  {myDashboards.map((dashboard) => (
                    <DashboardListItem
                      key={dashboard.id}
                      dashboard={dashboard}
                      isActive={activeDashboard?.id === dashboard.id}
                      menuOpen={menuOpenFor === dashboard.id}
                      onSelect={() => {
                        onSelect(dashboard.id)
                        setIsDropdownOpen(false)
                      }}
                      onMenuToggle={() => setMenuOpenFor(
                        menuOpenFor === dashboard.id ? null : dashboard.id
                      )}
                      onEdit={() => {
                        onEdit(dashboard)
                        setMenuOpenFor(null)
                      }}
                      onDelete={() => {
                        onDelete(dashboard.id)
                        setMenuOpenFor(null)
                      }}
                      onDuplicate={() => {
                        onDuplicate(dashboard.id)
                        setMenuOpenFor(null)
                      }}
                      onSetDefault={() => {
                        onSetDefault(dashboard.id)
                        setMenuOpenFor(null)
                      }}
                      onShare={() => {
                        onShare(dashboard)
                        setMenuOpenFor(null)
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Compartilhados Comigo */}
              {sharedDashboards.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-t border-gray-200">
                    Compartilhados Comigo
                  </div>
                  {sharedDashboards.map((dashboard) => (
                    <DashboardListItem
                      key={dashboard.id}
                      dashboard={dashboard}
                      isActive={activeDashboard?.id === dashboard.id}
                      menuOpen={menuOpenFor === dashboard.id}
                      isShared
                      onSelect={() => {
                        onSelect(dashboard.id)
                        setIsDropdownOpen(false)
                      }}
                      onMenuToggle={() => setMenuOpenFor(
                        menuOpenFor === dashboard.id ? null : dashboard.id
                      )}
                      onDuplicate={() => {
                        onDuplicate(dashboard.id)
                        setMenuOpenFor(null)
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Vazio */}
              {dashboards.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  <p className="mb-2">Nenhum dashboard encontrado</p>
                  <button
                    onClick={() => {
                      onCreate()
                      setIsDropdownOpen(false)
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Criar seu primeiro dashboard
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Botão de criar novo */}
      <button
        onClick={onCreate}
        className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        title="Criar novo dashboard"
      >
        <PlusIcon className="w-5 h-5" />
      </button>
    </div>
  )
}

// =====================================================
// ITEM DA LISTA
// =====================================================

interface DashboardListItemProps {
  dashboard: CustomDashboard
  isActive: boolean
  menuOpen: boolean
  isShared?: boolean
  onSelect: () => void
  onMenuToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onSetDefault?: () => void
  onShare?: () => void
}

function DashboardListItem({
  dashboard,
  isActive,
  menuOpen,
  isShared,
  onSelect,
  onMenuToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onSetDefault,
  onShare
}: DashboardListItemProps) {
  const isOwner = dashboard.user_permission === 'owner'

  return (
    <div
      className={`relative flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${
        isActive ? 'bg-orange-50' : ''
      }`}
    >
      {/* Área clicável para selecionar */}
      <div className="flex-1 flex items-center gap-2" onClick={onSelect}>
        <span className={`truncate ${isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
          {dashboard.name}
        </span>
        {dashboard.is_default && (
          <StarIconSolid className="w-4 h-4 text-amber-500 flex-shrink-0" />
        )}
        {isShared && (
          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
            {dashboard.user_permission === 'edit' ? 'Edição' : 'Leitura'}
          </span>
        )}
      </div>

      {/* Menu de ações */}
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMenuToggle()
          }}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <EllipsisVerticalIcon className="w-4 h-4 text-gray-500" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
            {isOwner && onEdit && (
              <button
                onClick={onEdit}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                Renomear
              </button>
            )}
            
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
                Duplicar
              </button>
            )}

            {isOwner && onSetDefault && !dashboard.is_default && (
              <button
                onClick={onSetDefault}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <StarIcon className="w-4 h-4" />
                Definir como padrão
              </button>
            )}

            {isOwner && onShare && (
              <button
                onClick={onShare}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <ShareIcon className="w-4 h-4" />
                Compartilhar
              </button>
            )}

            {isOwner && onDelete && (
              <>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={onDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Excluir
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// MODAL DE CRIAR/EDITAR DASHBOARD
// =====================================================

interface CreateDashboardModalProps {
  isOpen: boolean
  editingDashboard?: CustomDashboard | null
  onClose: () => void
  onSave: (data: { name: string; description?: string }) => void
  saving?: boolean
}

export function CreateDashboardModal({
  isOpen,
  editingDashboard,
  onClose,
  onSave,
  saving
}: CreateDashboardModalProps) {
  const [name, setName] = useState(editingDashboard?.name || '')
  const [description, setDescription] = useState(editingDashboard?.description || '')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {editingDashboard ? 'Editar Dashboard' : 'Novo Dashboard'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Dashboard de Vendas"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional do dashboard"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : editingDashboard ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
