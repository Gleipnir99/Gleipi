import { create } from 'zustand'
import { todayStr, currentMonthStr } from '../utils/date'
import type { CalendarView, CalendarState } from '../types'

interface CalendarStore extends CalendarState {
  setView: (view: CalendarView) => void
  setSelectedDate: (date: string) => void
  setFocusedMonth: (month: string) => void
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  view: 'month',
  selectedDate: todayStr(),
  focusedMonth: currentMonthStr(),

  setView: (view) => set({ view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setFocusedMonth: (focusedMonth) => set({ focusedMonth }),
}))
