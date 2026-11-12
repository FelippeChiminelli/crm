import { useState } from 'react'
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import type {
  LeadProcura,
  LeadProcuraInput,
  LeadProcuraMatch,
  ProcuraMatchStatus,
  ProcuraStatus
} from '../../../types'
import {
  createLeadProcura,
  setLeadProcuraStatus,
  setProcuraMatchStatus,
  updateLeadProcura
} from '../../../services/procuraService'
import { useToastContext } from '../../../contexts/ToastContext'
import { formatCurrency } from '../../../utils/validation'
import { SectionCard } from './SectionCard'
import { ProcuraForm } from './procura/ProcuraForm'

interface LeadProcuraCardProps {
  leadId: string
  empresaId: string
  readOnly?: boolean
  procuras: LeadProcura[]
  matches: LeadProcuraMatch[]
  loading: boolean
  onChanged: () => Promise<void>
}

const CAMBIO_LABEL = { automatico: 'Automático', manual: 'Manual' } as const
const COMBUSTIVEL_LABEL = { flex: 'Flex', diesel: 'Diesel', eletrico: 'Elétrico/Híbrido' } as const

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function resumo(p: LeadProcura): string {
  const parts: string[] = [[p.marca, p.modelo].filter(Boolean).join(' ')]
  if (p.ano_min || p.ano_max) {
    parts.push(
      p.ano_min && p.ano_max ? `${p.ano_min}–${p.ano_max}` : p.ano_min ? `${p.ano_min}+` : `até ${p.ano_max}`
    )
  }
  if (p.preco_max) parts.push(`até ${formatCurrency(p.preco_max)}`)
  if (p.km_max) parts.push(`até ${p.km_max.toLocaleString('pt-BR')} km`)
  if (p.cambio) parts.push(CAMBIO_LABEL[p.cambio])
  if (p.combustivel) parts.push(COMBUSTIVEL_LABEL[p.combustivel])
  return parts.join(' · ')
}

function statusLabel(p: LeadProcura): { label: string; className: string } {
  if (p.status === 'atendida') return { label: 'Atendida', className: 'bg-green-100 text-green-700' }
  if (p.status === 'cancelada') return { label: 'Cancelada', className: 'bg-gray-100 text-gray-600' }
  if (p.expira_em < today()) return { label: 'Expirada', className: 'bg-gray-100 text-gray-600' }
  return { label: 'Ativa', className: 'bg-teal-100 text-teal-700' }
}

function MatchRow({
  match,
  readOnly,
  onStatus
}: {
  match: LeadProcuraMatch
  readOnly?: boolean
  onStatus: (status: ProcuraMatchStatus) => void
}) {
  const v = match.vehicle
  const emEstoque = v?.status_veiculo === 'disponivel'
  const foto = v?.images?.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url
  const preco = v ? (v.promotion_price || v.price_veiculo) : null

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg border ${
        match.status === 'descartado' || !emEstoque ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="w-14 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {foto ? (
          <img src={foto} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <TruckIcon className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {v ? v.titulo_veiculo || [v.marca_veiculo, v.modelo_veiculo].filter(Boolean).join(' ') : 'Veículo'}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {v
            ? [
                v.ano_veiculo,
                preco ? formatCurrency(preco) : null,
                v.quilometragem_veiculo != null ? `${v.quilometragem_veiculo.toLocaleString('pt-BR')} km` : null,
                v.plate_veiculo
              ]
                .filter(Boolean)
                .join(' · ')
            : 'Não está mais no estoque'}
          {v && !emEstoque && ' · fora do estoque'}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {match.origem === 'entrada_estoque' && match.status === 'novo' && emEstoque && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700">Chegou</span>
        )}
        {match.status === 'oferecido' && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-700">Oferecido</span>
        )}
        {!readOnly && emEstoque && match.status === 'novo' && (
          <>
            <button
              onClick={() => onStatus('oferecido')}
              className="px-2 py-1 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
            >
              Oferecer
            </button>
            <button
              onClick={() => onStatus('descartado')}
              className="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Descartar
            </button>
          </>
        )}
        {!readOnly && match.status !== 'novo' && (
          <button onClick={() => onStatus('novo')} className="text-[11px] text-gray-400 hover:text-gray-600 underline">
            desfazer
          </button>
        )}
      </div>
    </div>
  )
}

