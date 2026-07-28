import { Routes, Route, Navigate } from 'react-router-dom'
import PartnerEmpresasPage from './PartnerEmpresasPage'

/**
 * Entry do modulo Aucta Admin (chunk lazy).
 *
 * Montado sob /partner/* em routes/index.tsx, atras de ProtectedRoute + PartnerRoute.
 * Este modulo consome apenas o servico api_admin (nunca o Supabase diretamente).
 */
export default function PartnerRoutes() {
  return (
    <Routes>
      <Route index element={<PartnerEmpresasPage />} />
      <Route path="empresas" element={<PartnerEmpresasPage />} />
      <Route path="*" element={<Navigate to="/partner" replace />} />
    </Routes>
  )
}
