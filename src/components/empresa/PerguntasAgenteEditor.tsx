import { Bars3Icon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import {
  TIPOS_PERGUNTA,
  campoDeRotulo,
  perguntaNova,
  type PerguntaItemForm,
} from '../../services/sdrPerguntas'

function Campo({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      {hint ? <span className="block text-xs text-gray-500">{hint}</span> : null}
      {children}
    </label>
  )
}

function CartaoPergunta({
  item,
  perguntas,
  inputClass,
  areaClass,
  onChange,
  onRemove,
}: {
  item: PerguntaItemForm
  perguntas: PerguntaItemForm[]
  inputClass: string
  areaClass: string
  onChange: (item: PerguntaItemForm) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const estilo = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const outros = perguntas.filter((entrada) => entrada.campo !== item.campo && entrada.campo)

  const mudarRotulo = (rotulo: string) => {
    const gerado = campoDeRotulo(rotulo)
    onChange({
      ...item,
      rotulo,
      campo: item.campoManual ? item.campo : gerado || item.campo,
    })
  }

  return (
    <div ref={setNodeRef} style={estilo} className="space-y-3 border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab"
          title="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <Bars3Icon className="w-5 h-5" />
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <Campo label="Rótulo">
            <input className={inputClass} value={item.rotulo} onChange={(evento) => mudarRotulo(evento.target.value)} />
          </Campo>
          <Campo label="Identificador" hint="snake_case. Vira o nome do campo na ficha.">
            <input
              className={inputClass}
              value={item.campo}
              onChange={(evento) => onChange({ ...item, campo: evento.target.value, campoManual: true })}
            />
          </Campo>
        </div>
        <button type="button" className="p-2 text-gray-400 hover:text-red-600" title="Remover" onClick={onRemove}>
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo label="Tipo">
          <select
            className={inputClass}
            value={item.tipo}
            onChange={(evento) => onChange({ ...item, tipo: evento.target.value as PerguntaItemForm['tipo'] })}
          >
            {TIPOS_PERGUNTA.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</option>
            ))}
          </select>
        </Campo>
        <label className="flex items-center gap-2 text-sm text-gray-800 sm:mt-6">
          <input
            type="checkbox"
            checked={item.final}
            onChange={(evento) =>
              onChange({ ...item, final: evento.target.checked, textoLiteral: evento.target.checked ? item.textoLiteral : '' })
            }
          />
          Pergunta final
        </label>
      </div>

      {item.tipo === 'enum' ? (
        <Campo label="Valores" hint="Um por linha.">
          <textarea className={areaClass} value={item.valores} onChange={(evento) => onChange({ ...item, valores: evento.target.value })} />
        </Campo>
      ) : null}
      <Campo label="O que esta pergunta descobre">
        <input className={inputClass} value={item.objetivo} onChange={(evento) => onChange({ ...item, objetivo: evento.target.value })} />
      </Campo>
      <Campo label="Descrição" hint="Usada na extração. Se ficar vazia, vale o texto de cima.">
        <input className={inputClass} value={item.descricao} onChange={(evento) => onChange({ ...item, descricao: evento.target.value })} />
      </Campo>
      <Campo label="Como perguntar" hint="Uma variação por linha. O modelo não copia ao pé da letra.">
        <textarea className={areaClass} value={item.exemplos} onChange={(evento) => onChange({ ...item, exemplos: evento.target.value })} />
      </Campo>
      <Campo label="Se o cliente ignorar">
        <textarea className={areaClass} value={item.reformulacao} onChange={(evento) => onChange({ ...item, reformulacao: evento.target.value })} />
      </Campo>
      <Campo label="Não perguntar assim">
        <textarea className={areaClass} value={item.evitar} onChange={(evento) => onChange({ ...item, evitar: evento.target.value })} />
      </Campo>
      <Campo label="Abordagem" hint="Opcional. Orientação extra para o modelo.">
        <textarea className={areaClass} value={item.abordagem} onChange={(evento) => onChange({ ...item, abordagem: evento.target.value })} />
      </Campo>

      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={item.condicaoAtiva}
          onChange={(evento) => onChange({ ...item, condicaoAtiva: evento.target.checked })}
        />
        Só perguntar se outro campo tiver um valor
      </label>
      {item.condicaoAtiva ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Se o campo">
            <select className={inputClass} value={item.condicaoSe} onChange={(evento) => onChange({ ...item, condicaoSe: evento.target.value })}>
              <option value="">Escolha</option>
              {outros.map((entrada) => (
                <option key={entrada.id} value={entrada.campo}>{entrada.rotulo || entrada.campo}</option>
              ))}
            </select>
          </Campo>
          <Campo label="For igual a" hint="Um valor por linha.">
            <textarea className={areaClass} value={item.condicaoIgual} onChange={(evento) => onChange({ ...item, condicaoIgual: evento.target.value })} />
          </Campo>
        </div>
      ) : null}
      {item.final ? (
        <Campo label="Texto fixo" hint="Enviado só no fim, sem passar pelo modelo.">
          <textarea className={areaClass} value={item.textoLiteral} onChange={(evento) => onChange({ ...item, textoLiteral: evento.target.value })} />
        </Campo>
      ) : null}
    </div>
  )
}

export function PerguntasAgenteEditor({
  perguntas,
  onChange,
  inputClass,
  areaClass,
}: {
  perguntas: PerguntaItemForm[]
  onChange: (perguntas: PerguntaItemForm[]) => void
  inputClass: string
  areaClass: string
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const aoSoltar = (evento: DragEndEvent) => {
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const de = perguntas.findIndex((entrada) => entrada.id === active.id)
    const para = perguntas.findIndex((entrada) => entrada.id === over.id)
    if (de < 0 || para < 0) return
    onChange(arrayMove(perguntas, de, para))
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <SortableContext items={perguntas.map((entrada) => entrada.id)} strategy={verticalListSortingStrategy}>
          {perguntas.map((entrada) => (
            <CartaoPergunta
              key={entrada.id}
              item={entrada}
              perguntas={perguntas}
              inputClass={inputClass}
              areaClass={areaClass}
              onChange={(proxima) => onChange(perguntas.map((atual) => (atual.id === entrada.id ? proxima : atual)))}
              onRemove={() => onChange(perguntas.filter((atual) => atual.id !== entrada.id))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-700"
        onClick={() => onChange([...perguntas, perguntaNova(perguntas.map((entrada) => entrada.campo))])}
      >
        <PlusIcon className="w-4 h-4" />
        Adicionar pergunta
      </button>
    </div>
  )
}
