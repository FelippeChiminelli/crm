import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function RoundRobinActionInfo() {
  const { form } = useAutomationEditor()
  return (
    <>
      {(form.action as any).type === 'assign_round_robin' && (
        <div className="md:col-span-3">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="text-sm font-medium text-blue-800">Distribuir pelo rodízio de vendedores</h5>
            <p className="text-sm text-blue-700 mt-1">
              O próximo vendedor da fila de rodízio (respeitando ordem e peso configurados) passa a ser o responsável.
              O lead é movido para a pipeline desse vendedor, na etapa inicial, e a fila avança.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Ações seguintes desta automação já enxergam o lead com o novo vendedor e a nova etapa.
              Evite combinar com "Mover lead" ou "Atribuir responsável", que sobrescreveriam a distribuição.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
