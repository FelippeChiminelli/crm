import type { Task } from '../../types'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { TasksListMobile } from './TasksListMobile'
import { TasksListDesktop } from './TasksListDesktop'

interface TasksListProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask?: (taskId: string) => Promise<void>
  getResponsibleName: (assignedTo?: string) => string
}

/**
 * Componente responsivo de lista de tarefas
 * Alterna automaticamente entre visualização mobile (cards) e desktop (tabela)
 */
export function TasksList({ tasks, onEditTask, onDeleteTask, getResponsibleName }: TasksListProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  // Renderiza versão mobile ou desktop baseado no tamanho da tela
  if (isDesktop) {
    return (
      <TasksListDesktop
        tasks={tasks}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        getResponsibleName={getResponsibleName}
      />
    )
  }

  return (
    <TasksListMobile
      tasks={tasks}
      onEditTask={onEditTask}
      onDeleteTask={onDeleteTask}
      getResponsibleName={getResponsibleName}
    />
  )
}
