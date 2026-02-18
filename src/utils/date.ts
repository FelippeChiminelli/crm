// Utilitários de data com foco em due_date/due_time (tarefas) respeitando fuso UTC-3

const APP_TIMEZONE = 'America/Sao_Paulo'
// Offset em minutos para UTC-3 (local = UTC-3 ⇒ para obter UTC, somar 180 minutos)
const TIMEZONE_OFFSET_MINUTES = 180

// Converte 'YYYY-MM-DD' para Date local em 00:00
export function parseDateOnlyToLocal(dateString: string): Date {
  const safe = (dateString || '').slice(0, 10) // garante YYYY-MM-DD mesmo se vier ISO com 'T'
  const [year, month, day] = safe.split('-').map(Number)
  // Interpreta como meia-noite no fuso UTC-3
  const msUtc = Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0) + TIMEZONE_OFFSET_MINUTES * 60 * 1000
  return new Date(msUtc)
}

// Combina 'YYYY-MM-DD' + 'HH:mm' para Date local
export function combineDateAndTimeToLocal(dateString: string, timeString: string): Date {
  const safe = (dateString || '').slice(0, 10)
  const [year, month, day] = safe.split('-').map(Number)
  const [hour, minute] = timeString.split(':').map(Number)
  // Interpreta como horário no fuso UTC-3, convertendo para instante UTC
  const msUtc = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0) + TIMEZONE_OFFSET_MINUTES * 60 * 1000
  return new Date(msUtc)
}

// Retorna a data de comparação efetiva de vencimento
// Se tiver horário, usa aquele horário; caso contrário, considera o fim do dia (23:59:59.999) local
export function getDueDateComparable(dateString?: string, timeString?: string): Date | null {
  if (!dateString) return null
  if (timeString) return combineDateAndTimeToLocal(dateString, timeString)
  // Fim do dia no fuso UTC-3 ⇒ 23:59:59.999 UTC-3 convertido para UTC
  const end = parseDateOnlyToLocal(dateString)
  end.setUTCHours(end.getUTCHours() + 23, 59, 59, 999)
  return end
}

// Início do dia local para ordenação/intervalos
export function getStartOfDayLocal(dateString?: string): Date | null {
  if (!dateString) return null
  return parseDateOnlyToLocal(dateString)
}

// Fim do dia local para ordenação/intervalos
export function getEndOfDayLocal(dateString?: string): Date | null {
  if (!dateString) return null
  const d = parseDateOnlyToLocal(dateString)
  d.setUTCHours(d.getUTCHours() + 23, 59, 59, 999)
  return d
}

// Verifica atraso considerando fuso local
export function isOverdueLocal(dateString?: string, timeString?: string, now: Date = new Date()): boolean {
  const due = getDueDateComparable(dateString, timeString)
  if (!due) return false
  return due < now
}

// Formata vencimento em pt-BR, usando horário se existir
export function formatDueDateTimePTBR(dateString?: string, timeString?: string): string {
  if (!dateString) return 'Sem prazo'
  const date = timeString
    ? combineDateAndTimeToLocal(dateString, timeString)
    : parseDateOnlyToLocal(dateString)
  const datePart = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE }).format(date)
  if (timeString) {
    const timePart = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
    return `${datePart} às ${timePart}`
  }
  return datePart
}

// Parser genérico para strings com data e hora (ex.: 'YYYY-MM-DDTHH:mm:ss' ou ISO)
// Se a string já contém info de timezone (Z ou ±HH:MM), usamos o parser nativo.
// Caso contrário, tratamos como horário em UTC-3 e convertemos para instante UTC.
export function parseDateTimeToLocal(dateTimeString: string): Date {
  if (!dateTimeString) return new Date(NaN)
  const str = dateTimeString.trim()

  // Strings com timezone explícito: Z, +00:00, -03:00, +00, etc.
  if (str.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(str)) {
    return new Date(str)
  }

  // Sem timezone: tratar como horário BRT (UTC-3)
  const main = str.replace(' ', 'T').slice(0, 19)
  const [datePart, timePart = '00:00:00'] = main.split('T')
  const [h, m, s] = timePart.split(':')
  const [year, month, day] = datePart.slice(0, 10).split('-').map(Number)
  const hour = Number(h || 0)
  const minute = Number(m || 0)
  const second = Number(s || 0)
  const msUtc = Date.UTC(year, (month || 1) - 1, day || 1, hour, minute, second, 0) + TIMEZONE_OFFSET_MINUTES * 60 * 1000
  return new Date(msUtc)
}


