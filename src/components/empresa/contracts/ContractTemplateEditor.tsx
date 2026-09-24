import { useMemo, useState } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { ds } from '../../../utils/designSystem'
import { useToastContext } from '../../../contexts/ToastContext'
import {
  createContractTemplate,
  updateContractTemplate,
} from '../../../services/contracts/contractTemplateService'
import { buildContractVariableCatalog } from '../../../services/contracts/contractVariableCatalog'
import { buildContractPreview, openPdfInNewTab } from '../../../services/contracts/contractPreview'
import { ContractDocumentCanvas } from './ContractDocumentCanvas'
import { ContractVariablePicker } from './ContractVariablePicker'
import { ContractTemplateSettings } from './ContractTemplateSettings'
import {
  emptyFormState,
  formStateFromTemplate,
  formStateToPayload,
} from './contractTemplateFormState'
import type { ContractTemplateFormState } from './contractTemplateFormState'
import type { ContractTemplate, LeadCustomField, TipTapDoc } from '../../../types'

interface ContractTemplateEditorProps {
  template: ContractTemplate | null
  customFields: LeadCustomField[]
  onSaved: () => void
  onCancel: () => void
}

// O código e o bloco de código ficam desativados: não têm uso em contrato e
// exigiriam registrar uma fonte monoespaçada no PDF.
function buildExtensions() {
  return [
    StarterKit.configure({ code: false, codeBlock: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ]
}

const BODY_EDITOR_PROPS = {
  attributes: {
    class: 'contract-editor focus:outline-none min-h-[420px] p-4 text-sm text-gray-800',
  },
}

const HEADER_EDITOR_PROPS = {
  attributes: {
    class: 'contract-editor focus:outline-none px-4 pb-3 pt-1 text-sm text-gray-800',
  },
}

export function ContractTemplateEditor({
  template,
  customFields,
  onSaved,
  onCancel,
}: ContractTemplateEditorProps) {
  const [state, setState] = useState<ContractTemplateFormState>(() =>
    template ? formStateFromTemplate(template) : emptyFormState()
  )
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const { showSuccess, showError } = useToastContext()

  // A barra de ferramentas é única e age sobre a parte em foco.
  const [focused, setFocused] = useState<'body' | 'header'>('body')

  // Cada editor recebe as próprias instâncias, memoizadas: o useEditor compara
  // extensions e editorProps por identidade e chamaria setOptions em todo
  // render (ou seja, a cada tecla) se recriássemos esses objetos.
  const bodyExtensions = useMemo(buildExtensions, [])
  const headerExtensions = useMemo(buildExtensions, [])

  const editor = useEditor({
    extensions: bodyExtensions,
    content: state.bodyJson as any,
    onFocus: () => setFocused('body'),
    editorProps: BODY_EDITOR_PROPS,
  })

  const headerEditor = useEditor({
    extensions: headerExtensions,
    content: state.headerJson as any,
    onFocus: () => setFocused('header'),
    editorProps: HEADER_EDITOR_PROPS,
  })

  const toolbarEditor = focused === 'header' ? headerEditor : editor

  const patch = (values: Partial<ContractTemplateFormState>) => {
    setState((current) => ({ ...current, ...values }))
  }

  // Cabeçalho e corpo só são lidos dos editores ao salvar ou pré-visualizar:
  // sincronizar a cada tecla copiaria o documento inteiro para o estado sem
  // necessidade.
  const currentState = (): ContractTemplateFormState => ({
    ...state,
    bodyJson: (editor?.getJSON() as TipTapDoc) ?? state.bodyJson,
    headerJson: (headerEditor?.getJSON() as TipTapDoc) ?? state.headerJson,
  })

  const handleInsertVariable = (token: string) => {
    toolbarEditor?.chain().focus().insertContent({ type: 'text', text: token }).run()
  }

  const handleToggleRequired = (key: string) => {
    patch({
      requiredVariables: state.requiredVariables.includes(key)
        ? state.requiredVariables.filter((item) => item !== key)
        : [...state.requiredVariables, key],
    })
  }

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const payload = formStateToPayload(currentState())
      const blob = await buildContractPreview(
        {
          body_json: payload.body_json,
          header_json: payload.header_json ?? null,
          footer_text: payload.footer_text ?? null,
          page_settings: payload.page_settings ?? {},
        },
        customFields
      )
      const fileName = `previa-${state.name.trim() || 'contrato'}.pdf`
      if (openPdfInNewTab(blob, fileName) === 'download') {
        showSuccess(
          'Prévia baixada',
          'O navegador bloqueou a nova aba, então o PDF foi salvo nos downloads.'
        )
      }
    } catch (error: any) {
      showError('Erro ao gerar pré-visualização', error.message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleSave = async () => {
    if (!state.name.trim()) {
      showError('Informe o nome do modelo')
      return
    }

    setSaving(true)
    try {
      const payload = formStateToPayload(currentState())
      const { error } = template
        ? await updateContractTemplate(template.id, payload)
        : await createContractTemplate(payload)

      if (error) throw error

      showSuccess(template ? 'Modelo atualizado!' : 'Modelo criado!')
      onSaved()
    } catch (error: any) {
      showError('Erro ao salvar modelo', error.message)
    } finally {
      setSaving(false)
    }
  }

  const variables = buildContractVariableCatalog(customFields)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {template ? 'Editar modelo' : 'Novo modelo de contrato'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Monte o texto e insira as variáveis que serão preenchidas na emissão.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={ds.button('secondary')}>
            Voltar
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing}
            className={ds.button('outline')}
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            {previewing ? 'Gerando...' : 'Pré-visualizar'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={ds.button('primary')}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* A partir de lg a altura é fixa para que o documento e a lateral de
          configuração tenham barras de rolagem próprias. No mobile as colunas
          empilham e quem rola é a página. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[calc(100vh-350px)] lg:min-h-[420px]">
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <ContractDocumentCanvas
            headerEditor={headerEditor}
            bodyEditor={editor}
            toolbarEditor={toolbarEditor}
            footerText={state.footerText}
            onFooterChange={(footerText) => patch({ footerText })}
            showPageNumbers={state.pageSettings.showPageNumbers ?? true}
          />
        </div>

        <div className="space-y-4 min-h-0 lg:overflow-y-auto lg:pr-1">
          <div className={`${ds.card()} p-4`}>
            <ContractTemplateSettings state={state} onChange={patch} />
          </div>
          <div className={`${ds.card()} p-4`}>
            <ContractVariablePicker
              variables={variables}
              requiredVariables={state.requiredVariables}
              onInsert={handleInsertVariable}
              onToggleRequired={handleToggleRequired}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
