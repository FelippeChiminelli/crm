import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { FunnelIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import { LeadFilterSelector } from './LeadFilterSelector'
import { ChatFilterSelector } from './ChatFilterSelector'
import type { LeadAnalyticsFilters, ChatAnalyticsFilters } from '../../types'

interface FiltersModalProps {
  isOpen: boolean
  onClose: () => void
  leadFilters: LeadAnalyticsFilters
  chatFilters: ChatAnalyticsFilters
  onLeadFiltersChange: (filters: LeadAnalyticsFilters) => void
  onChatFiltersChange: (filters: ChatAnalyticsFilters) => void
}

export function FiltersModal({
  isOpen,
  onClose,
  leadFilters,
  chatFilters,
  onLeadFiltersChange,
  onChatFiltersChange
}: FiltersModalProps) {
  const [activeTab, setActiveTab] = useState<'leads' | 'chat'>('leads')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Gerenciar Filtros
                </h2>
                <p className="text-sm text-orange-100">
                  Configure os filtros para análise de dados
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('leads')}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-medium transition-all ${
                  activeTab === 'leads'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <FunnelIcon className="w-5 h-5" />
                <span>Leads / Pipeline</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-medium transition-all ${
                  activeTab === 'chat'
                    ? 'bg-white text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                <span>Chat / WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'leads' ? (
              <div>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>📊 Filtros de Leads e Pipeline:</strong> Configure o período, pipelines e outros filtros para análise de leads.
                  </p>
                </div>
                <LeadFilterSelector
                  filters={leadFilters}
                  onFiltersChange={onLeadFiltersChange}
                />
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>💬 Filtros de Chat:</strong> Configure o período e instâncias para análise de conversas do WhatsApp.
                  </p>
                </div>
                <ChatFilterSelector
                  filters={chatFilters}
                  onFiltersChange={onChatFiltersChange}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              As alterações são aplicadas automaticamente
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

