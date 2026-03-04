import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  differenceInMinutes,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import type { ReminderOffset } from '../types'

// ─── 포맷 헬퍼 ───────────────────────────────────────────────
export const formatDate = (date: string | Date): string =>
  format(typeof date === 'string' ? parseISO(date) : date, 'yyyy-MM-dd')

export const formatDisplayDate = (date: string | Date): string =>
  format(typeof date === 'string' ? parseISO(date) : date, 'M월 d일 (EEE)', { locale: ko })

export const formatDisplayMonth = (yearMonth: string): string =>
  format(parseISO(`${yearMonth}-01`), 'yyyy년 M월', { locale: ko })

export const formatTime = (time: string): string => {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? '오전' : '오후'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${period} ${hour}:${m.toString().padStart(2, '0')}`
}

// ─── 상대 날짜 표시 ──────────────────────────────────────────
export const getRelativeLabel = (dateStr: string): string => {
  const d = parseISO(dateStr)
  if (isToday(d)) return '오늘'
  if (isTomorrow(d)) return '내일'
  if (isYesterday(d)) return '어제'
  return formatDisplayDate(dateStr)
}

// ─── 현재 날짜/월 ────────────────────────────────────────────
export const todayStr = (): string => formatDate(new Date())
export const currentMonthStr = (): string => format(new Date(), 'yyyy-MM')

// ─── 캘린더 그리드 (월 뷰) ───────────────────────────────────
// 해당 월의 캘린더에 표시될 날짜 배열 반환 (앞뒤 주 포함)
export const getMonthGrid = (yearMonth: string): Date[] => {
  const base = parseISO(`${yearMonth}-01`)
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(base), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(base), { weekStartsOn: 0 }),
  })
}

// ─── 주 뷰 날짜 배열 ─────────────────────────────────────────
export const getWeekDays = (dateStr: string): Date[] => {
  const base = parseISO(dateStr)
  return eachDayOfInterval({
    start: startOfWeek(base, { weekStartsOn: 0 }),
    end: endOfWeek(base, { weekStartsOn: 0 }),
  })
}

// ─── 네비게이션 헬퍼 ─────────────────────────────────────────
export const navigate = {
  prevMonth: (ym: string) => format(subMonths(parseISO(`${ym}-01`), 1), 'yyyy-MM'),
  nextMonth: (ym: string) => format(addMonths(parseISO(`${ym}-01`), 1), 'yyyy-MM'),
  prevWeek: (d: string) => formatDate(subWeeks(parseISO(d), 1)),
  nextWeek: (d: string) => formatDate(addWeeks(parseISO(d), 1)),
  prevDay: (d: string) => formatDate(subDays(parseISO(d), 1)),
  nextDay: (d: string) => formatDate(addDays(parseISO(d), 1)),
}

// ─── 비교 헬퍼 ───────────────────────────────────────────────
export const isSameDayStr = (a: string, b: string): boolean =>
  isSameDay(parseISO(a), parseISO(b))

export const isSameMonthStr = (dateStr: string, yearMonth: string): boolean =>
  isSameMonth(parseISO(dateStr), parseISO(`${yearMonth}-01`))

// ─── 알림 발화 시각 계산 ──────────────────────────────────────
// date: 'YYYY-MM-DD', time: 'HH:mm', offset: ReminderOffset
// → 알림을 보낼 Date 반환 (과거면 null)
export const calcReminderDate = (
  date: string,
  time: string,
  offset: ReminderOffset,
): Date | null => {
  if (offset === 'none') return null

  const base = parseISO(`${date}T${time}:00`)
  const offsetMap: Record<Exclude<ReminderOffset, 'none'>, number> = {
    '10min': 10,
    '30min': 30,
    '1hour': 60,
    '1day': 1440,
  }
  const reminderDate = addDays(base, 0) // clone
  reminderDate.setMinutes(reminderDate.getMinutes() - offsetMap[offset as keyof typeof offsetMap])

  return differenceInMinutes(reminderDate, new Date()) > 0 ? reminderDate : null
}
