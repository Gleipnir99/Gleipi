import { useState } from 'react'
import { useCalendarStore } from '../store/calendarStore'
import { navigate, formatDisplayMonth, formatDisplayDate } from '../utils/date'
import MonthView from '../components/Calendar/MonthView'
import WeekView from '../components/Calendar/WeekView'
import DayView from '../components/Calendar/DayView'
import TodoFormModal from '../components/TodoFormModal/TodoFormModal'
import type { CalendarView } from '../types'

const VIEW_LABELS: Record<CalendarView, string> = { month: '월', week: '주', day: '일' }

export default function CalendarScreen() {
  const { view, selectedDate, focusedMonth, setView, setSelectedDate, setFocusedMonth } =
    useCalendarStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState<string | undefined>()

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    if (view === 'month') setView('day')
  }

  const handleAddTodo = (date: string) => {
    setModalDate(date); setModalOpen(true)
  }

  const handlePrev = () => {
    if (view === 'month') setFocusedMonth(navigate.prevMonth(focusedMonth))
    else if (view === 'week') setSelectedDate(navigate.prevWeek(selectedDate))
    else setSelectedDate(navigate.prevDay(selectedDate))
  }

  const handleNext = () => {
    if (view === 'month') setFocusedMonth(navigate.nextMonth(focusedMonth))
    else if (view === 'week') setSelectedDate(navigate.nextWeek(selectedDate))
    else setSelectedDate(navigate.nextDay(selectedDate))
  }

  const headerTitle =
    view === 'month' ? formatDisplayMonth(focusedMonth)
    : view === 'week' ? `${formatDisplayDate(selectedDate)} 주`
    : formatDisplayDate(selectedDate)

  return (
    <div className="screen calendar-screen">
      <header className="screen-header">
        <div className="cal-nav">
          <button className="btn-icon" onClick={handlePrev}>‹</button>
          <h1 className="screen-title">{headerTitle}</h1>
          <button className="btn-icon" onClick={handleNext}>›</button>
        </div>
        <div className="view-tabs">
          {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
            <button key={v} className={`view-tab ${view === v ? 'view-tab--active' : ''}`} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </header>

      <div className="cal-body">
        {view === 'month' && <MonthView focusedMonth={focusedMonth} selectedDate={selectedDate} onSelectDate={handleSelectDate} />}
        {view === 'week' && <WeekView selectedDate={selectedDate} onSelectDate={handleSelectDate} />}
        {view === 'day'  && <DayView selectedDate={selectedDate} onAddTodo={handleAddTodo} />}
      </div>

      <button className="fab" onClick={() => handleAddTodo(selectedDate)} aria-label="일정 추가">+</button>

      {modalOpen && (
        <TodoFormModal defaultDate={modalDate} onClose={() => { setModalOpen(false); setModalDate(undefined) }} />
      )}
    </div>
  )
}
