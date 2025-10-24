/**
 * Utilitários para manipulação de datas
 * IMPORTANTE: Sempre usar hora LOCAL, não UTC, para evitar problemas de fuso horário
 */

/**
 * Converte uma data para string no formato YYYY-MM-DD usando hora LOCAL
 * (NÃO usa UTC, evitando problemas de fuso horário)
 * 
 * @param date - Data a ser convertida
 * @returns String no formato YYYY-MM-DD (ex: "2025-10-24")
 * 
 * @example
 * // Correto ✅
 * getLocalDateString(new Date())
 * 
 * // Errado ❌ (causa problemas de timezone)
 * new Date().toISOString().split('T')[0]
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (hora LOCAL)
 */
export function getTodayLocalDateString(): string {
  return getLocalDateString(new Date())
}

/**
 * Retorna a data de N dias atrás no formato YYYY-MM-DD (hora LOCAL)
 */
export function getDaysAgoLocalDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return getLocalDateString(date)
}

/**
 * Converte string YYYY-MM-DD para Date object (meia-noite hora LOCAL)
 */
export function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

