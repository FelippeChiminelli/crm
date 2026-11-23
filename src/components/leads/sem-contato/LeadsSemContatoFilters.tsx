import { useMemo } from 'react'
import { ds } from '../../../utils/designSystem'
import { MultiSelectDropdown } from '../../ui/MultiSelectDropdown'
import type { FilterOption, PipelineOption } from '../../../hooks/useLeadsSemContatoOptions'
import {
  SEM_RESPONSAVEL,
  SITUACOES_CONTATO,
  type LeadsSemContatoFilters as Filters,
  type SituacaoContato
} from '../../../services/leadsSemContatoService'

const DIAS_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 30]
const MAX_OPTIONS = [5, 7, 10, 15, 30, 60, 90]
const SITUACAO_OPTIONS: FilterOption[] = SITUACOES_CONTATO.map(s => ({ value: s.value, label: s.label }))
const FIELD_WIDTH = 'w-full sm:w-44'

/** Garante que um valor vindo da URL (ex.: link do relatório) apareça no select. */
function withValue(options: number[], value: number | null): number[] {
  if (value === null || options.includes(value)) return options
  return [...options, value].sort((a, b) => a - b)
}

/**
 * Etapas dos funis selecionados ou de todos, se nenhum foi escolhido.
 * Com mais de um funil na lista, o nome do funil entra no rótulo.
 */
function etapasDosFunis(pipelines: PipelineOption[], selecionados: string[]): FilterOption[] {
  const escolhidos = selecionados.length > 0
    ? pipelines.filter(p => selecionados.includes(p.value))
    : pipelines
  return escolhidos.flatMap(p => p.etapas.map(e => ({
    value: e.value,
    label: escolhidos.length > 1 ? `${e.label} (${p.label})` : e.label
  })))
}

interface LeadsSemContatoFiltersProps {
  filters: Filters
  onChange: (changes: Partial<Filters>) => void
  onClear: () => void
  hasActiveFilters: boolean
  /** null quando o usuário só vê os próprios leads */
  vendedores: FilterOption[] | null
  pipelines: PipelineOption[]
  origens: FilterOption[]
}

export function LeadsSemContatoFilters({
  filters,
  onChange,
  onClear,
  hasActiveFilters,
  vendedores,
  pipelines,
  origens
}: LeadsSemContatoFiltersProps) {
  const maxInvalido = filters.maxDiasParado !== null && filters.maxDiasParado <= filters.diasParado
  const etapas = useMemo(() => etapasDosFunis(pipelines, filters.pipelines), [pipelines, filters.pipelines])
  const vendedorOptions = useMemo(
    () => vendedores && [{ value: SEM_RESPONSAVEL, label: 'Sem responsável' }, ...vendedores],
    [vendedores]
  )

  const handlePipelinesChange = (selecionados: string[]) => {
    const validas = new Set(etapasDosFunis(pipelines, selecionados).map(e => e.value))
    onChange({ pipelines: selecionados, etapas: filters.etapas.filter(id => validas.has(id)) })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
        <label className={`block ${FIELD_WIDTH}`}>
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

        <label className={`block ${FIELD_WIDTH}`}>
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

        {vendedorOptions && (
          <MultiSelectDropdown
            label="Vendedor"
            options={vendedorOptions}
            selected={filters.vendedores}
            onChange={vendedores => onChange({ vendedores })}
            className={FIELD_WIDTH}
          />
        )}

        <MultiSelectDropdown
          label="Funil"
          options={pipelines}
          selected={filters.pipelines}
          onChange={handlePipelinesChange}
          className={FIELD_WIDTH}
        />

        <MultiSelectDropdown
          label="Etapa"
          options={etapas}
          selected={filters.etapas}
          onChange={etapas => onChange({ etapas })}
          placeholder="Todas"
          className={FIELD_WIDTH}
        />

        <MultiSelectDropdown
          label="Origem"
          options={origens}
          selected={filters.origens}
          onChange={origens => onChange({ origens })}
          placeholder="Todas"
          className={FIELD_WIDTH}
        />

        <MultiSelectDropdown
          label="Situação"
          options={SITUACAO_OPTIONS}
          selected={filters.situacoes}
          onChange={situacoes => onChange({ situacoes: situacoes as SituacaoContato[] })}
          className={FIELD_WIDTH}
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="self-start sm:self-auto px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {maxInvalido && (
        <p className="text-xs text-red-600">O máximo precisa ser maior que o mínimo.</p>
      )}
    </div>
  )
}
