import { LEAD_STATUS_OPTIONS } from '../constants'
import { useAutomationEditor } from '../editor/AutomationEditorContext'

export function LeadAttributeConditions() {
  const { form, setForm, availableOrigins, availableTags } = useAutomationEditor()
  return (
    <>
      {/* Status, Origem e Tags (aplicáveis a eventos de lead) */}
      <div className="md:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Status</label>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUS_OPTIONS.map(opt => {
                const selectedStatuses: string[] = ((form.condition as any).statuses as string[]) || []
                const isSelected = selectedStatuses.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const next = isSelected
                        ? selectedStatuses.filter(s => s !== opt.value)
                        : [...selectedStatuses, opt.value]
                      setForm(prev => ({
                        ...prev,
                        condition: {
                          ...prev.condition,
                          statuses: next.length > 0 ? next : undefined
                        }
                      }))
                    }}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${isSelected
                        ? 'bg-purple-100 text-purple-700 ring-2 ring-offset-1 ring-purple-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Origem */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Origem</label>
            <div className="flex flex-wrap gap-2">
              {availableOrigins.length > 0 ? availableOrigins.map(origin => {
                const selectedOrigins: string[] = ((form.condition as any).origins as string[]) || []
                const isSelected = selectedOrigins.includes(origin)
                return (
                  <button
                    key={origin}
                    type="button"
                    onClick={() => {
                      const next = isSelected
                        ? selectedOrigins.filter(o => o !== origin)
                        : [...selectedOrigins, origin]
                      setForm(prev => ({
                        ...prev,
                        condition: {
                          ...prev.condition,
                          origins: next.length > 0 ? next : undefined
                        }
                      }))
                    }}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${isSelected
                        ? 'bg-teal-100 text-teal-700 ring-2 ring-offset-1 ring-teal-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {origin}
                  </button>
                )
              }) : (
                <p className="text-xs text-gray-400">Nenhuma origem encontrada nos leads.</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.length > 0 ? availableTags.map(tag => {
                const selectedTags: string[] = ((form.condition as any).tags as string[]) || []
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const next = isSelected
                        ? selectedTags.filter(t => t !== tag)
                        : [...selectedTags, tag]
                      setForm(prev => ({
                        ...prev,
                        condition: {
                          ...prev.condition,
                          tags: next.length > 0 ? next : undefined
                        }
                      }))
                    }}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${isSelected
                        ? 'bg-amber-100 text-amber-700 ring-2 ring-offset-1 ring-amber-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {tag}
                  </button>
                )
              }) : (
                <p className="text-xs text-gray-400">Nenhuma tag encontrada nos leads.</p>
              )}
            </div>
          </div>
        </div>

        {/* Resumo das condições selecionadas */}
        {(((form.condition as any).statuses as string[])?.length > 0 ||
          ((form.condition as any).origins as string[])?.length > 0 ||
          ((form.condition as any).tags as string[])?.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {((form.condition as any).statuses as string[])?.length > 0 && (
              <span className="text-xs text-purple-600">
                Status: {((form.condition as any).statuses as string[]).length} selecionado(s)
              </span>
            )}
            {((form.condition as any).origins as string[])?.length > 0 && (
              <span className="text-xs text-teal-600">
                {((form.condition as any).statuses as string[])?.length > 0 ? ' • ' : ''}Origem: {((form.condition as any).origins as string[]).length} selecionada(s)
              </span>
            )}
            {((form.condition as any).tags as string[])?.length > 0 && (
              <span className="text-xs text-amber-600">
                {(((form.condition as any).statuses as string[])?.length > 0 || ((form.condition as any).origins as string[])?.length > 0) ? ' • ' : ''}Tags: {((form.condition as any).tags as string[]).length} selecionada(s)
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
}
