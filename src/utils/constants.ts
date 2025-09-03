// Constantes de autenticação
export const AUTH_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 6,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas em ms
  REFRESH_TOKEN_INTERVAL: 5 * 60 * 1000, // 5 minutos em ms
} as const

// Constantes de validação
export const VALIDATION_CONSTANTS = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 11,
  MIN_AGE: 18,
  MAX_AGE: 120,
} as const

// Constantes de navegação
export const ROUTES = {
  HOME: '/',
  LOGIN: '/',
  REGISTER: '/',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  PROFILES: '/profiles',
  TEST: '/test',
} as const

// Constantes de gênero
export const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
] as const

// Constantes de status
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

// Constantes de permissões
export const PERMISSIONS = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer',
} as const

// Constantes de API
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  PROFILES: {
    BASE: '/profiles',
    ME: '/profiles/me',
  },
} as const

// Constantes de mensagens
export const MESSAGES = {
  SUCCESS: {
    LOGIN: 'Login realizado com sucesso!',
    REGISTER: 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.',
    LOGOUT: 'Logout realizado com sucesso!',
    PROFILE_UPDATED: 'Perfil atualizado com sucesso!',
  },
  ERROR: {
    INVALID_CREDENTIALS: 'E-mail ou senha inválidos',
    EMAIL_ALREADY_EXISTS: 'Este e-mail já está cadastrado',
    NETWORK_ERROR: 'Erro de conexão. Tente novamente.',
    VALIDATION_ERROR: 'Por favor, corrija os erros no formulário.',
    UNKNOWN_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
  },
  VALIDATION: {
    REQUIRED: 'Este campo é obrigatório',
    EMAIL: 'E-mail inválido',
    PASSWORD_MIN: 'A senha deve ter pelo menos 6 caracteres',
    PASSWORD_MATCH: 'As senhas não coincidem',
    PHONE: 'Telefone inválido',
    BIRTH_DATE: 'Data de nascimento inválida',
    GENDER: 'Selecione um gênero',
  },
} as const

// Constantes de tema
export const THEME = {
  COLORS: {
    PRIMARY: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    GRAY: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  SPACING: {
    XS: '0.25rem',
    SM: '0.5rem',
    MD: '1rem',
    LG: '1.5rem',
    XL: '2rem',
    XXL: '3rem',
  },
  BORDER_RADIUS: {
    SM: '0.25rem',
    MD: '0.5rem',
    LG: '0.75rem',
    XL: '1rem',
  },
} as const 