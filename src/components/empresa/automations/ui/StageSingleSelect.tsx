import { useState } from 'react'
import type { Stage } from '../../../../types'

export function StageSingleSelect({
  stages,
  value,
  placeholder,
  allowEmpty,
  onChange
}: {
  stages: Stage[]
  value: string
  placeholder?: string
  allowEmpty?: boolean
  onChange: (next: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const containerRef = (useState(null) as any)[0] as React.RefObject<HTMLDivElement> || ({} as React.RefObject<HTMLDivElement>)
  const _setRef = (el: HTMLDivElement | null) => {
    ;(containerRef as any).current = el
  }
  const recalcPlacement = () => {
    try {
      const rect = (containerRef as any)?.current?.getBoundingClientRect?.()
      if (!rect) return
      const spaceBelow = window.innerHeight - rect.bottom
      const estimated = Math.min(360, Math.max(200, stages.length * 36))
      setOpenUp(spaceBelow < estimated)
    } catch {}
  }
  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      recalcPlacement()
      try {
        window.requestAnimationFrame(recalcPlacement)
        window.addEventListener('resize', recalcPlacement, { passive: true })
        window.addEventListener('scroll', recalcPlacement, { passive: true })
      } catch {}
    } else {
      try {
        window.removeEventListener('resize', recalcPlacement)
        window.removeEventListener('scroll', recalcPlacement)
      } catch {}
    }
  }
  const current = stages.find(s => s.id === value)
  return (
    <div ref={_setRef} className="relative" tabIndex={0} onBlur={(e) => { if (!(e.currentTarget as any).contains(e.relatedTarget)) setOpen(false) }}>
      <div
        className="border rounded px-3 py-2 w-full cursor-pointer flex items-center justify-between bg-white"
        onClick={handleToggle}
      >
        <span className="text-sm text-gray-900 truncate">
          {current ? current.name : (placeholder || (allowEmpty ? 'Qualquer' : 'Selecione'))}
        </span>
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
      </div>
      {open && (
        <div className={`${openUp ? 'absolute bottom-full mb-1' : 'absolute mt-1'} z-50 w-full max-h-[60vh] overflow-auto bg-white border rounded shadow-lg p-2`}>
          {allowEmpty && (
            <button
              type="button"
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${value === '' ? 'bg-gray-50' : ''}`}
              onClick={() => { onChange(''); setOpen(false) }}
            >
              <span className="text-sm text-gray-900">Qualquer</span>
            </button>
          )}
          {stages.map(s => (
            <button
              key={s.id}
              type="button"
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${s.id === value ? 'bg-gray-50' : ''}`}
              onClick={() => { onChange(s.id); setOpen(false) }}
            >
              <span className="text-sm text-gray-900">{s.name}</span>
            </button>
          ))}
          {stages.length === 0 && (
            <div className="px-2 py-1 text-sm text-gray-500">Nenhuma etapa</div>
          )}
        </div>
      )}
    </div>
  )
}
