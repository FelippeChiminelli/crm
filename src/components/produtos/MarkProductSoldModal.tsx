import { useEffect, useState } from 'react'
import { FiX, FiCheckCircle } from 'react-icons/fi'
import type { Product } from '../../types'

interface MarkProductSoldModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onConfirm: (quantidadeVendida: number) => Promise<void> | void
}

/**
 * Modal simples para confirmar a venda de um produto, perguntando a quantidade vendida.
 * Para serviços (tipo='servico') o input fica oculto e a confirmação envia quantidade=1
 * (o service ignora a quantidade de qualquer forma).
 */
export function MarkProductSoldModal({
  product,
  isOpen,
  onClose,
  onConfirm,
}: MarkProductSoldModalProps) {
  const isService = (product.tipo || 'produto') === 'servico'
  const estoqueAtual = product.quantidade_estoque ?? 0
  const unidade = product.unidade_medida || 'un'

  const [quantidade, setQuantidade] = useState<number>(isService ? 1 : 1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reseta quando o modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setQuantidade(isService ? 1 : Math.min(1, Math.max(1, estoqueAtual)))
      setError(null)
      setSubmitting(false)
    }
  }, [isOpen, isService, estoqueAtual])

  if (!isOpen) return null

  const validQuantidade = isService
    ? true
    : quantidade > 0 && quantidade <= Math.max(estoqueAtual, 1)

  const handleConfirm = async () => {
    if (!validQuantidade) {
      setError(
        estoqueAtual === 0
          ? 'Sem estoque disponível. Será marcado como vendido mesmo assim.'
          : `A quantidade deve estar entre 1 e ${estoqueAtual}.`
      )
      // Mesmo com estoque 0, permitimos seguir (alguns casos: produto controlado fora do CRM)
      if (estoqueAtual > 0) return
    }
    try {
      setSubmitting(true)
      setError(null)
      await onConfirm(isService ? 1 : quantidade)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar como vendido')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={() => !submitting && onClose()}
        />

        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-green-500">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="text-white" size={22} />
              <div>
                <h2 className="text-base font-semibold text-white">Marcar como Vendido</h2>
                <p className="text-xs text-green-100 truncate max-w-[260px]">{product.nome}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="p-1.5 text-white hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="px-5 py-4 space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {isService ? (
              <p className="text-sm text-gray-600">
                Este é um <span className="font-medium text-purple-700">serviço</span>.
                Confirmar irá marcá-lo como vendido sem alterar nenhum estoque.
              </p>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  Estoque atual: <span className="font-semibold">{estoqueAtual} {unidade}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade vendida
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(estoqueAtual, 1)}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {quantidade >= estoqueAtual
                      ? 'O estoque ficará zerado e o item será marcado como Vendido.'
                      : `Restarão ${estoqueAtual - quantidade} ${unidade} em estoque (status permanece Ativo).`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-3 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || (!isService && !validQuantidade && estoqueAtual > 0)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Confirmando...
                </>
              ) : (
                <>
                  <FiCheckCircle size={16} />
                  Confirmar Venda
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
