import { XMarkIcon } from '@heroicons/react/24/outline'
import type { GreetingMessage } from '../../services/greetingMessageService'

interface GreetingMessagePreviewProps {
  message: GreetingMessage
  onClose: () => void
}

export function GreetingMessagePreview({ message, onClose }: GreetingMessagePreviewProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Visualização da Mensagem
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Preview Area - Simula WhatsApp */}
          <div className="bg-gray-100 rounded-lg p-6 min-h-[300px]">
            <div className="max-w-md">
              {/* Mensagem do vendedor (balão verde à direita) */}
              <div className="flex justify-end mb-2">
                <div className="bg-green-100 rounded-lg p-3 max-w-[80%] shadow-sm">
                  {/* Se for mídia, mostrar preview */}
                  {message.message_type === 'media' && message.media_url && (
                    <div className="mb-2">
                      {message.media_type === 'image' && (
                        <img
                          src={message.media_url}
                          alt="Preview"
                          className="rounded max-w-full h-auto"
                          style={{ maxHeight: '300px' }}
                        />
                      )}
                      {message.media_type === 'video' && (
                        <video
                          src={message.media_url}
                          controls
                          className="rounded max-w-full h-auto"
                          style={{ maxHeight: '300px' }}
                        />
                      )}
                      {message.media_type === 'audio' && (
                        <audio
                          src={message.media_url}
                          controls
                          className="w-full"
                        />
                      )}
                      {message.media_type === 'document' && (
                        <div className="flex items-center gap-2 p-3 bg-white rounded">
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            📄
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {message.media_filename || 'Documento'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {message.media_size_bytes
                                ? `${(message.media_size_bytes / 1024 / 1024).toFixed(2)} MB`
                                : 'PDF'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Texto ou legenda */}
                  {message.text_content && (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {message.text_content}
                    </p>
                  )}

                  {/* Hora */}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs text-gray-600">
                      {new Date().toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="text-blue-500">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium text-gray-900 capitalize">
                {message.message_type === 'text' ? 'Texto' : message.media_type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quando enviar:</span>
              <span className="font-medium text-gray-900">
                {message.schedule_type === 'always' && 'Sempre'}
                {message.schedule_type === 'commercial_hours' && 'Horário Comercial'}
                {message.schedule_type === 'after_hours' && 'Fora do Horário Comercial'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${message.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                {message.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            {message.usage_count > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Enviada:</span>
                <span className="font-medium text-gray-900">
                  {message.usage_count}x
                </span>
              </div>
            )}
          </div>

          {/* Botão Fechar */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

