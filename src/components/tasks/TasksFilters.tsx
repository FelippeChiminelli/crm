import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ds, statusColors } from '../../utils/designSystem'

interface TasksFiltersProps {
  searchTerm: string
  statusFilter: string
  priorityFilter: string
  sortBy: string
  sortOrder: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onSortByChange: (value: string) => void
  onSortOrderChange: (value: string) => void
  onClearFilters: () => void
}

export function TasksFilters({
  searchTerm,
  statusFilter,
  priorityFilter,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onSortByChange,
  onSortOrderChange,
  onClearFilters
}: TasksFiltersProps) {
  return (
    <div className={`${ds.card()} ${statusColors.secondary.bg}`}>
      <div className="space-y-4">
        {/* Linha 1: Busca e Botão Limpar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`${ds.input()} pl-10`}
            />
          </div>
          
          {/* Botão Limpar Filtros */}
          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || sortBy !== 'due_date' || sortOrder !== 'asc') && (
            <button
              onClick={onClearFilters}
              className={`${ds.button('outline')} flex items-center gap-2 whitespace-nowrap`}
              title="Limpar todos os filtros"
            >
              <XMarkIcon className="w-4 h-4" />
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Linha 2: Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className={ds.input()}
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">⏳ Pendentes</option>
            <option value="em_andamento">🔄 Em Andamento</option>
            <option value="concluida">✅ Concluídas</option>
            <option value="cancelada">❌ Canceladas</option>
            <option value="atrasada">⚠️ Atrasadas</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className={ds.input()}
          >
            <option value="all">Todas as Prioridades</option>
            <option value="baixa">🟢 Baixa</option>
            <option value="media">🟡 Média</option>
            <option value="alta">🟠 Alta</option>
            <option value="urgente">🔴 Urgente</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className={ds.input()}
          >
            <option value="due_date">📅 Data de Vencimento</option>
            <option value="created_at">📝 Data de Criação</option>
            <option value="priority">⚡ Prioridade</option>
            <option value="status">📊 Status</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
            className={ds.input()}
          >
            <option value="asc">↗️ Crescente</option>
            <option value="desc">↘️ Decrescente</option>
          </select>
        </div>
      </div>
    </div>
  )
}
