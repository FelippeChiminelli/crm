import { useState } from 'react'
import { XMarkIcon, HashtagIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { AvailableMetric, DashboardVariable, UpdateVariableData, VariableFormat } from '../../../../types'
import { CATEGORY_LABELS } from '../widgets/index'

const FORMAT_LABELS: Record<VariableFormat, string> = {
  number: 'Nº',
  currency: 'R$',
  percentage: '%'
}

function formatVarValue(value: number, format: VariableFormat): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    case 'percentage':
      return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
    default:
      return value.toLocaleString('pt-BR')
  }
}

interface MetricPickerModalProps {
  metricsByCategory: Record<string, AvailableMetric[]>
  searchQuery: string
  onSearchChange: (q: string) => void
  onSelect: (metric: AvailableMetric) => void
  onAddConstant: (val: number) => void
  onSelectVariable?: (variable: DashboardVariable) => void
  onCreateVariable?: (name: string, value: number, format?: VariableFormat) => Promise<DashboardVariable | null>
  onUpdateVariable?: (id: string, data: UpdateVariableData) => Promise<DashboardVariable | null>
  onDeleteVariable?: (id: string) => Promise<void>
  variables?: DashboardVariable[]
  onClose: () => void
}

export function MetricPickerModal({
  metricsByCategory,
  searchQuery,
  onSearchChange,
  onSelect,
  onAddConstant,
  onSelectVariable,
  onCreateVariable,
  onUpdateVariable,
  onDeleteVariable,
  variables = [],
  onClose
}: MetricPickerModalProps) {
  const [showConstantInput, setShowConstantInput] = useState(false)
  const [constantValue, setConstantValue] = useState('')
  const [showCreateVariable, setShowCreateVariable] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [newVarFormat, setNewVarFormat] = useState<VariableFormat>('number')
  const [creatingVar, setCreatingVar] = useState(false)

  const handleCreateVariable = async () => {
    if (!onCreateVariable || !newVarName.trim() || !newVarValue) return
    const val = parseFloat(newVarValue)
    if (isNaN(val)) return

    setCreatingVar(true)
    try {
      const created = await onCreateVariable(newVarName.trim(), val, newVarFormat)
      if (created && onSelectVariable) {
        onSelectVariable(created)
      }
      setShowCreateVariable(false)
      setNewVarName('')
      setNewVarValue('')
      setNewVarFormat('number')
    } finally {
      setCreatingVar(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Selecionar Valor</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Busca */}
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar métricas ou variáveis..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Seção de variáveis + constante */}
        <div className="px-4 py-2 border-b border-gray-100 space-y-1">
          {/* Variáveis existentes */}
          {variables.length > 0 && (
            <VariablesList
              variables={variables}
              searchQuery={searchQuery}
              onSelect={(v) => onSelectVariable?.(v)}
              onUpdate={onUpdateVariable}
              onDelete={onDeleteVariable}
            />
          )}

          {/* Criar nova variável */}
          {onCreateVariable && (
            showCreateVariable ? (
              <CreateVariableForm
                name={newVarName}
                value={newVarValue}
                format={newVarFormat}
                saving={creatingVar}
                onNameChange={setNewVarName}
                onValueChange={setNewVarValue}
                onFormatChange={setNewVarFormat}
                onConfirm={handleCreateVariable}
                onCancel={() => { setShowCreateVariable(false); setNewVarName(''); setNewVarValue(''); setNewVarFormat('number') }}
              />
            ) : (
              <button
                onClick={() => setShowCreateVariable(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Criar nova variável
              </button>
            )
          )}

          {/* Constante */}
          {showConstantInput ? (
            <ConstantInput
              value={constantValue}
              onChange={setConstantValue}
              onConfirm={() => {
                const val = parseFloat(constantValue)
                if (!isNaN(val)) {
                  onAddConstant(val)
                  setShowConstantInput(false)
                }
              }}
              onCancel={() => setShowConstantInput(false)}
            />
          ) : (
            <button
              onClick={() => setShowConstantInput(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <HashtagIcon className="w-4 h-4" />
              Usar valor numérico constante
            </button>
          )}
        </div>

        {/* Lista de métricas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(metricsByCategory).map(([category, metrics]) => {
            if (metrics.length === 0) return null
            return (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
                </h4>
                <div className="space-y-1">
                  {metrics.map(metric => (
                    <button
                      key={metric.key}
                      onClick={() => onSelect(metric)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <div className="text-sm font-medium">{metric.label}</div>
                      <div className="text-xs text-gray-500">{metric.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// VARIÁVEIS
// =====================================================

function VariablesList({
  variables,
  searchQuery,
  onSelect,
  onUpdate,
  onDelete
}: {
  variables: DashboardVariable[]
  searchQuery: string
  onSelect: (v: DashboardVariable) => void
  onUpdate?: (id: string, data: UpdateVariableData) => Promise<DashboardVariable | null>
  onDelete?: (id: string) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = searchQuery
    ? variables.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : variables

  if (filtered.length === 0) return null

  const startEdit = (v: DashboardVariable) => {
    setEditingId(v.id)
    setEditName(v.name)
    setEditValue(String(v.value))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!onUpdate || !editingId || !editName.trim() || !editValue) return
    const val = parseFloat(editValue)
    if (isNaN(val)) return

    setSaving(true)
    try {
      await onUpdate(editingId, { name: editName.trim(), value: val })
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (v: DashboardVariable) => {
    if (!onDelete) return
    if (!confirm(`Tem certeza que deseja excluir a variável "${v.name}"?`)) return
    await onDelete(v.id)
  }

  return (
    <div className="mb-1">
      <h4 className="text-xs font-semibold text-violet-600 uppercase mb-1 px-3">Variáveis</h4>
      <div className="space-y-0.5">
        {filtered.map(v => (
          editingId === v.id ? (
            <EditVariableInline
              key={v.id}
              name={editName}
              value={editValue}
              saving={saving}
              onNameChange={setEditName}
              onValueChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          ) : (
            <div
              key={v.id}
              className="group flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-violet-50 transition-colors cursor-pointer"
              onClick={() => onSelect(v)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-violet-700 truncate">{v.name}</span>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {FORMAT_LABELS[v.format || 'number']}
                    </span>
                    {v.value_type === 'periodic' && (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Periódica
                      </span>
                    )}
                    <span className="text-xs font-mono text-violet-500 bg-violet-100 px-2 py-0.5 rounded">
                      {formatVarValue(Number(v.value), v.format || 'number')}
                    </span>
                  </div>
                </div>
                {v.description && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{v.description}</div>
                )}
              </div>
              {/* Botões de editar/excluir */}
              {(onUpdate || onDelete) && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  {onUpdate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(v) }}
                      className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-100 rounded transition-colors"
                      title="Editar variável"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(v) }}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Excluir variável"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  )
}

function EditVariableInline({
  name,
  value,
  saving,
  onNameChange,
  onValueChange,
  onSave,
  onCancel
}: {
  name: string
  value: string
  saving: boolean
  onNameChange: (v: string) => void
  onValueChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="p-2 bg-violet-50 rounded-lg border border-violet-200 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nome"
          className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
          autoFocus
        />
        <input
          type="number"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Valor"
          className="w-28 px-2 py-1 border border-gray-300 rounded-md text-sm"
        />
        <button
          onClick={onSave}
          disabled={!name.trim() || !value || saving}
          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
          title="Salvar"
        >
          <CheckIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Cancelar"
          disabled={saving}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function CreateVariableForm({
  name,
  value,
  format,
  saving,
  onNameChange,
  onValueChange,
  onFormatChange,
  onConfirm,
  onCancel
}: {
  name: string
  value: string
  format: VariableFormat
  saving: boolean
  onNameChange: (v: string) => void
  onValueChange: (v: string) => void
  onFormatChange: (v: VariableFormat) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="p-3 bg-violet-50 rounded-lg border border-violet-200 space-y-2">
      <p className="text-xs font-medium text-violet-700">Nova Variável</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nome (ex: Meta Mensal)"
          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          autoFocus
        />
        <input
          type="number"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Valor"
          className="w-28 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
        />
        <select
          value={format}
          onChange={(e) => onFormatChange(e.target.value as VariableFormat)}
          className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
        >
          <option value="number">Número</option>
          <option value="currency">Moeda (R$)</option>
          <option value="percentage">Percentual (%)</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={!name.trim() || !value || saving}
          className="px-3 py-1 text-xs bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Criar e Selecionar'}
        </button>
      </div>
    </div>
  )
}

// =====================================================
// CONSTANTE
// =====================================================

function ConstantInput({
  value,
  onChange,
  onConfirm,
  onCancel
}: {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <HashtagIcon className="w-4 h-4 text-gray-400" />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite um número..."
        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
        autoFocus
      />
      <button
        onClick={onConfirm}
        className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
      >
        OK
      </button>
      <button
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-600"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
