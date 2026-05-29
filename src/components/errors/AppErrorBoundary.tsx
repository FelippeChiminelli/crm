import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  isChunkLoadError,
  safeReloadForChunkError,
} from '../../utils/chunkErrorHandler'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  isChunkError: boolean
  message: string
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    isChunkError: false,
    message: '',
  }

  static getDerivedStateFromError(error: Error): State {
    const chunk = isChunkLoadError(error)
    return {
      hasError: true,
      isChunkError: chunk,
      message: error?.message || 'Erro inesperado',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, info.componentStack)

    if (isChunkLoadError(error)) {
      safeReloadForChunkError()
    }
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.state.isChunkError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <ArrowPathIcon className="w-6 h-6 text-orange-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Atualizando o CRM</h1>
            <p className="text-sm text-gray-600 mt-2">
              Uma nova versão foi publicada. Recarregue a página para continuar.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
            >
              Recarregar página
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Algo deu errado</h1>
          <p className="text-sm text-gray-600 mt-2">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          {import.meta.env.DEV && this.state.message && (
            <pre className="mt-3 text-left text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
              {this.state.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
          >
            Recarregar página
          </button>
        </div>
      </div>
    )
  }
}
