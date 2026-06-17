import type { Task } from '../../types'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { TasksListMobile } from './TasksListMobile'
import { TasksListDesktop } from './TasksListDesktop'

interface TasksListProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask?: (taskId: string) => Promise<void>
  getResponsibleName: (assignedTo?: string) => string
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAllPage?: (selected: boolean) => void
}

/**
 * Componente responsivo de lista de tarefas
 * Alterna automaticamente entre visualização mobile (cards) e desktop (tabela)
 */
export function TasksList({
  tasks,
  onEditTask,
  onDeleteTask,
  getResponsibleName,
  selectedIds,
  onToggleSelect,
  onSelectAllPage
}: TasksListProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  if (isDesktop) {
    return (
      <TasksListDesktop
        tasks={tasks}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        getResponsibleName={getResponsibleName}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onSelectAllPage={onSelectAllPage}
      />
    )
  }

  return (
    <TasksListMobile
      tasks={tasks}
      onEditTask={onEditTask}
      onDeleteTask={onDeleteTask}
      getResponsibleName={getResponsibleName}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
    />
  )
}
