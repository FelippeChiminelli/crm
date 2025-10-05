import { useState, useEffect, type ChangeEvent } from 'react'
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { ds } from '../../utils/designSystem'
import { importLeadsFromCsv } from '../../services/leadImportExportService.ts'
import type { Pipeline, Stage } from '../../types'
import { getStagesByPipeline } from '../../services/stageService'
import { StyledSelect } from '../ui/StyledSelect'
import { useAuthContext } from '../../contexts/AuthContext'
import { getCurrentEmpresa } from '../../services/empresaService'
import { useToastContext } from '../../contexts/ToastContext'

interface LeadsImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImported?: (summary: { created: number; failed: number }) => void
  pipelines?: Pipeline[]
  stages?: Stage[]
}

export function LeadsImportModal({ isOpen, onClose, onImported, pipelines = [], stages = [] }: LeadsImportModalProps) {
  const { profile } = useAuthContext()
  const { showSuccess, showError } = useToastContext()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; failed: number; errors: { line: number; message: string }[] } | null>(null)
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [pipelineStages, setPipelineStages] = useState<Stage[]>(stages)
  const [loadingStages, setLoadingStages] = useState<boolean>(false)
  const [fileLineCount, setFileLineCount] = useState<number | null>(null)
  const responsibleName = profile?.full_name || profile?.email || 'Você'
  const [empresaName, setEmpresaName] = useState<string>('')

  // Carregar empresa vinculada ao responsável (usuário logado)
  // Mostra apenas o nome no modal
  useEffect(() => {
    (async () => {
      try {
        const empresa = await getCurrentEmpresa()
        setEmpresaName(empresa?.nome || '')
      } catch {
        setEmpresaName('')
      }
    })()
  }, [])

  // Ao selecionar um pipeline, carregar (ou filtrar) as etapas correspondentes
  useEffect(() => {
    const loadStages = async () => {
      if (!selectedPipeline) {
        setPipelineStages([])
        setSelectedStage('')
        return
      }
      try {
        setLoadingStages(true)
        const { data, error } = await getStagesByPipeline(selectedPipeline)
        if (error) {
          setPipelineStages([])
        } else {
          setPipelineStages((data as Stage[]) || [])
        }
      } catch {
        setPipelineStages([])
      } finally {
        setLoadingStages(false)
        setSelectedStage('')
      }
    }
    loadStages()
  }, [selectedPipeline])

  const pipelineOptions = pipelines.map(p => ({ value: p.id, label: p.name }))
  const stageOptions = pipelineStages.map(s => ({ value: s.id, label: s.name }))

  if (!isOpen) return null

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (!f) {
      setFile(null)
      setFileLineCount(null)
      return
    }
    try {
      // Limite de linhas: 10k
      const MAX_LINES = 10000
      const text = await f.text()
      const lines = text ? (text.match(/\n/g)?.length || 0) + 1 : 0
      setFileLineCount(lines)
      if (lines > MAX_LINES) {
        setError(`Arquivo com ${lines.toLocaleString('pt-BR')} linhas excede o limite de ${MAX_LINES.toLocaleString('pt-BR')}. Divida em arquivos menores.`)
        showError('Arquivo muito grande', `O limite é ${MAX_LINES.toLocaleString('pt-BR')} linhas por importação.`)
        setFile(null)
        ;(e.target as HTMLInputElement).value = ''
        return
      }
      setError(null)
      setFile(f)
    } catch (err) {
      setError('Não foi possível ler o arquivo CSV')
      setFile(null)
      setFileLineCount(null)
    }
  }

  const handleImport = async () => {
    if (!file) return
    if (!selectedPipeline || !selectedStage) {
      setError('Selecione o Pipeline e a Etapa para importar os leads')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await importLeadsFromCsv(file, { default_pipeline_id: selectedPipeline, default_stage_id: selectedStage })
      setResult(res)
      onImported?.({ created: res.created, failed: res.failed })
      showSuccess('Leads importados com sucesso', `${res.created} criado(s), ${res.failed} falha(s).`)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Erro ao importar CSV')
      showError('Erro ao importar leads', e?.message || 'Tente novamente mais tarde')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const sampleCsv = `name,company,value,phone,email,origin,status,notes\nExemplo Ltda,Cliente XPTO,1000,5511999999999,exemplo@email.com,landing,novo,Observação`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 sm:px-7 pt-6 sm:pt-7">
          <div className={ds.header()}>
            <h3 className={ds.headerTitle()}>Importar Leads via CSV</h3>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Fechar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="text-xs text-gray-700 space-y-2 bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="font-medium">Como montar a planilha (CSV)</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                Colunas aceitas: <code className="bg-white border rounded px-1 py-0.5">name</code>, <code className="bg-white border rounded px-1 py-0.5">company</code>, <code className="bg-white border rounded px-1 py-0.5">value</code>, <code className="bg-white border rounded px-1 py-0.5">phone</code>, <code className="bg-white border rounded px-1 py-0.5">email</code>, <code className="bg-white border rounded px-1 py-0.5">origin</code>, <code className="bg-white border rounded px-1 py-0.5">status</code>, <code className="bg-white border rounded px-1 py-0.5">notes</code>
              </li>
              <li>Separador: vírgula , (campos com vírgula devem estar entre aspas)</li>
              <li>Telefone no formato internacional: 55 + DDD + número (ex: 5511999999999)</li>
              <li>Pipeline e Etapa serão definidos pelo que você selecionar abaixo (não inclua essas colunas no CSV)</li>
              <li>O responsável será definido automaticamente como o usuário que está importando</li>
            </ul>
          </div>
          <div className="text-xs text-gray-700">
            <p className="font-medium mb-2">Modelo CSV</p>
            <pre className="p-2 bg-gray-50 border border-gray-200 rounded-md overflow-x-auto text-xs">{sampleCsv}</pre>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  const bom = '\uFEFF' // BOM para Excel
                  const content = bom + sampleCsv + '\n'
                  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.setAttribute('download', 'modelo_importacao_leads.csv')
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  URL.revokeObjectURL(url)
                }}
                className={`${ds.button('primary')} text-xs px-2 py-1 inline-flex items-center gap-1.5`}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download arquivo modelo
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-600">Limite por importação: Equivalente a 10.000 linhas.</p>
          </div>
          <div className="text-xs text-gray-700 -mb-1">
            <span className="text-gray-600">Responsável: </span>
            <span className="font-medium text-gray-900">{responsibleName}</span>
            <span className="text-gray-400 mx-2">|</span>
            <span className="text-gray-600">Empresa: </span>
            <span className="font-medium text-gray-900">{empresaName || '—'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-700 mb-1">Pipeline padrão</label>
              <StyledSelect
                options={pipelineOptions}
                value={selectedPipeline}
                onChange={setSelectedPipeline}
                placeholder="Selecione o pipeline"
                className="w-full"
                size="sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Etapa padrão</label>
              <StyledSelect
                options={stageOptions}
                value={selectedStage}
                onChange={setSelectedStage}
                placeholder={selectedPipeline ? (loadingStages ? 'Carregando etapas...' : 'Selecione a etapa') : 'Selecione um pipeline primeiro'}
                disabled={!selectedPipeline || loadingStages}
                className="w-full"
                size="sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">Arquivo CSV</label>
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="text-sm" />
            {fileLineCount !== null && (
              <p className="mt-1 text-[11px] text-gray-500">{fileLineCount.toLocaleString('pt-BR')} linhas detectadas</p>
            )}
          </div>
          {error && (
            <div className="text-xs text-red-600">{error}</div>
          )}
          {result && (
            <div className="text-xs text-gray-700">
              <div><strong>Criados:</strong> {result.created}</div>
              <div><strong>Falharam:</strong> {result.failed}</div>
              {result.errors.length > 0 && (
                <div className="mt-1.5 max-h-40 overflow-auto border rounded p-2 bg-gray-50">
                  {result.errors.map((e, idx) => (
                    <div key={idx} className="text-xs text-red-700">Linha {e.line}: {e.message}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className={ds.button('secondary')}>Cancelar</button>
          <button onClick={handleImport} disabled={!file || loading} className={ds.button('primary')}>
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}


