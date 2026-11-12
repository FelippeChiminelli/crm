import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function MarkLostActionInfo() {
  const { form } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'mark_as_lost' && (
        <div className="md:col-span-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h5 className="text-sm font-medium text-red-800">Marcar como perdido</h5>
                <p className="text-sm text-red-700 mt-1">
                  Quando esta automação for executada, um modal será aberto solicitando o motivo da perda e observações.
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Os motivos de perda cadastrados para o pipeline serão exibidos no modal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
