import { useEffect, useState } from 'react'
import { useToastContext } from '../../../contexts/ToastContext'
import {
  listNotificationTypesWithPrefs,
  setNotificationPref,
  type NotificationTypeWithPref
} from '../../../services/notificationPrefsService'
import { Switch } from '../../ui/Switch'

/** Liga/desliga cada tipo do catálogo para o usuário logado. */
export function NotificationTypesSection() {
  const { showError } = useToastContext()
  const [types, setTypes] = useState<NotificationTypeWithPref[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    listNotificationTypesWithPrefs()
      .then(setTypes)
      .catch((err: unknown) => showError(err instanceof Error ? err.message : 'Erro ao carregar tipos'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carrega uma vez ao abrir a aba
  }, [])

  const handleToggle = async (type: NotificationTypeWithPref, ativo: boolean) => {
    setSaving(type.tipo)
    try {
      await setNotificationPref(type, ativo)
      setTypes((prev) => prev.map((t) => (t.tipo === type.tipo ? { ...t, ativo } : t)))
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar preferência')
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="p-3 lg:p-4">
      <h3 className="text-sm font-semibold text-gray-900">Tipos de notificação</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">Valem para todos os seus aparelhos.</p>

      {loading ? (
        <p className="text-xs text-gray-500">Carregando...</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {types.map((type) => (
            <li key={type.tipo} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-900">{type.nome}</p>
                {type.descricao && <p className="text-xs text-gray-500">{type.descricao}</p>}
                {!type.editavel_usuario && <p className="text-xs text-orange-600 mt-0.5">Sempre ativo</p>}
              </div>
              <Switch
                checked={type.ativo}
                onChange={(next) => handleToggle(type, next)}
                disabled={!type.editavel_usuario || saving === type.tipo}
                label={type.nome}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
