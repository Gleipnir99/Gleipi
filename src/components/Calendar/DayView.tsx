import { useMemo } from 'react'
import { formatDisplayDate, formatTime } from '../../utils/date'
import { useTodoStore } from '../../store/todoStore'
import { useCategoryStore } from '../../store/categoryStore'

interface Props {
  selectedDate: string
  onAddTodo?: (date: string, time?: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function DayView({ selectedDate, onAddTodo }: Props) {
  const todos = useTodoStore((s) => s.getTodosByDate(selectedDate))
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const getCategoryById = useCategoryStore((s) => s.getCategoryById)

  // 시간 있는 것 / 종일 분리
  const timedTodos = useMemo(
    () => todos.filter((t) => t.time).sort((a, b) => (a.time! > b.time! ? 1 : -1)),
    [todos],
  )
  const allDayTodos = useMemo(() => todos.filter((t) => !t.time), [todos])

  return (
    <div className="day-view">
      {/* ── 날짜 헤더 ── */}
      <div className="day-header">
        <h2 className="day-title">{formatDisplayDate(selectedDate)}</h2>
        <span className="day-count">{todos.length}개 일정</span>
      </div>

      {/* ── 종일 일정 ── */}
      {allDayTodos.length > 0 && (
        <div className="allday-section">
          <span className="allday-label">종일</span>
          <div className="allday-events">
            {allDayTodos.map((t) => {
              const cat = getCategoryById(t.categoryId)
              return (
                <div
                  key={t.id}
                  className={`allday-event ${t.isCompleted ? 'allday-event--done' : ''}`}
                  style={{ background: `${cat?.color}22`, borderLeft: `3px solid ${cat?.color}` }}
                  onClick={() => toggleComplete(t.id)}
                >
                  {t.title}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 시간대 그리드 ── */}
      <div className="day-grid-scroll">
        <div className="day-grid">
          {HOURS.map((hour) => {
            const hourTodos = timedTodos.filter(
              (t) => parseInt(t.time!.split(':')[0]) === hour,
            )

            return (
              <div key={hour} className="day-hour-row">
                <div className="day-time-label">
                  {hour === 0 ? '자정' : hour === 12 ? '정오' : `${hour}:00`}
                </div>
                <div
                  className="day-hour-cell"
                  onClick={() =>
                    onAddTodo?.(selectedDate, `${hour.toString().padStart(2, '0')}:00`)
                  }
                >
                  {hourTodos.map((t) => {
                    const cat = getCategoryById(t.categoryId)
                    return (
                      <div
                        key={t.id}
                        className={`day-event ${t.isCompleted ? 'day-event--done' : ''}`}
                        style={{ borderLeft: `4px solid ${cat?.color ?? '#4F8EF7'}` }}
                        onClick={(e) => { e.stopPropagation(); toggleComplete(t.id) }}
                      >
                        <div className="day-event-header">
                          <span className="day-event-time">{formatTime(t.time!)}</span>
                          <span
                            className="day-event-cat"
                            style={{ color: cat?.color }}
                          >
                            {cat?.icon}
                          </span>
                        </div>
                        <p className="day-event-title">{t.title}</p>
                        {t.description && (
                          <p className="day-event-desc">{t.description}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
