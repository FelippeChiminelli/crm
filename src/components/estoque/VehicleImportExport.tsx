import { useState, useRef } from 'react'
import { FiDownload, FiUpload, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { importVehiclesFromCSV } from '../../services/vehicleService'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../contexts/ToastContext'
import type { VehicleImportData, VehicleImportResult } from '../../types'

interface VehicleImportExportProps {
  onExport: () => void
  onImportSuccess: () => void
}

export function VehicleImportExport({ onExport, onImportSuccess }: VehicleImportExportProps) {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<VehicleImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    setShowImportModal(true)
    setImportResult(null)
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  /**
   * Parse de linha CSV considerando aspas (valores com vírgulas)
   */
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    // Adiciona o último campo
    result.push(current.trim())

    return result
  }

  /**
   * Parse seguro de número inteiro
   */
  const safeParseInt = (value: string): number | undefined => {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? undefined : parsed
  }

  /**
   * Parse seguro de número decimal
   */
  const safeParseFloat = (value: string): number | undefined => {
    // Remove separadores de milhar e troca vírgula por ponto
    const normalized = value.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? undefined : parsed
  }

  const parseCSV = (text: string): VehicleImportData[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
    const vehicles: VehicleImportData[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const vehicle: any = {}

      headers.forEach((header, index) => {
        const value = values[index]
        if (!value) return

        switch (header) {
          case 'titulo':
          case 'título':
            vehicle.titulo_veiculo = value
            break
          case 'marca':
            vehicle.marca_veiculo = value
            break
          case 'modelo':
            vehicle.modelo_veiculo = value
            break
          case 'ano modelo':
          case 'ano':
            vehicle.ano_veiculo = safeParseInt(value)
            break
          case 'ano fabricação':
          case 'ano fabricacao':
            vehicle.ano_fabric_veiculo = safeParseInt(value)
            break
          case 'cor':
            vehicle.color_veiculo = value
            break
          case 'combustível':
          case 'combustivel':
            vehicle.combustivel_veiculo = value
            break
          case 'câmbio':
          case 'cambio':
            vehicle.cambio_veiculo = value
            break
          case 'quilometragem':
          case 'km':
            vehicle.quilometragem_veiculo = safeParseInt(value)
            break
          case 'placa':
            vehicle.plate_veiculo = value.toUpperCase()
            break
          case 'preço':
          case 'preco':
          case 'valor':
            vehicle.price_veiculo = safeParseFloat(value)
            break
          case 'preço promocional':
          case 'preco promocional':
          case 'promocao':
          case 'promoção':
            vehicle.promotion_price = safeParseFloat(value)
            break
          case 'acessórios':
          case 'acessorios':
          case 'opcionais':
            vehicle.accessories_veiculo = value
            break
        }
      })

      if (vehicle.marca_veiculo && vehicle.modelo_veiculo) {
        vehicles.push(vehicle)
      }
    }

    return vehicles
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.empresa_id) return

    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const vehicles = parseCSV(text)

      if (vehicles.length === 0) {
        showToast('Nenhum veículo válido encontrado no arquivo', 'error')
        return
      }

      const result = await importVehiclesFromCSV(profile.empresa_id, vehicles)
      setImportResult(result)

      if (result.success > 0) {
        showToast(`${result.success} veículo(s) importado(s) com sucesso!`, 'success')
        onImportSuccess()
      }

      if (result.failed > 0) {
        showToast(`${result.failed} veículo(s) falharam na importação`, 'error')
      }
    } catch (error) {
      showToast('Erro ao importar arquivo', 'error')
      console.error('Erro na importação:', error)
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadTemplate = () => {
    const template = [
      'Título,Marca,Modelo,Ano Modelo,Ano Fabricação,Cor,Combustível,Câmbio,Quilometragem,Placa,Preço,Preço Promocional,Acessórios',
      '"Ford Fusion Titanium 2.0 Turbo AWD","Ford","Fusion","2021","2020","Prata","Gasolina","Automático","45000","ABC1D23","75000","69900","Ar condicionado, Vidros elétricos, Travas elétricas"',
      '"Honda Civic EXL 2.0","Honda","Civic","2022","2021","Preto","Flex","CVT","30000","XYZ9F87","95000","","Sensor de estacionamento, Câmera de ré, Teto solar"'
    ].join('\n')

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', 'template_veiculos.csv')
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      {/* Botões - escondidos no mobile */}
      <div className="hidden lg:flex gap-2">
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          title="Exportar CSV"
        >
          <FiDownload size={18} />
          Exportar CSV
        </button>
        <button
          onClick={handleImportClick}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          title="Importar CSV"
        >
          <FiUpload size={18} />
          Importar CSV
        </button>
      </div>

      {/* Modal de importação */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-2 lg:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowImportModal(false)}
            />

            {/* Modal */}
            <div className="inline-block w-full max-w-2xl my-2 lg:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl lg:rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Importar Veículos</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} className="lg:hidden" />
                  <FiX size={24} className="hidden lg:block" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6">
                {/* Instruções */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 lg:p-4">
                  <h3 className="font-semibold text-orange-900 mb-2 text-sm lg:text-base">Como importar:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-xs lg:text-sm text-orange-800">
                    <li>Baixe o template CSV</li>
                    <li>Preencha com os dados dos veículos</li>
                    <li>Salve em formato CSV</li>
                    <li>Faça o upload do arquivo</li>
                  </ol>
                </div>

                {/* Botão template */}
                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 lg:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm lg:text-base"
                >
                  <FiDownload size={18} />
                  <span>Baixar Template CSV</span>
                </button>

                {/* Upload */}
                <div>
                  <button
                    onClick={handleFileSelect}
                    disabled={importing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 lg:py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                  >
                    <FiUpload size={18} />
                    <span>{importing ? 'Importando...' : 'Selecionar Arquivo CSV'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Resultado */}
                {importResult && (
                  <div className="space-y-3">
                    {/* Sucesso */}
                    {importResult.success > 0 && (
                      <div className="flex items-start gap-2 lg:gap-3 bg-green-50 border border-green-200 rounded-lg p-3 lg:p-4">
                        <FiCheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-green-900 text-sm lg:text-base">
                            {importResult.success} veículo(s) importado(s)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Erros */}
                    {importResult.failed > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 lg:p-4">
                        <div className="flex items-start gap-2 lg:gap-3 mb-2 lg:mb-3">
                          <FiAlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="font-semibold text-red-900 text-sm lg:text-base">
                            {importResult.failed} veículo(s) falharam
                          </p>
                        </div>
                        {importResult.errors.length > 0 && (
                          <div className="ml-6 lg:ml-8 space-y-1 max-h-32 lg:max-h-40 overflow-y-auto">
                            {importResult.errors.map((error, index) => (
                              <p key={index} className="text-xs lg:text-sm text-red-700">
                                Linha {error.row}: {error.message}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 lg:px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

