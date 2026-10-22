import { ds } from '../../../utils/designSystem'
import {
  SEM_RESPONSAVEL,
  type LeadsSemContatoFilters as Filters
} from '../../../services/leadsSemContatoService'

const DIAS_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 30]
const MAX_OPTIONS = [5, 7, 10, 15, 30, 60, 90]

/** Garante que um valor vindo da URL (ex.: link do relatório) apareça no select. */
function withValue(options: number[], value: number | null): number[] {
  if (value === null || options.includes(value)) return options
  return [...options, value].sort((a, b) => a - b)
}

interface LeadsSemContatoFiltersProps {
  filters: Filters
  onChange: (changes: Partial<Filters>) => void
  vendedores: { id: string; nome: string }[] | null
}

export function LeadsSemContatoFilters({ filters, onChange, vendedores }: LeadsSemContatoFiltersProps) {
  const maxInvalido = filters.maxDiasParado !== null && filters.maxDiasParado <= filters.diasParado

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Sem contato há pelo menos</span>
        <select
          value={filters.diasParado}
          onChange={e => onChange({ diasParado: Number(e.target.value) })}
          className={`${ds.input()} mt-1`}
        >
          {withValue(DIAS_OPTIONS, filters.diasParado).map(d => (
            <option key={d} value={d}>{d} {d === 1 ? 'dia' : 'dias'}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-600">Até no máximo</span>
        <select
          value={filters.maxDiasParado ?? ''}
          onChange={e => onChange({ maxDiasParado: e.target.value ? Number(e.target.value) : null })}
          className={`${ds.input(maxInvalido)} mt-1`}
        >
          <option value="">Sem limite</option>
          {withValue(MAX_OPTIONS, filters.maxDiasParado).map(d => (
            <option key={d} value={d}>{d} dias</option>
          ))}
        </select>
      </label>

      {vendedores && (
        <label className="block sm:min-w-[220px]">
          <span className="text-xs font-medium text-gray-600">Vendedor</span>
          <select
            value={filters.vendedor ?? ''}
            onChange={e => onChange({ vendedor: e.target.value || null })}
            className={`${ds.input()} mt-1`}
          >
            <option value="">Todos</option>
            <option value={SEM_RESPONSAVEL}>Sem responsável</option>
            {vendedores.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </label>
      )}

      {maxInvalido && (
        <p className="text-xs text-red-600 sm:pb-2">
          O máximo precisa ser maior que o mínimo.
        </p>
      )}
    </div>
  )
}
