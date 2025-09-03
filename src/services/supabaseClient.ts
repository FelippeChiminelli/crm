import { createClient } from '@supabase/supabase-js'

// Validar variáveis de ambiente obrigatórias
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL não está definida nas variáveis de ambiente')
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY não está definida nas variáveis de ambiente')
}

// Validar formato das URLs
try {
  new URL(supabaseUrl)
} catch {
  throw new Error('VITE_SUPABASE_URL não é uma URL válida')
}

// Supabase configurado com sucesso

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web/2.50.0'
    }
  }
}) 