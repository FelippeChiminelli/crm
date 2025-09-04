import { useState } from 'react'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { useToastContext } from '../contexts/ToastContext'
import { updateTask } from '../services/taskService'
import type { Task, TaskStatus } from '../types'

interface UseTaskDragAndDropProps {
  tasksByStatus: { [key: string]: Task[] }
  setTasksByStatus?: React.Dispatch<React.SetStateAction<{ [key: string]: Task[] }>>
  onTaskUpdate?: () => void
}

export function useTaskDragAndDrop({ 
  tasksByStatus, 
  setTasksByStatus,
  onTaskUpdate
}: UseTaskDragAndDropProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { showError } = useToastContext()

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string
    console.log('🚀 handleDragStart chamado para tarefa:', taskId)
    setActiveId(taskId)
  }

  const handleDragOver = () => {
    // Lógica para drag over se necessário
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log(' handleDragEnd chamado:', { activeId: active.id, overId: over?.id })
    
    if (!over) {
      console.log('📍 Não há área de drop válida')
      setActiveId(null)
      return
    }
    
    const taskId = active.id as string
    const newStatus = over.id as string
    
    // Verificar se o status é válido
    const validStatuses: TaskStatus[] = ['pendente', 'em_andamento', 'concluida']
    if (!validStatuses.includes(newStatus as TaskStatus)) {
      console.log('❌ Status inválido:', newStatus)
      setActiveId(null)
      return
    }
    
    // Encontrar status atual da tarefa
    const currentStatus = Object.keys(tasksByStatus).find(status => 
      tasksByStatus[status].some(task => task.id === taskId)
    )
    
    if (!currentStatus) {
      console.error('❌ Status atual da tarefa não encontrado')
      setActiveId(null)
      return
    }
    
    console.log(` Tarefa está em: ${currentStatus}, target detectado: ${newStatus}`)
    
    // Se a tarefa foi solta no mesmo status, limpar activeId e retornar
    if (currentStatus === newStatus) {
      console.log('📌 Tarefa solta no mesmo status, nenhuma alteração necessária')
      setActiveId(null)
      return
    }
    
    setActiveId(null)
    
    console.log(`🔄 Movendo tarefa ${taskId} de ${currentStatus} para ${newStatus}`)
    
    // Fazer atualização otimista primeiro se setTasksByStatus estiver disponível
    if (setTasksByStatus) {
      const taskToMove = tasksByStatus[currentStatus].find(task => task.id === taskId)
      
      if (taskToMove) {
        setTasksByStatus(prev => {
          const newState = {
            ...prev,
            [currentStatus]: prev[currentStatus].filter(task => task.id !== taskId),
            [newStatus]: [...(prev[newStatus] || []), { ...taskToMove, status: newStatus as TaskStatus }]
          }
          console.log('✅ Estado local atualizado otimisticamente')
          return newState
        })
      }
    }
    
    try {
      // Tentar atualizar no banco com cast para TaskStatus
      await updateTask(taskId, { status: newStatus as TaskStatus })
      console.log('✅ Tarefa atualizada no banco com sucesso')
      
      // Chamar callback de atualização se fornecido
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (error) {
      console.error('❌ Erro ao mover tarefa no banco:', error)
      
      // Reverter estado local em caso de erro se setTasksByStatus estiver disponível
      if (setTasksByStatus) {
        const taskToMove = tasksByStatus[currentStatus].find(task => task.id === taskId)
        if (taskToMove) {
          setTasksByStatus(prev => {
            const revertState = {
              ...prev,
              [newStatus]: prev[newStatus].filter(task => task.id !== taskId),
              [currentStatus]: [...(prev[currentStatus] || []), taskToMove]
            }
            console.log('🔄 Estado local revertido devido a erro')
            return revertState
          })
        }
      }
      
      // Tratamento de erros
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('💥 Erro detalhado:', error)
      showError('Erro ao mover tarefa', errorMessage)
    }
  }

  return {
    activeId,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  }
} 