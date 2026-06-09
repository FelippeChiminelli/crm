import { useRef } from 'react'
import {
  PaperClipIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import type { LeadAttachment } from '../../../types'
import { SectionCard } from './SectionCard'

interface LeadAttachmentsCardProps {
  attachments: LeadAttachment[]
  loading: boolean
  uploading: boolean
  currentUserId?: string
  isAdmin: boolean
  onUpload: (files: FileList) => void
  onDelete: (attachment: LeadAttachment) => void
}

const ACCEPT = 'application/pdf,image/*,video/*'

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return PhotoIcon
  if (mimeType.startsWith('video/')) return VideoCameraIcon
  return DocumentIcon
}

export function LeadAttachmentsCard(props: LeadAttachmentsCardProps) {
  const { attachments, loading, uploading, currentUserId, isAdmin, onUpload, onDelete } = props
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePick = () => inputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files)
    }
    e.target.value = ''
  }

  const canDelete = (attachment: LeadAttachment) =>
    isAdmin || attachment.uploaded_by === currentUserId

  const actions = (
    <button
      onClick={handlePick}
      disabled={uploading}
      className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {uploading ? (
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
      ) : (
        <PlusIcon className="w-4 h-4" />
      )}
      <span>Anexar</span>
    </button>
  )

  return (
    <SectionCard title="Anexos" theme="purple" icon={PaperClipIcon} headerRight={actions}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />

      <p className="text-xs text-gray-400 mb-2">
        PDF, imagens ou vídeos. Máximo de 20MB por arquivo.
      </p>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Carregando anexos...</p>
          </div>
        ) : attachments.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-500 text-sm">Nenhum anexo adicionado para este lead</p>
          </div>
        ) : (
          attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mime_type)
            return (
              <div
                key={attachment.id}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition-all flex items-center gap-3"
              >
                <span className="p-1.5 rounded-lg bg-purple-50 flex-shrink-0">
                  <Icon className="w-4 h-4 text-purple-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm truncate">{attachment.file_name}</h4>
                  <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
                </div>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex-shrink-0"
                  title="Abrir anexo"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
                {canDelete(attachment) && (
                  <button
                    onClick={() => onDelete(attachment)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Excluir anexo"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </SectionCard>
  )
}
