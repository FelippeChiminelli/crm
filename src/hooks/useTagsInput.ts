import { useState, useCallback } from 'react'

/**
 * Hook customizado para gerenciar input de tags
 * Fornece estado e funções para adicionar/remover tags de forma consistente
 */
export function useTagsInput(initialTags: string[] = []) {
  const [tagInput, setTagInput] = useState('')

  /**
   * Adiciona uma tag à lista
   * - Remove espaços em branco
   * - Impede duplicatas
   * - Não adiciona tags vazias
   */
  const addTag = useCallback((tags: string[], onTagsChange: (tags: string[]) => void) => {
    const trimmedTag = tagInput.trim()
    
    if (!trimmedTag) {
      return // Tag vazia, não adiciona
    }
    
    if (tags.includes(trimmedTag)) {
      return // Tag duplicada, não adiciona
    }
    
    onTagsChange([...tags, trimmedTag])
    setTagInput('') // Limpa o input após adicionar
  }, [tagInput])

  /**
   * Remove uma tag da lista
   */
  const removeTag = useCallback((
    tagToRemove: string, 
    tags: string[], 
    onTagsChange: (tags: string[]) => void
  ) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }, [])

  /**
   * Handler para tecla Enter no input de tags
   * Previne o submit do formulário e adiciona a tag
   */
  const handleTagKeyPress = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    tags: string[],
    onTagsChange: (tags: string[]) => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tags, onTagsChange)
    }
  }, [addTag])

  /**
   * Limpa o input de tags
   */
  const clearTagInput = useCallback(() => {
    setTagInput('')
  }, [])

  return {
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    handleTagKeyPress,
    clearTagInput
  }
}

