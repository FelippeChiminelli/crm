import { Switch } from '../../../../ui/Switch'
import { useAutomationEditor } from '../../editor/AutomationEditorContext'
import type { RuleSentence } from '../../formatters/ruleSentence'
import { RuleSentenceView } from '../../ui/RuleSentenceView'

interface ReviewStepProps {
  sentence: RuleSentence
}

export function ReviewStep({ sentence }: ReviewStepProps) {
  const { form, setForm } = useAutomationEditor()

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <RuleSentenceView sentence={sentence} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nome da automação</label>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          placeholder="Ex.: Boas-vindas no WhatsApp"
          value={form.name}
          onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Descrição <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          placeholder="Para que serve esta automação?"
          value={form.description || ''}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Automação ativa</p>
          <p className="text-xs text-gray-500">Desligada, ela fica salva mas não dispara.</p>
        </div>
        <Switch
          checked={!!form.active}
          onChange={checked => setForm(prev => ({ ...prev, active: checked }))}
          label="Automação ativa"
        />
      </div>
    </div>
  )
}
