import { useCategoryStore } from '../../store/categoryStore'
import { getRelativeLabel, formatTime } from '../../utils/date'
import CategoryIcon, { getCategoryIconKey } from '../CategoryIcon'
import type { Todo } from '../../types'

interface Props {
  todo: Todo
  onToggle: (id: string) => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => Promise<void>
}

const PRIORITY_STYLE = {
  high:   { label: '높음', color: '#C8A8A8' },
  medium: { label: '중간', color: '#C9A84C' },
  low:    { label: '낮음', color: '#7DAD74' },
}

export default function TodoItem({ todo, onToggle, onEdit, onDelete }: Props) {
  const getCategoryById = useCategoryStore((s) => s.getCategoryById)
  const category = getCategoryById(todo.categoryId)
  const priority = PRIORITY_STYLE[todo.priority]
  const iconKey  = getCategoryIconKey(todo.categoryId)

  return (
    <div
      className={`todo-item ${todo.isCompleted ? 'todo-item--done' : ''}`}
      style={{ borderLeft: `3px solid ${category?.color ?? '#C2CEEA'}` }}
    >
      {/* ── 체크박스 ── */}
      <button className="todo-check" onClick={() => onToggle(todo.id)} aria-label={todo.isCompleted ? '완료 취소' : '완료'}>
        {todo.isCompleted
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7DAD74" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2CEEA" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
        }
      </button>

      {/* ── 내용 ── */}
      <div className="todo-body" onClick={() => onEdit(todo)}>
        <p className={`todo-title ${todo.isCompleted ? 'line-through' : ''}`}>
          {todo.title}
        </p>
        <div className="todo-meta">
          {category && (
            <span className="meta-tag" style={{ color: category.color, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CategoryIcon iconKey={iconKey} size={12} color={category.color} />
              {category.name}
            </span>
          )}
          <span className="meta-date">{getRelativeLabel(todo.date)}</span>
          {todo.time && <span className="meta-time">{formatTime(todo.time)}</span>}
          <span className="meta-priority" style={{ color: priority.color }}>
            ● {priority.label}
          </span>
        </div>
        {todo.tags.length > 0 && (
          <div className="todo-tags">
            {todo.tags.map((tag) => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── 삭제 ── */}
      <button className="todo-delete" onClick={() => onDelete(todo.id)} aria-label="삭제">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    </div>
  )
}
