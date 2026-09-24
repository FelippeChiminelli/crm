import type { Editor } from '@tiptap/react'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  ListBulletIcon,
  NumberedListIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  Bars3BottomRightIcon,
  MinusIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from '@heroicons/react/24/outline'

interface ContractEditorToolbarProps {
  editor: Editor
}

const activeClass = 'bg-orange-100 text-orange-700 border-orange-200'
const idleClass = 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'

export function ContractEditorToolbar({ editor }: ContractEditorToolbarProps) {
  const button = (
    key: string,
    title: string,
    isActive: boolean,
    onClick: () => void,
    icon: React.ReactNode
  ) => (
    <button
      key={key}
      type="button"
      title={title}
      onClick={onClick}
      className={`p-2 border rounded transition-colors ${isActive ? activeClass : idleClass}`}
    >
      {icon}
    </button>
  )

  const iconClass = 'w-4 h-4'

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {button('bold', 'Negrito', editor.isActive('bold'),
        () => editor.chain().focus().toggleBold().run(),
        <BoldIcon className={iconClass} />)}

      {button('italic', 'Itálico', editor.isActive('italic'),
        () => editor.chain().focus().toggleItalic().run(),
        <ItalicIcon className={iconClass} />)}

      {button('underline', 'Sublinhado', editor.isActive('underline'),
        () => editor.chain().focus().toggleUnderline().run(),
        <UnderlineIcon className={iconClass} />)}

      {button('strike', 'Riscado', editor.isActive('strike'),
        () => editor.chain().focus().toggleStrike().run(),
        <StrikethroughIcon className={iconClass} />)}

      <span className="w-px h-6 bg-gray-300 mx-1" />

      {[1, 2, 3].map((level) =>
        button(`h${level}`, `Título ${level}`, editor.isActive('heading', { level }),
          () => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run(),
          <span className="text-xs font-semibold px-1">H{level}</span>)
      )}

      <span className="w-px h-6 bg-gray-300 mx-1" />

      {button('bullet', 'Lista com marcadores', editor.isActive('bulletList'),
        () => editor.chain().focus().toggleBulletList().run(),
        <ListBulletIcon className={iconClass} />)}

      {button('ordered', 'Lista numerada', editor.isActive('orderedList'),
        () => editor.chain().focus().toggleOrderedList().run(),
        <NumberedListIcon className={iconClass} />)}

      <span className="w-px h-6 bg-gray-300 mx-1" />

      {button('left', 'Alinhar à esquerda', editor.isActive({ textAlign: 'left' }),
        () => editor.chain().focus().setTextAlign('left').run(),
        <Bars3BottomLeftIcon className={iconClass} />)}

      {button('center', 'Centralizar', editor.isActive({ textAlign: 'center' }),
        () => editor.chain().focus().setTextAlign('center').run(),
        <Bars3Icon className={iconClass} />)}

      {button('right', 'Alinhar à direita', editor.isActive({ textAlign: 'right' }),
        () => editor.chain().focus().setTextAlign('right').run(),
        <Bars3BottomRightIcon className={iconClass} />)}

      {button('justify', 'Justificar', editor.isActive({ textAlign: 'justify' }),
        () => editor.chain().focus().setTextAlign('justify').run(),
        <span className="text-xs font-semibold px-1">JUS</span>)}

      <span className="w-px h-6 bg-gray-300 mx-1" />

      {button('hr', 'Linha horizontal', false,
        () => editor.chain().focus().setHorizontalRule().run(),
        <MinusIcon className={iconClass} />)}

      {button('undo', 'Desfazer', false,
        () => editor.chain().focus().undo().run(),
        <ArrowUturnLeftIcon className={iconClass} />)}

      {button('redo', 'Refazer', false,
        () => editor.chain().focus().redo().run(),
        <ArrowUturnRightIcon className={iconClass} />)}
    </div>
  )
}
