// @ts-nocheck — Este arquivo é uma Edge Function Deno (não Node.js). Erros de TS no IDE são esperados.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Preflight CORS - DEVE retornar 204 com headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    if (!token) return jsonRes({ error: 'Token obrigatório' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar dashboard pelo token
    const { data: dashboard, error: dbErr } = await supabase
      .from('custom_dashboards')
      .select('id, name, description, empresa_id, share_period, share_active')
      .eq('share_token', token)
      .eq('share_active', true)
      .single()

    if (dbErr || !dashboard) return jsonRes({ error: 'Dashboard não encontrado' }, 404)

    const period = dashboard.share_period as { start: string; end: string }
    if (!period?.start || !period?.end) return jsonRes({ error: 'Período não configurado' }, 400)

    // Buscar widgets
    const { data: widgets } = await supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('dashboard_id', dashboard.id)
      .order('position_y')
      .order('position_x')

    // Buscar lead stats (reutilizado por vários widgets)
    const leadStats = await getLeadStats(supabase, dashboard.empresa_id, period)

    // Computar dados de cada widget
    const widgetData: Record<string, WidgetResult> = {}
    for (const w of (widgets || [])) {
      try {
        widgetData[w.id] = await computeWidgetData(supabase, dashboard.empresa_id, w.metric_key, period, leadStats)
      } catch (err) {
        console.error(`Erro widget ${w.id}:`, err)
        widgetData[w.id] = { value: 0, formatted: '—', subtitle: 'Erro' }
      }
    }

    return jsonRes({
      dashboard: { id: dashboard.id, name: dashboard.name, description: dashboard.description },
      widgets: (widgets || []).map(w => ({
        id: w.id, widget_type: w.widget_type, metric_key: w.metric_key,
        title: w.title, config: w.config,
        position_x: w.position_x, position_y: w.position_y,
        width: w.width, height: w.height
      })),
      period,
      widgetData
    })
  } catch (err) {
    console.error('Erro geral:', err)
    return jsonRes({ error: 'Erro interno' }, 500)
  }
})

// ============================================================
// HELPERS
// ============================================================

interface WidgetResult { value: number; formatted: string; subtitle: string }

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtNumber = (v: number) => v.toLocaleString('pt-BR')

const fmtPercent = (v: number) => `${(v * 100).toFixed(1)}%`

// ============================================================
// LEAD STATS
// ============================================================

interface LeadStats {
  total: number; active: number; sold: number; lost: number
  totalValue: number; soldValue: number; avgValue: number; conversionRate: number
}

async function getLeadStats(sb: any, empresaId: string, period: { start: string; end: string }): Promise<LeadStats> {
  const { data: leads } = await sb
    .from('leads')
    .select('id, value, status, sold_value')
    .eq('empresa_id', empresaId)
    .gte('created_at', period.start + 'T00:00:00')
    .lte('created_at', period.end + 'T23:59:59')

  const all = leads || []
  const total = all.length
  const soldSt = ['sold', 'vendido']
  const lostSt = ['lost', 'perdido']
  const sold = all.filter((l: any) => soldSt.includes(l.status)).length
  const lost = all.filter((l: any) => lostSt.includes(l.status)).length
  const active = total - sold - lost
  const totalValue = all.reduce((s: number, l: any) => s + (Number(l.value) || 0), 0)
  const soldValue = all
    .filter((l: any) => soldSt.includes(l.status))
    .reduce((s: number, l: any) => s + (Number(l.sold_value) || Number(l.value) || 0), 0)

  return {
    total, active, sold, lost, totalValue, soldValue,
    avgValue: total > 0 ? totalValue / total : 0,
    conversionRate: total > 0 ? sold / total : 0
  }
}

// ============================================================
// WIDGET DATA ROUTER
// ============================================================

async function computeWidgetData(
  sb: any, empresaId: string, metricKey: string,
  period: { start: string; end: string }, leadStats: LeadStats
): Promise<WidgetResult> {
  if (metricKey.startsWith('variable_'))
    return computeVariable(sb, metricKey.replace('variable_', ''), period)

  if (metricKey.startsWith('calculation_'))
    return computeCalculation(sb, empresaId, metricKey.replace('calculation_', ''), period, leadStats)

  if (metricKey.startsWith('custom_field_'))
    return computeCustomField(sb, empresaId, metricKey.replace('custom_field_', ''), period)

  return computeStandard(metricKey, leadStats)
}

// ============================================================
// MÉTRICAS PADRÃO
// ============================================================

