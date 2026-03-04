import { useMemo } from 'react'
import { format } from 'date-fns'
import { getWeekDays, todayStr, formatTime } from '../../utils/date'
import { useTodoStore } from '../../store/todoStore'
import { useCategoryStore } from '../../store/categoryStore'

interface Props {
  selectedDate: string
  onSelectDate: (date: string) => void
}

// 시간 슬롯: 0~23시
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEKDAYS_SHORT = ['일', '월', '화', '수', '목', '금', '토']

export default function WeekView({ selectedDate, onSelectDate }: Props) {
  const todos = useTodoStore((s) => s.todos)
  const getCategoryById = useCategoryStore((s) => s.getCategoryById)
  const today = todayStr()
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])

  // 날짜+시간 기준 Todo 맵
  const todoMap = useMemo(() => {
    const map: Record<string, typeof todos> = {}
    todos.forEach((t) => {
      const key = t.date
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [todos])

  return (
    <div className="week-view">
      {/* ── 날짜 헤더 ── */}
      <div className="week-header">
        <div className="time-gutter" /> {/* 시간축 공간 */}
        {weekDays.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd')
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={dateStr}
              className={[
                'week-day-header',
                isToday && 'week-day-header--today',
                isSelected && 'week-day-header--selected',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="week-day-name">{WEEKDAYS_SHORT[date.getDay()]}</span>
              <span className="week-day-num">{format(date, 'd')}</span>
            </button>
          )
        })}
      </div>

      {/* ── 시간 그리드 ── */}
      <div className="week-grid-scroll">
        <div className="week-grid">
          {HOURS.map((hour) => (
            <div key={hour} className="hour-row">
              {/* 시간 레이블 */}
              <div className="time-label">
                {hour === 0 ? '' : `${hour}:00`}
              </div>

              {/* 각 날짜 셀 */}
              {weekDays.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const dayTodos = (todoMap[dateStr] ?? []).filter((t) => {
                  if (!t.time) return false
                  return parseInt(t.time.split(':')[0]) === hour
                })

                return (
                  <div key={dateStr} className="week-cell">
                    {dayTodos.map((t) => {
                      const cat = getCategoryById(t.categoryId)
                      return (
                        <div
                          key={t.id}
                          className={`week-event ${t.isCompleted ? 'week-event--done' : ''}`}
                          style={{ borderLeft: `3px solid ${cat?.color ?? '#4F8EF7'}` }}
                          title={t.title}
                        >
                          <span className="week-event-time">{t.time && formatTime(t.time)}</span>
                          <span className="week-event-title">{t.title}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
