import { isTaskEventType, getWhatsAppRecipientHelpText } from '../constants'
import type { WhatsAppMessageType } from '../constants'
import type { WhatsAppAutomationRecipient } from '../../../../types'
import { useAutomationEditor } from '../editor/AutomationEditorContext'
import { useWhatsAppMediaUpload } from './useWhatsAppMediaUpload'

export function WhatsAppActionForm() {
  const { form, setForm, whatsappInstances } = useAutomationEditor()
  const { waUploading, waUploadError, waMediaPreview, waFileInputRef, clearWaMedia, handleWaMessageTypeChange, handleWaFileUpload } = useWhatsAppMediaUpload()
  return (
    <>
      {(form.action as any).type === 'send_whatsapp' && (
        <>
          <div className="md:col-span-3">
            <label className="block text-sm text-gray-700 mb-1">Instância WhatsApp *</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={(form.action as any).instance_id || ''}
              onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, instance_id: e.target.value } }))}
            >
              <option value="">Selecione uma instância</option>
              {whatsappInstances.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.display_name || inst.name} {inst.phone_number ? `(${inst.phone_number})` : ''} — {inst.status === 'open' ? 'Conectada' : inst.status || 'Desconhecido'}
                </option>
              ))}
            </select>
            {whatsappInstances.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Nenhuma instância WhatsApp encontrada. Conecte uma instância na seção de Chat.</p>
            )}
          </div>

          {/* Destinatário da mensagem */}
          <div className="md:col-span-3">
            <label className="block text-sm text-gray-700 mb-1">Enviar para</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={(form.action as any).wa_recipient || 'lead'}
              onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, wa_recipient: e.target.value } }))}
            >
              <option value="lead">Lead</option>
              <option value="responsible">Responsável pelo lead</option>
              {isTaskEventType(form.event_type) && (
                <option value="task_assignee">Responsável da tarefa</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {getWhatsAppRecipientHelpText(((form.action as any).wa_recipient || 'lead') as WhatsAppAutomationRecipient)}
            </p>
          </div>

          {/* Tipo de mensagem */}
          <div className="md:col-span-3">
            <label className="block text-sm text-gray-700 mb-2">Tipo de mensagem</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { type: 'text', label: 'Texto', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { type: 'image', label: 'Imagem', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { type: 'video', label: 'Vídeo', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
                { type: 'audio', label: 'Áudio', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
              ] as { type: WhatsAppMessageType; label: string; icon: string }[]).map(item => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleWaMessageTypeChange(item.type)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                    ((form.action as any).wa_message_type || 'text') === item.type
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload de mídia */}
          {((form.action as any).wa_message_type || 'text') !== 'text' && (() => {
            const waAction = form.action as any
            const waMessageType = (waAction.wa_message_type || 'text') as WhatsAppMessageType
            const displayMediaUrl = waAction.media_url || waMediaPreview || null
            const mediaFilename = waAction.media_filename as string | undefined
            const mediaSizeBytes = waAction.media_size_bytes as number | undefined
            const acceptType =
              waMessageType === 'image' ? 'image/*' :
              waMessageType === 'video' ? 'video/*' :
              'audio/*'

            return (
              <div className="md:col-span-3">
                <label className="block text-sm text-gray-700 mb-1">Arquivo de mídia *</label>

                <input
                  ref={waFileInputRef}
                  type="file"
                  onChange={handleWaFileUpload}
                  disabled={waUploading}
                  accept={acceptType}
                  className={displayMediaUrl ? 'hidden' : 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'}
                />

                {waUploading && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                    <span>Fazendo upload...</span>
                  </div>
                )}

                {waUploadError && (
                  <p className="mt-2 text-sm text-red-600">{waUploadError}</p>
                )}

                {displayMediaUrl && !waUploading && (
                  <div className="mt-2 p-3 rounded-lg border border-green-200 bg-green-50 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">
                          {mediaFilename || 'Arquivo enviado'}
                        </p>
                        {mediaSizeBytes != null && (
                          <p className="text-xs text-green-600 mt-0.5">
                            {(mediaSizeBytes / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>

                    {waMessageType === 'image' && (
                      <img
                        src={displayMediaUrl}
                        alt="Preview"
                        className="max-w-[200px] rounded-lg border border-gray-200"
                      />
                    )}
                    {waMessageType === 'video' && (
                      <video
                        src={displayMediaUrl}
                        controls
                        className="max-w-full rounded-lg border border-gray-200"
                        style={{ maxHeight: '200px' }}
                      />
                    )}
                    {waMessageType === 'audio' && (
                      <audio src={displayMediaUrl} controls className="w-full" />
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={displayMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 hover:text-green-900 underline"
                      >
                        Abrir em nova aba
                      </a>
                      <button
                        type="button"
                        onClick={() => waFileInputRef.current?.click()}
                        disabled={waUploading}
                        className="text-sm text-green-700 hover:text-green-900 font-medium disabled:opacity-50"
                      >
                        Alterar arquivo
                      </button>
                      <button
                        type="button"
                        onClick={clearWaMedia}
                        disabled={waUploading}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-1">Máximo: 50MB</p>
              </div>
            )
          })()}

          <div className="md:col-span-3">
            <label className="block text-sm text-gray-700 mb-1">
              {((form.action as any).wa_message_type || 'text') === 'text' ? 'Mensagem *' : 'Legenda (opcional)'}
            </label>
            <textarea
              className="border rounded px-3 py-2 w-full min-h-[100px] resize-y"
              placeholder="Digite a mensagem. Use variáveis como {primeiro_nome}, {nome_lead}, {empresa_lead}, etc."
              value={(form.action as any).message_template || ''}
              onChange={e => setForm(prev => ({ ...prev, action: { ...prev.action, message_template: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 mt-1">Clique nas variáveis abaixo para inserir no texto:</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { var: '{nome_lead}', label: 'Nome' },
                { var: '{primeiro_nome}', label: 'Primeiro Nome' },
                { var: '{empresa_lead}', label: 'Empresa' },
                { var: '{telefone}', label: 'Telefone' },
                { var: '{email}', label: 'Email' },
                { var: '{valor}', label: 'Valor' },
                { var: '{origem}', label: 'Origem' },
                { var: '{notas}', label: 'Notas' },
              ].map(v => (
                <button
                  key={v.var}
                  type="button"
                  onClick={() => {
                    const current = (form.action as any).message_template || ''
                    setForm(prev => ({ ...prev, action: { ...prev.action, message_template: current + v.var } }))
                  }}
                  className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors font-mono"
                >
                  {v.var} <span className="text-green-500 font-sans">({v.label})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-green-800">Envio automático de WhatsApp</h5>
                  <p className="text-sm text-green-700 mt-1">
                    A mensagem será enviada para o telefone do lead via WhatsApp. Se o lead não tiver telefone cadastrado, a ação será ignorada silenciosamente.
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Uma conversa será criada automaticamente se ainda não existir para este lead.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
