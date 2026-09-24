import {
  emptyContractBody,
  isEmptyContractDoc,
} from '../../../services/contracts/contractTemplateService'
import type { CreateContractTemplateData } from '../../../services/contracts/contractTemplateService'
import type { ContractPageSettings, ContractTemplate, TipTapDoc } from '../../../types'

/** Estado do formulário de modelo de contrato, compartilhado entre editor e configurações. */

export interface ContractTemplateFormState {
  name: string
  description: string
  headerJson: TipTapDoc
  footerText: string
  bodyJson: TipTapDoc
  pageSettings: ContractPageSettings
  requiredVariables: string[]
}

export const DEFAULT_PAGE_SETTINGS: ContractPageSettings = {
  marginTop: 70,
  marginRight: 60,
  marginBottom: 70,
  marginLeft: 70,
  fontSize: 11,
  showPageNumbers: true,
}

export function emptyFormState(): ContractTemplateFormState {
  return {
    name: '',
    description: '',
    headerJson: emptyContractBody(),
    footerText: '',
    bodyJson: emptyContractBody(),
    pageSettings: { ...DEFAULT_PAGE_SETTINGS },
    requiredVariables: [],
  }
}

export function formStateFromTemplate(template: ContractTemplate): ContractTemplateFormState {
  return {
    name: template.name,
    description: template.description || '',
    headerJson: template.header_json || emptyContractBody(),
    footerText: template.footer_text || '',
    bodyJson: template.body_json || emptyContractBody(),
    pageSettings: { ...DEFAULT_PAGE_SETTINGS, ...(template.page_settings || {}) },
    requiredVariables: template.required_variables || [],
  }
}

export function formStateToPayload(state: ContractTemplateFormState): CreateContractTemplateData {
  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    header_json: isEmptyContractDoc(state.headerJson) ? null : state.headerJson,
    footer_text: state.footerText.trim() || null,
    body_json: state.bodyJson,
    page_settings: state.pageSettings,
    required_variables: state.requiredVariables,
  }
}
