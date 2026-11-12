import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function MarkSoldActionInfo() {
  const { form } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'mark_as_sold' && (
        <div className="md:col-span-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h5 className="text-sm font-medium text-green-800">Marcar como vendido</h5>
                <p className="text-sm text-green-700 mt-1">
                  Quando esta automação for executada, um modal será aberto solicitando o valor final da venda e observações.
                </p>
                <p className="text-xs text-green-600 mt-2">
                  O valor estimado do lead será sugerido automaticamente no modal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
