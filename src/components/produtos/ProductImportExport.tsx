import { useState, useRef } from 'react'
import { FiDownload, FiUpload, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { importProductsFromCSV } from '../../services/productExportService'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../contexts/ToastContext'
import type { ProductImportData, ProductImportResult } from '../../types'

interface ProductImportExportProps {
  onExport: () => void
  onImportSuccess: () => void
}

const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += char }
  }
  result.push(current.trim())
  return result
}

const safeParseFloat = (value: string): number | undefined => {
  const normalized = value.replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? undefined : parsed
}

const safeParseInt = (value: string): number | undefined => {
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? undefined : parsed
}

export function ProductImportExport({ onExport, onImportSuccess }: ProductImportExportProps) {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ProductImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string): ProductImportData[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
    const products: ProductImportData[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const item: any = {}
      headers.forEach((header, idx) => {
        const val = values[idx]
        if (!val) return
        switch (header) {
          case 'nome': item.nome = val; break
          case 'descrição': case 'descricao': item.descricao = val; break
          case 'sku': case 'código': case 'codigo': item.sku = val; break
          case 'categoria': item.categoria_nome = val; break
          case 'marca': item.marca = val; break
          case 'preço': case 'preco': case 'valor': item.preco = safeParseFloat(val); break
          case 'preço promocional': case 'preco promocional': item.preco_promocional = safeParseFloat(val); break
          case 'quantidade': case 'qtd': case 'estoque': case 'qtd estoque': item.quantidade_estoque = safeParseInt(val); break
          case 'unidade': case 'un': item.unidade_medida = val; break
          case 'status': item.status = val.toLowerCase(); break
          case 'tipo': item.tipo = val.toLowerCase(); break
          case 'duração estimada': case 'duracao estimada': case 'duração': case 'duracao': item.duracao_estimada = val; break
          case 'recorrência': case 'recorrencia': item.recorrencia = val.toLowerCase(); break
        }
      })
      if (item.nome) products.push(item)
    }
    return products
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.empresa_id) return
    setImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const products = parseCSV(text)
      if (products.length === 0) { showToast('Nenhum item válido encontrado', 'error'); return }
      const result = await importProductsFromCSV(profile.empresa_id, products)
      setImportResult(result)
      if (result.success > 0) { showToast(`${result.success} item(ns) importado(s)!`, 'success'); onImportSuccess() }
      if (result.failed > 0) { showToast(`${result.failed} item(ns) falharam`, 'error') }
    } catch { showToast('Erro ao importar arquivo', 'error') }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const downloadTemplate = () => {
    const template = [
      'Tipo,Nome,Descrição,SKU,Categoria,Marca,Preço,Preço Promocional,Quantidade,Unidade,Status,Duração Estimada,Recorrência',
      '"produto","Camiseta Básica","Camiseta 100% algodão","CAM-001","Vestuário","Marca X","59.90","49.90","100","un","ativo","",""',
      '"servico","Consultoria Técnica","Consultoria especializada","","Serviços","","150","","","","ativo","1h","mensal"',
    ].join('\n')
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', 'template_produtos.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <div className="hidden lg:flex gap-2">
        <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" title="Exportar CSV">
          <FiDownload size={18} /> Exportar CSV
        </button>
        <button onClick={() => { setShowImportModal(true); setImportResult(null) }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors" title="Importar CSV">
          <FiUpload size={18} /> Importar CSV
        </button>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-2 lg:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowImportModal(false)} />
            <div className="inline-block w-full max-w-2xl my-2 lg:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl lg:rounded-2xl">
              <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Importar Produtos e Serviços</h2>
                <button onClick={() => setShowImportModal(false)} className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <FiX size={20} className="lg:hidden" /><FiX size={24} className="hidden lg:block" />
                </button>
              </div>
              <div className="px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 lg:p-4">
                  <h3 className="font-semibold text-orange-900 mb-2 text-sm lg:text-base">Como importar:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-xs lg:text-sm text-orange-800">
                    <li>Baixe o template CSV</li>
                    <li>Preencha com os dados dos produtos/serviços</li>
                    <li>Salve em formato CSV</li>
                    <li>Faça o upload do arquivo</li>
                  </ol>
                </div>
                <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 lg:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm lg:text-base">
                  <FiDownload size={18} /> Baixar Template CSV
                </button>
                <div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 lg:py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 text-sm lg:text-base">
                    <FiUpload size={18} /> {importing ? 'Importando...' : 'Selecionar Arquivo CSV'}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </div>
                {importResult && (
                  <div className="space-y-3">
                    {importResult.success > 0 && (
                      <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 lg:p-4">
                        <FiCheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="font-semibold text-green-900 text-sm lg:text-base">{importResult.success} item(ns) importado(s)</p>
                      </div>
                    )}
                    {importResult.failed > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 lg:p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <FiAlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="font-semibold text-red-900 text-sm lg:text-base">{importResult.failed} item(ns) falharam</p>
                        </div>
                        {importResult.errors.length > 0 && (
                          <div className="ml-6 space-y-1 max-h-32 overflow-y-auto">
                            {importResult.errors.map((err, i) => (
                              <p key={i} className="text-xs lg:text-sm text-red-700">Linha {err.row}: {err.message}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-4 lg:px-6 py-3 lg:py-4 bg-gray-50 border-t border-gray-200">
                <button onClick={() => setShowImportModal(false)} className="px-4 lg:px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
