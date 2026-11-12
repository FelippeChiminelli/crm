import { useEffect, useState } from 'react'
import type { Pipeline, Stage, TaskType, LeadCustomField, LossReason, WhatsAppInstance, BookingCalendar, BookingType, MetaCapiConfig, ContractTemplate } from '../../../types'
import { getAllProfiles } from '../../../services/profileService'
import { getPipelines } from '../../../services/pipelineService'
import { getStagesByPipeline } from '../../../services/stageService'
import { getTaskTypes } from '../../../services/taskService'
import { getCustomFieldsByPipeline, getDateCustomFieldsByEmpresa } from '../../../services/leadCustomFieldService'
import { getLossReasons } from '../../../services/lossReasonService'
import { getWhatsAppInstances } from '../../../services/chatService'
import { getAllLeadOrigins, getAllLeadTags } from '../../../services/leadService'
import { getBookingCalendars, getAllBookingTypes } from '../../../services/bookingService'
import { listMetaCapiConfigs } from '../../../services/metaCapiService'
import { getContractTemplates } from '../../../services/contracts/contractTemplateService'

export interface AutomationLookups {
  pipelines: Pipeline[]
  /** Todas as etapas de todos os pipelines, indexadas por id. */
  stageIndex: Record<string, Stage>
  profiles: { uuid: string; full_name: string; email: string }[]
  taskTypes: TaskType[]
  customFields: LeadCustomField[]
  dateCustomFields: LeadCustomField[]
  lossReasons: LossReason[]
  whatsappInstances: WhatsAppInstance[]
  metaCapiConfigs: MetaCapiConfig[]
  contractTemplates: ContractTemplate[]
  availableOrigins: string[]
  availableTags: string[]
  bookingCalendars: BookingCalendar[]
  bookingTypes: BookingType[]
}

const EMPTY_LOOKUPS: AutomationLookups = {
  pipelines: [],
  stageIndex: {},
  profiles: [],
  taskTypes: [],
  customFields: [],
  dateCustomFields: [],
  lossReasons: [],
  whatsappInstances: [],
  metaCapiConfigs: [],
  contractTemplates: [],
  availableOrigins: [],
  availableTags: [],
  bookingCalendars: [],
  bookingTypes: [],
}

async function safe<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return (await loader()) ?? fallback
  } catch (err) {
    console.error(`Erro ao carregar ${label}:`, err)
    return fallback
  }
}

async function loadPipelinesWithStages(): Promise<Pick<AutomationLookups, 'pipelines' | 'stageIndex'>> {
  const { data } = await getPipelines()
  const pipelines = data || []
  const results = await Promise.all(pipelines.map(p => getStagesByPipeline(p.id)))
  const stageIndex: Record<string, Stage> = {}
  for (const r of results) {
    for (const s of ((r.data || []) as unknown as Stage[])) stageIndex[s.id] = s
  }
  return { pipelines, stageIndex }
}

async function loadAllLookups(): Promise<AutomationLookups> {
  const [
    pipelineData, profiles, taskTypes, customFields, dateCustomFields, lossReasons,
    whatsappInstances, metaCapiConfigs, contractTemplates, availableOrigins, availableTags,
    bookingCalendars, bookingTypes,
  ] = await Promise.all([
    safe('pipelines', loadPipelinesWithStages, { pipelines: [], stageIndex: {} }),
    safe('perfis', async () => (await getAllProfiles()).data, []),
    safe('tipos de tarefa', getTaskTypes, []),
    // Campos personalizados globais (pipeline_id = null)
    safe('campos personalizados', async () => (await getCustomFieldsByPipeline('null')).data || [], [] as LeadCustomField[]),
    safe('campos personalizados de data', async () => (await getDateCustomFieldsByEmpresa()).data as LeadCustomField[], []),
    safe('motivos de perda', async () => (await getLossReasons()).data as LossReason[], []),
    safe('instâncias WhatsApp', getWhatsAppInstances, []),
    safe('pixels Meta CAPI', listMetaCapiConfigs, []),
    safe('modelos de contrato', async () => (await getContractTemplates({ onlyActive: true })).data as ContractTemplate[], []),
    safe('origens', getAllLeadOrigins, []),
    safe('tags', getAllLeadTags, []),
    safe('calendários', async () => (await getBookingCalendars({ is_active: true })).data, []),
    safe('tipos de agendamento', getAllBookingTypes, []),
  ])
  return {
    ...pipelineData,
    profiles: profiles as AutomationLookups['profiles'],
    taskTypes, customFields, dateCustomFields, lossReasons, whatsappInstances, metaCapiConfigs,
    contractTemplates, availableOrigins, availableTags,
    bookingCalendars: bookingCalendars as BookingCalendar[],
    bookingTypes,
  }
}

/** Etapas dos pipelines informados, na ordem de exibição. */
export function getStagesOfPipelines(stageIndex: Record<string, Stage>, pipelineIds: string | string[] | undefined): Stage[] {
  const ids = (Array.isArray(pipelineIds) ? pipelineIds : [pipelineIds]).filter(Boolean) as string[]
  if (!ids.length) return []
  return Object.values(stageIndex)
    .filter(s => ids.includes(s.pipeline_id))
    .sort((a, b) => ids.indexOf(a.pipeline_id) - ids.indexOf(b.pipeline_id) || a.position - b.position)
}

export function useAutomationLookups(): AutomationLookups {
  const [lookups, setLookups] = useState<AutomationLookups>(EMPTY_LOOKUPS)

  useEffect(() => {
    let cancelled = false
    loadAllLookups().then(next => { if (!cancelled) setLookups(next) })
    return () => { cancelled = true }
  }, [])

  return lookups
}
