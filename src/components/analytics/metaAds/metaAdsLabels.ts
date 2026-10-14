// Valores de meta_ads.source_app; 'desconhecido' é o fallback das RPCs para nulos
export const META_ADS_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'desconhecido', label: 'Não informado' }
]

export function getPlatformLabel(platform: string | null): string {
  return META_ADS_PLATFORMS.find((item) => item.value === platform)?.label ?? platform ?? 'Não informado'
}

export const META_ADS_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B']

export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}