export function LeadProcuraCard({
  leadId,
  empresaId,
  readOnly,
  procuras,
  matches,
  loading,
  onChanged
}: LeadProcuraCardProps) {
  const { showSuccess, showError } = useToastContext()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LeadProcura | null>(null)
  const [saving, setSaving] = useState(false)
  const [showEncerradas, setShowEncerradas] = useState(false)

  const isAtiva = (p: LeadProcura) => p.status === 'ativa' && p.expira_em >= today()
  const ativas = procuras.filter(isAtiva)
  const encerradas = procuras.filter((p) => !isAtiva(p))

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSubmit = async (input: LeadProcuraInput) => {
    setSaving(true)
    try {
      const { encontrados } = editing
        ? await updateLeadProcura(editing.id, input)
        : await createLeadProcura(empresaId, leadId, input)
      showSuccess(
        editing ? 'Procura atualizada' : 'Procura salva',
        encontrados > 0
          ? `${encontrados} ${encontrados === 1 ? 'carro no estoque já atende' : 'carros no estoque já atendem'}`
          : 'Você será avisado quando chegar um carro compatível'
      )
      closeForm()
      await onChanged()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar procura')
    } finally {
      setSaving(false)
    }
  }

  const handleProcuraStatus = async (id: string, status: ProcuraStatus) => {
    try {
      await setLeadProcuraStatus(id, status)
      await onChanged()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao atualizar procura')
    }
  }

  const handleMatchStatus = async (id: string, status: ProcuraMatchStatus) => {
    try {
      await setProcuraMatchStatus(id, status)
      await onChanged()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao atualizar veículo')
    }
  }

  const renderProcura = (p: LeadProcura) => {
    const badge = statusLabel(p)
    const ativa = isAtiva(p)
    const doProcura = matches
      .filter((m) => m.procura_id === p.id)
      // Em estoque e sem ação primeiro
      .sort((a, b) => {
        const score = (m: LeadProcuraMatch) =>
          (m.vehicle?.status_veiculo === 'disponivel' ? 0 : 2) + (m.status === 'novo' ? 0 : 1)
        return score(a) - score(b)
      })

    return (
      <div key={p.id} className="border border-gray-200 rounded-lg p-3 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{resumo(p)}</p>
            {p.observacao && <p className="text-xs text-gray-500 mt-0.5">{p.observacao}</p>}
            <p className="text-[11px] text-gray-400 mt-0.5">
              {ativa ? `Avisando até ${formatDate(p.expira_em)}` : `Criada em ${formatDate(p.created_at)}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${badge.className}`}>{badge.label}</span>
            {!readOnly && (
              <button
                onClick={() => {
                  setEditing(p)
                  setFormOpen(true)
                }}
                title="Editar"
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {doProcura.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {doProcura.map((m) => (
              <MatchRow key={m.id} match={m} readOnly={readOnly} onStatus={(s) => handleMatchStatus(m.id, s)} />
            ))}
          </div>
        ) : (
          ativa && (
            <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-md px-2 py-1.5">
              Nenhum carro compatível no estoque ainda. Avisaremos quando chegar.
            </p>
          )
        )}

        {!readOnly && (
          <div className="mt-2 flex gap-3 text-xs">
            {ativa ? (
              <>
                <button onClick={() => handleProcuraStatus(p.id, 'atendida')} className="text-green-700 hover:underline">
                  Marcar como atendida
                </button>
                <button onClick={() => handleProcuraStatus(p.id, 'cancelada')} className="text-gray-500 hover:underline">
                  Cancelar procura
                </button>
              </>
            ) : (
              p.status !== 'ativa' && (
                <button onClick={() => handleProcuraStatus(p.id, 'ativa')} className="text-teal-700 hover:underline">
                  Reativar
                </button>
              )
            )}
          </div>
        )}
      </div>
    )
  }

  const actions = !readOnly && !formOpen && (
    <button
      onClick={() => setFormOpen(true)}
      className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap inline-flex items-center gap-1"
    >
      <PlusIcon className="w-4 h-4" />
      <span>Avisar quando chegar</span>
    </button>
  )

  return (
    <SectionCard title="Procura de veículo" theme="teal" icon={MagnifyingGlassIcon} headerRight={actions || undefined}>
      <div className="space-y-3">
        {formOpen && (
          <ProcuraForm
            key={editing?.id ?? 'nova'}
            initial={editing}
            saving={saving}
            onCancel={closeForm}
            onSubmit={handleSubmit}
          />
        )}

        {loading ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Carregando procuras...</p>
          </div>
        ) : procuras.length === 0 && !formOpen ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-700 text-sm font-medium">O cliente está esperando um carro específico?</p>
            <p className="text-gray-500 text-xs mt-1">
              Cadastre o que ele procura e o sistema avisa você quando um carro compatível entrar no estoque.
            </p>
          </div>
        ) : (
          <>
            {ativas.map(renderProcura)}
            {encerradas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowEncerradas((s) => !s)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showEncerradas ? 'Ocultar' : 'Mostrar'} encerradas ({encerradas.length})
                </button>
                {showEncerradas && <div className="mt-2 space-y-3">{encerradas.map(renderProcura)}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </SectionCard>
  )
}
