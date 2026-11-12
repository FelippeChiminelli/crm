import type { AutomationScheduleWindow } from '../../../../types'
import { ConditionChip, type ConditionAccent } from './ConditionChip'
import { DEFAULT_SCHEDULE_WINDOW, WEEKDAYS, isScheduleWindowValid } from './scheduleWindow'

interface ScheduleWindowConditionProps {
  value?: AutomationScheduleWindow
  onChange: (window: AutomationScheduleWindow | undefined) => void
  accent?: ConditionAccent
}

/** Restringe em quais dias e horários uma automação de tempo pode executar. */
export function ScheduleWindowCondition({ value, onChange, accent = 'amber' }: ScheduleWindowConditionProps) {
  const enabled = !!value
  const schedule = value || DEFAULT_SCHEDULE_WINDOW
  const update = (patch: Partial<AutomationScheduleWindow>) => onChange({ ...schedule, ...patch })

  const toggleDay = (day: number) => {
    const days = schedule.days.includes(day)
      ? schedule.days.filter(d => d !== day)
      : [...schedule.days, day].sort((a, b) => a - b)
    update({ days })
  }

  return (
    <div className="md:col-span-4">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onChange(e.target.checked ? { ...DEFAULT_SCHEDULE_WINDOW } : undefined)}
        />
        Restringir horário de execução
      </label>
      <p className="text-xs text-gray-500 mt-1">
        Fora da janela a automação não executa. Leads que atingirem o tempo nesse período disparam quando a janela abrir.
      </p>

      {enabled && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Das</label>
            <input
              type="time"
              className="border rounded px-3 py-2 w-full"
              value={schedule.start}
              onChange={e => update({ start: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Até</label>
            <input
              type="time"
              className="border rounded px-3 py-2 w-full"
              value={schedule.end}
              onChange={e => update({ end: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Dias da semana</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => (
                <ConditionChip
                  key={day.value}
                  label={day.label}
                  accent={accent}
                  selected={schedule.days.includes(day.value)}
                  onClick={() => toggleDay(day.value)}
                />
              ))}
            </div>
          </div>
          {!isScheduleWindowValid(schedule) && (
            <p className="md:col-span-4 text-xs text-red-600">
              {schedule.days.length === 0
                ? 'Selecione ao menos um dia da semana.'
                : 'O horário de início precisa ser anterior ao de fim (faixas que passam da meia-noite não são suportadas).'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
