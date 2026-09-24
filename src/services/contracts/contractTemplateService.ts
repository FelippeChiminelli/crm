import { supabase } from '../supabaseClient'
import { getUserEmpresaId } from '../authService'
import type { ContractPageSettings, ContractTemplate, TipTapDoc } from '../../types'

/** CRUD dos modelos de contrato. Escrita restrita a admin pela RLS. */

const TABLE = 'contract_templates'

export interface CreateContractTemplateData {
  name: string
  description?: string | null
  body_json: TipTapDoc
  header_json?: TipTapDoc | null
  footer_text?: string | null
  page_settings?: ContractPageSettings
  required_variables?: string[]
  is_active?: boolean
}

export type UpdateContractTemplateData = Partial<CreateContractTemplateData>

export async function getContractTemplates(options?: { onlyActive?: boolean }) {
  const empresaId = await getUserEmpresaId()

  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('empresa_id', empresaId)
    .order('name', { ascending: true })

  if (options?.onlyActive) {
    query = query.eq('is_active', true)
  }

  return query
}

export async function getContractTemplateById(id: string) {
  const empresaId = await getUserEmpresaId()

  return supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single()
}

export async function createContractTemplate(data: CreateContractTemplateData) {
  const empresaId = await getUserEmpresaId()
  const { data: { user } } = await supabase.auth.getUser()

  return supabase
    .from(TABLE)
    .insert([{ ...data, empresa_id: empresaId, created_by: user?.id ?? null }])
    .select()
    .single()
}

export async function updateContractTemplate(id: string, data: UpdateContractTemplateData) {
  const empresaId = await getUserEmpresaId()

  return supabase
    .from(TABLE)
    .update(data)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()
}

/** Desativa o modelo. Não excluímos para preservar o vínculo dos contratos já emitidos. */
/** Tira o modelo das automações e do botão do lead. Reversível. */
export async function deactivateContractTemplate(id: string) {
  return updateContractTemplate(id, { is_active: false })
}

export async function activateContractTemplate(id: string) {
  return updateContractTemplate(id, { is_active: true })
}

export async function deleteContractTemplate(id: string) {
  const empresaId = await getUserEmpresaId()

  return supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)
}

/** Documento vazio aceito pelo editor e pelo conversor de PDF. */
export function emptyContractBody(): TipTapDoc {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/**
 * Um editor sem nada digitado ainda devolve um parágrafo vazio, então checar
 * `content.length` não basta: só é vazio quando não há texto algum.
 */
export function isEmptyContractDoc(doc: TipTapDoc | null | undefined): boolean {
  if (!doc) return true

  const hasText = (nodes: TipTapDoc['content']): boolean =>
    (nodes || []).some((node) => Boolean(node.text?.trim()) || hasText(node.content))

  return !hasText(doc.content)
}

export type { ContractTemplate }
