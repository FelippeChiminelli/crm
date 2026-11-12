interface RunLimitConditionProps {
  value?: number
  onChange: (limit: number | undefined) => void
}

/** Limite de leads processados por rodada do servidor (max_per_run). Vazio = sem limite. */
export function RunLimitCondition({ value, onChange }: RunLimitConditionProps) {
  return (
    <div className="md:col-span-2">
      <label className="block text-sm text-gray-700 mb-1">Limite de disparos por rodada</label>
      <input
        type="number"
        min={1}
        step={1}
        placeholder="Sem limite"
        className="border rounded px-3 py-2 w-full"
        value={value ?? ''}
        onChange={e => {
          const parsed = Math.floor(Number(e.target.value))
          onChange(parsed > 0 ? parsed : undefined)
        }}
      />
      <p className="text-xs text-gray-500 mt-1">
        Máximo de leads disparados a cada 10 minutos. Os excedentes ficam na fila e disparam nas rodadas seguintes.
      </p>
    </div>
  )
}
