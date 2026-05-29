import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupChunkErrorHandler, resetChunkReloadCounter } from './utils/chunkErrorHandler'

setupChunkErrorHandler()

// Boot bem-sucedido: libera contador de reload automático para próxima atualização
window.addEventListener('load', () => {
  window.setTimeout(() => resetChunkReloadCounter(), 3000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
