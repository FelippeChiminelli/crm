import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { ContractEditorToolbar } from './ContractEditorToolbar'

/**
 * Área de edição do documento, montada na ordem em que as partes saem no PDF:
 * cabeçalho, corpo e rodapé. A barra de ferramentas é única e age sobre a
 * última parte que recebeu o foco, então cabeçalho e corpo compartilham os
 * mesmos controles. O rodapé é texto simples, por isso é um input.
 */
interface ContractDocumentCanvasProps {
  headerEditor: Editor | null
  bodyEditor: Editor | null
  toolbarEditor: Editor | null
  footerText: string
  onFooterChange: (value: string) => void
  showPageNumbers: boolean
}

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wide text-gray-400'

export function ContractDocumentCanvas({
  headerEditor,
  bodyEditor,
  toolbarEditor,
  footerText,
  onFooterChange,
  showPageNumbers,
}: ContractDocumentCanvasProps) {
  return (
    <div className="flex flex-col min-h-0 border border-gray-200 rounded-lg bg-white overflow-hidden">
      {toolbarEditor && <ContractEditorToolbar editor={toolbarEditor} />}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <section className="border-b border-dashed border-gray-300 bg-gray-50/60">
          <p className={`${sectionLabel} px-4 pt-3`}>Cabeçalho</p>
          <EditorContent editor={headerEditor} />
        </section>

        <section>
          <EditorContent editor={bodyEditor} />
        </section>

        <section className="border-t border-dashed border-gray-300 bg-gray-50/60 px-4 py-3">
          <label className={`${sectionLabel} block mb-2`} htmlFor="contract-footer">
            Rodapé
          </label>
          <input
            id="contract-footer"
            type="text"
            value={footerText}
            onChange={(e) => onFooterChange(e.target.value)}
            className="w-full bg-transparent border-0 border-b border-gray-300 px-0 py-1 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-0"
            placeholder="Texto do rodapé (opcional)"
          />
          {showPageNumbers && (
            <p className="text-xs text-gray-500 mt-2">
              A numeração "Página X de Y" entra automaticamente à direita do rodapé.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
