import type { ComponentType } from 'react'
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  PauseCircleIcon
} from '@heroicons/react/24/outline'
import type { ChatEngagementCategory } from '../../../../types'

/**
 * Apresentação das categorias de estágio do atendimento.
 * Centralizado aqui para que cards e drill-down usem os mesmos rótulos.
 */

export interface EngagementCategoryConfig {
  key: ChatEngagementCategory
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
  /** Cor do badge do ícone, no mesmo formato usado pelo KPICard */
  iconClasses: string
  /** Categorias em que a janela de inatividade não faz parte da regra */
  ignoresWindow?: boolean
}

export const ENGAGEMENT_CATEGORIES: EngagementCategoryConfig[] = [
  {
    key: 'nao_respondido',
    label: 'Não respondidos pela loja',
    description: 'O cliente enviou mensagem e a loja nunca respondeu.',
    icon: ExclamationTriangleIcon,
    iconClasses: 'bg-red-50 text-red-600 border-red-200',
    ignoresWindow: true
  },
  {
    key: 'aguardando_loja',
    label: 'Cliente esperando resposta',
    description: 'Houve conversa, mas o cliente falou por último e ficou sem retorno.',
    icon: ClockIcon,
    iconClasses: 'bg-orange-50 text-orange-600 border-orange-200'
  },
  {
    key: 'cliente_parou',
    label: 'Cliente parou de responder',
    description: 'A loja respondeu e falou por último, mas o cliente não deu continuidade.',
    icon: PauseCircleIcon,
    iconClasses: 'bg-amber-50 text-amber-600 border-amber-200'
  },
  {
    key: 'sem_resposta_cliente',
    label: 'Sem resposta do cliente',
    description: 'A loja iniciou o contato e o cliente nunca respondeu.',
    icon: NoSymbolIcon,
    iconClasses: 'bg-gray-50 text-gray-600 border-gray-200',
    ignoresWindow: true
  },
  {
    key: 'em_conversa',
    label: 'Em conversa',
    description: 'Troca ativa entre os dois lados dentro da janela de inatividade.',
    icon: ChatBubbleLeftRightIcon,
    iconClasses: 'bg-green-50 text-green-600 border-green-200'
  }
]

export function getCategoryConfig(
  category: ChatEngagementCategory
): EngagementCategoryConfig | undefined {
  return ENGAGEMENT_CATEGORIES.find(item => item.key === category)
}
