import type { CallMessageMetadata, CallResult } from '../../../types'

type CallDirection = 'inbound' | 'outbound'

/** `inbound` = atendente ligou; `outbound` = contato ligou (convenção da timeline). */
const RESULT_LABELS: Record<CallDirection, Record<CallResult, string>> = {
  inbound: {
    atendida: 'realizada',
    nao_atendida: 'não atendida',
    perdida: 'não atendida',
    recusada: 'recusada pelo contato',
  },
  outbound: {
    atendida: 'recebida',
    nao_atendida: 'perdida',
    perdida: 'perdida',
    recusada: 'recusada',
  },
}

const MOTIVO_LABELS: Record<string, string> = {
  accepted_elsewhere: 'Atendida em outro aparelho',
  rejected_elsewhere: 'Recusada em outro aparelho',
}

export interface CallInfo {
  title: string
  details: string[]
  isVideo: boolean
  failed: boolean
}

export function formatCallDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}min`
  if (minutes > 0) return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`
  return `${seconds}s`
}

export function getCallInfo(direction: CallDirection, metadata?: CallMessageMetadata | null): CallInfo {
  const isVideo = metadata?.is_video === true
  const kind = isVideo ? 'Videochamada' : 'Chamada'
  const result = metadata?.resultado
  const resultLabel = result
    ? RESULT_LABELS[direction][result] ?? result
    : RESULT_LABELS[direction].atendida

  const details: string[] = []
  if (metadata?.duracao_seg && metadata.duracao_seg > 0) {
    details.push(formatCallDuration(metadata.duracao_seg))
  }
  const motivo = metadata?.motivo ? MOTIVO_LABELS[metadata.motivo] : undefined
  if (motivo) details.push(motivo)

  return {
    title: `${kind} ${resultLabel}`,
    details,
    isVideo,
    failed: !!result && result !== 'atendida',
  }
}
