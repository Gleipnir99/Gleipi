import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { getMonthGrid, isSameDayStr, isSameMonthStr, todayStr } from '../../utils/date'
import { useTodoStore } from '../../store/todoStore'
import type { Todo } from '../../types'

interface Props {
  focusedMonth: string      // 'YYYY-MM'
  selectedDate: string      // 'YYYY-MM-DD'
  onSelectDate: (date: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function MonthView({ focusedMonth, selectedDate, onSelectDate }: Props) {
  const todos = useTodoStore((s) => s.todos)
  const today = todayStr()

  // 캘린더 그리드 날짜 배열 (앞뒤 주 포함 35~42칸)
  const grid = useMemo(() => getMonthGrid(focusedMonth), [focusedMonth])

  // 날짜별 Todo 맵 { 'YYYY-MM-DD': Todo[] }
  const todoMap = useMemo(() => {
    const map: Record<string, Todo[]> = {}
    todos.forEach((t) => {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    })
    return map
  }, [todos])

  return (
    <div className="month-view">
      {/* ── 요일 헤더 ── */}
      <div className="weekday-header">
        {WEEKDAYS.map((d) => (
          <div key={d} className="weekday-cell">{d}</div>
        ))}
      </div>

      {/* ── 날짜 그리드 ── */}
      <div className="date-grid">
        {grid.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd')
          const isCurrentMonth = isSameMonthStr(dateStr, focusedMonth)
          const isToday = dateStr === today
          const isSelected = isSameDayStr(dateStr, selectedDate)
          const dayTodos = todoMap[dateStr] ?? []
          const hasIncomplete = dayTodos.some((t) => !t.isCompleted)
          const allDone = dayTodos.length > 0 && dayTodos.every((t) => t.isCompleted)

          return (
            <button
              key={dateStr}
              className={[
                'date-cell',
                !isCurrentMonth && 'date-cell--other-month',
                isToday && 'date-cell--today',
                isSelected && 'date-cell--selected',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(dateStr)}
              aria-label={`${dateStr}${dayTodos.length ? `, 일정 ${dayTodos.length}개` : ''}`}
            >
              <span className="date-number">{format(date, 'd')}</span>

              {/* 일정 도트 표시 */}
              {dayTodos.length > 0 && (
                <div className="date-dots">
                  {dayTodos.slice(0, 3).map((t, i) => (
                    <span
                      key={i}
                      className={`date-dot ${t.isCompleted ? 'date-dot--done' : ''}`}
                    />
                  ))}
                  {dayTodos.length > 3 && <span className="date-dot-more">+</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
