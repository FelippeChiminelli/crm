import { useEffect, useId, useState } from 'react'
import type { LeadProcura, LeadProcuraInput, ProcuraCambio, ProcuraCombustivel } from '../../../../types'
import { getProcuraSugestoes, type ProcuraSugestao } from '../../../../services/procuraService'

interface ProcuraFormProps {
  initial?: LeadProcura | null
  saving: boolean
  onCancel: () => void
  onSubmit: (input: LeadProcuraInput) => void
}

const CAMBIO_OPTIONS: { value: ProcuraCambio | null; label: string }[] = [
  { value: null, label: 'Qualquer' },
  { value: 'automatico', label: 'Automático' },
  { value: 'manual', label: 'Manual' }
]

const COMBUSTIVEL_OPTIONS: { value: ProcuraCombustivel | null; label: string }[] = [
  { value: null, label: 'Qualquer' },
  { value: 'flex', label: 'Flex' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'eletrico', label: 'Elétrico/Híbrido' }
]

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

function defaultExpiry(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toISOString().slice(0, 10)
}

function toNumberOrNull(v: string): number | null {
  const digits = v.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

function Chips<T extends string | null>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
            value === o.value
              ? 'bg-teal-50 border-teal-400 text-teal-700 font-medium'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ProcuraForm({ initial, saving, onCancel, onSubmit }: ProcuraFormProps) {
  const marcaListId = useId()
  const modeloListId = useId()

  const [marca, setMarca] = useState(initial?.marca ?? '')
  const [modelo, setModelo] = useState(initial?.modelo ?? '')
  const [anoMin, setAnoMin] = useState(initial?.ano_min?.toString() ?? '')
  const [anoMax, setAnoMax] = useState(initial?.ano_max?.toString() ?? '')
  const [precoMax, setPrecoMax] = useState(initial?.preco_max?.toString() ?? '')
  const [kmMax, setKmMax] = useState(initial?.km_max?.toString() ?? '')
  const [cambio, setCambio] = useState<ProcuraCambio | null>(initial?.cambio ?? null)
  const [combustivel, setCombustivel] = useState<ProcuraCombustivel | null>(initial?.combustivel ?? null)
  const [observacao, setObservacao] = useState(initial?.observacao ?? '')
  const [expiraEm, setExpiraEm] = useState(initial?.expira_em ?? defaultExpiry())
  const [error, setError] = useState<string | null>(null)

  const [marcas, setMarcas] = useState<ProcuraSugestao[]>([])
  const [modelos, setModelos] = useState<ProcuraSugestao[]>([])

  useEffect(() => {
    getProcuraSugestoes('marca').then(setMarcas).catch(() => setMarcas([]))
  }, [])

  // Modelos filtrados pela marca digitada (com pequeno atraso para não consultar a cada tecla)
  useEffect(() => {
    if (!marca.trim()) {
      setModelos([])
      return
    }
    const timer = setTimeout(() => {
      getProcuraSugestoes('modelo', marca).then(setModelos).catch(() => setModelos([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [marca])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!marca.trim()) {
      setError('Informe a marca')
      return
    }
    const ano_min = toNumberOrNull(anoMin)
    const ano_max = toNumberOrNull(anoMax)
    if (ano_min && ano_max && ano_min > ano_max) {
      setError('O ano inicial é maior que o final')
      return
    }
    onSubmit({
      marca: marca.trim(),
      modelo: modelo.trim() || null,
      ano_min,
      ano_max,
      preco_max: toNumberOrNull(precoMax),
      km_max: toNumberOrNull(kmMax),
      cambio,
      combustivel,
      observacao: observacao.trim() || null,
      expira_em: expiraEm || defaultExpiry()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-teal-50/40 border border-teal-200 rounded-lg p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Marca *</label>
          <input
            className={inputClass}
            list={marcaListId}
            value={marca}
            onChange={(e) => {
              setMarca(e.target.value)
              setError(null)
            }}
            placeholder="Chevrolet"
            autoFocus
          />
          <datalist id={marcaListId}>
            {marcas.map((m) => (
              <option key={m.valor} value={m.valor} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>Modelo</label>
          <input
            className={inputClass}
            list={modeloListId}
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Onix Plus"
          />
          <datalist id={modeloListId}>
            {modelos.map((m) => (
              <option key={m.valor} value={m.valor}>{`${m.qtd} no estoque`}</option>
            ))}
          </datalist>
          <p className="text-[11px] text-gray-400 mt-1">Quanto mais genérico, mais carros encontra.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Ano de</label>
          <input className={inputClass} inputMode="numeric" value={anoMin} onChange={(e) => setAnoMin(e.target.value)} placeholder="2020" />
        </div>
        <div>
          <label className={labelClass}>Ano até</label>
          <input className={inputClass} inputMode="numeric" value={anoMax} onChange={(e) => setAnoMax(e.target.value)} placeholder="2024" />
        </div>
        <div>
          <label className={labelClass}>Preço até (R$)</label>
          <input className={inputClass} inputMode="numeric" value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} placeholder="90000" />
        </div>
        <div>
          <label className={labelClass}>Km até</label>
          <input className={inputClass} inputMode="numeric" value={kmMax} onChange={(e) => setKmMax(e.target.value)} placeholder="80000" />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div>
          <span className={labelClass}>Câmbio</span>
          <Chips options={CAMBIO_OPTIONS} value={cambio} onChange={setCambio} />
        </div>
        <div>
          <span className={labelClass}>Combustível</span>
          <Chips options={COMBUSTIVEL_OPTIONS} value={combustivel} onChange={setCombustivel} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Observação</label>
        <textarea
          className={inputClass}
          rows={2}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Prefere branco ou prata, versão LTZ"
        />
        <p className="text-[11px] text-gray-400 mt-1">Só para o vendedor ler, não entra no aviso automático.</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className={labelClass}>Avisar até</label>
          <input type="date" className={inputClass} value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Salvar procura'}
          </button>
        </div>
      </div>
    </form>
  )
}
