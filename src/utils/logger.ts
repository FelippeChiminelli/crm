// Utilitário de logging que só funciona em desenvolvimento
const isDevelopment = import.meta.env.MODE === 'development'

/**
 * Logger seguro que evita vazamento de informações sensíveis
 */
class SecureLogger {
  private static sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove possíveis URLs, emails e tokens
      return data
        .replace(/https?:\/\/[^\s]+/g, '[URL_REMOVED]')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REMOVED]')
        .replace(/[a-zA-Z0-9]{20,}/g, '[TOKEN_REMOVED]')
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        // Não logar chaves sensíveis
        if (['password', 'token', 'key', 'secret', 'auth'].some(sensitive => 
          key.toLowerCase().includes(sensitive)
        )) {
          sanitized[key] = '[SENSITIVE_DATA_REMOVED]'
        } else {
          sanitized[key] = this.sanitizeData(value)
        }
      }
      return sanitized
    }
    return data
  }

  static log(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`🔍 ${message}`, data ? this.sanitizeData(data) : '')
    }
  }

  static error(message: string, error?: any) {
    if (isDevelopment) {
      console.error(`❌ ${message}`, error ? this.sanitizeData(error) : '')
    }
  }

  static warn(message: string, data?: any) {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data ? this.sanitizeData(data) : '')
    }
  }

  static info(message: string, data?: any) {
    if (isDevelopment) {
      console.info(`ℹ️ ${message}`, data ? this.sanitizeData(data) : '')
    }
  }
}

export default SecureLogger

// Para logs críticos que devem sempre aparecer
export const criticalLog = {
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args)
} 