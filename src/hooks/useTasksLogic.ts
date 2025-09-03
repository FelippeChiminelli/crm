/**
 * Hook principal para gerenciar tarefas
 * 
 * REFATORADO: Este arquivo agora usa composition de hooks menores para melhor organização:
 * - useTaskOperations: CRUD operations
 * - useTaskFilters: Filtros e busca
 * - useTaskStats: Estatísticas
 * - useTasksSimplified: Hook principal simplificado
 * 
 * O arquivo original foi salvo como useTasksLogic.backup.ts
 */

// Re-export da versão simplificada mantendo a mesma interface
export { useTasksSimplified as useTasksLogic } from './useTasksSimplified'

// Re-export dos hooks especializados para uso individual se necessário
export { useTaskOperations } from './useTaskOperations'
export { useTaskFilters } from './useTaskFilters'
export { useTaskStats } from './useTaskStats'