function computeStandard(key: string, s: LeadStats): WidgetResult {
  switch (key) {
    case 'leads_total': return { value: s.total, formatted: fmtNumber(s.total), subtitle: 'Total de leads' }
    case 'leads_active': return { value: s.active, formatted: fmtNumber(s.active), subtitle: 'Leads ativos' }
    case 'leads_total_value': return { value: s.totalValue, formatted: fmtCurrency(s.totalValue), subtitle: 'Valor total' }
    case 'leads_average_value': return { value: s.avgValue, formatted: fmtCurrency(s.avgValue), subtitle: 'Ticket médio' }
    case 'leads_conversion_rate': return { value: s.conversionRate, formatted: fmtPercent(s.conversionRate), subtitle: 'Taxa de conversão' }
    case 'sales_total': return { value: s.sold, formatted: fmtNumber(s.sold), subtitle: 'Total de vendas' }
    case 'sales_total_value': return { value: s.soldValue, formatted: fmtCurrency(s.soldValue), subtitle: 'Valor vendido' }
    case 'losses_total': return { value: s.lost, formatted: fmtNumber(s.lost), subtitle: 'Leads perdidos' }
    default: return { value: 0, formatted: '—', subtitle: key }
  }
}

// ============================================================
// VARIÁVEIS
// ============================================================

async function computeVariable(sb: any, varId: string, period: { start: string; end: string }): Promise<WidgetResult> {
  const { data: v } = await sb.from('dashboard_variables').select('*').eq('id', varId).single()
  if (!v) return { value: 0, formatted: '0', subtitle: 'Variável não encontrada' }

  let value = Number(v.value) || 0

  if (v.value_type === 'periodic') {
    const { data: periods } = await sb.from('dashboard_variable_periods').select('*').eq('variable_id', varId)
    value = 0
    for (const p of (periods || [])) {
      if (p.start_date <= period.end && p.end_date >= period.start) value += Number(p.value)
    }
  }

  const fmt = v.format || 'number'
  const formatted = fmt === 'currency' ? fmtCurrency(value) : fmt === 'percentage' ? fmtPercent(value) : fmtNumber(value)
  return { value, formatted, subtitle: v.description || v.name }
}

// ============================================================
// CÁLCULOS
// ============================================================

async function computeCalculation(
  sb: any, empresaId: string, calcId: string,
  period: { start: string; end: string }, leadStats: LeadStats
): Promise<WidgetResult> {
  const { data: calc } = await sb.from('dashboard_calculations').select('*').eq('id', calcId).single()
  if (!calc) return { value: 0, formatted: '—', subtitle: 'Cálculo não encontrado' }

  const value = await resolveFormula(sb, empresaId, calc.formula, period, leadStats)
  const fmt = calc.result_format || 'number'
  const formatted = fmt === 'currency' ? fmtCurrency(value) : fmt === 'percentage' ? fmtPercent(value) : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  return { value, formatted, subtitle: calc.description || calc.name }
}

async function resolveFormula(sb: any, empresaId: string, node: any, period: { start: string; end: string }, stats: LeadStats): Promise<number> {
  if (!node) return 0
  switch (node.type) {
    case 'constant': return node.value ?? 0
    case 'variable': return node.variableId ? (await computeVariable(sb, node.variableId, period)).value : 0
    case 'metric': return node.metricKey ? computeStandard(node.metricKey, stats).value : 0
    case 'custom_field': return node.customFieldId ? (await computeCustomField(sb, empresaId, node.customFieldId, period)).value : 0
    case 'operation': {
      if (!node.left || !node.right || !node.operator) return 0
      const [l, r] = await Promise.all([
        resolveFormula(sb, empresaId, node.left, period, stats),
        resolveFormula(sb, empresaId, node.right, period, stats)
      ])
      switch (node.operator) {
        case '+': return l + r; case '-': return l - r
        case '*': return l * r; case '/': return r !== 0 ? l / r : 0
        default: return 0
      }
    }
    default: return 0
  }
}

// ============================================================
// CAMPOS PERSONALIZADOS
// ============================================================

async function computeCustomField(
  sb: any, empresaId: string, fieldId: string, period: { start: string; end: string }
): Promise<WidgetResult> {
  const { data: leads } = await sb
    .from('leads')
    .select('id, custom_field_values')
    .eq('empresa_id', empresaId)
    .gte('created_at', period.start + 'T00:00:00')
    .lte('created_at', period.end + 'T23:59:59')

  let count = 0
  for (const lead of (leads || [])) {
    const vals = lead.custom_field_values || []
    if (vals.find((v: any) => v.field_id === fieldId && v.value != null && v.value !== '')) count++
  }

  return { value: count, formatted: fmtNumber(count), subtitle: `${count} registros` }
}
