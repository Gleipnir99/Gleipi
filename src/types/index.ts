// ─── Platform ───────────────────────────────────────────────
export type Platform = 'ios' | 'windows' | 'web'

// ─── Category ───────────────────────────────────────────────
export interface Category {
  id: string
  name: string
  color: string       // hex e.g. '#FF6B6B'
  icon: string        // emoji e.g. '💼'
  createdAt: string   // ISO 8601
}

// ─── Reminder ───────────────────────────────────────────────
export type ReminderOffset = 'none' | '10min' | '30min' | '1hour' | '1day'

export interface ReminderConfig {
  offset: ReminderOffset
  notificationId?: string   // Capacitor / Tauri 알림 ID (발행 후 채워짐)
}

// ─── Todo ───────────────────────────────────────────────────
export type TodoPriority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  description?: string
  date: string              // 'YYYY-MM-DD'
  time?: string             // 'HH:mm'  (없으면 종일)
  categoryId: string
  priority: TodoPriority
  isCompleted: boolean
  reminder: ReminderConfig
  tags: string[]            // 자유 태그 배열
  createdAt: string
  updatedAt: string
}

// ─── Form / Input ────────────────────────────────────────────
// 새 Todo 생성 시 사용하는 입력 타입 (id, createdAt 등은 자동 생성)
export type TodoInput = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>

// ─── Calendar ───────────────────────────────────────────────
export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarState {
  view: CalendarView
  selectedDate: string      // 'YYYY-MM-DD'
  focusedMonth: string      // 'YYYY-MM'
}

// ─── Filter / Sort ───────────────────────────────────────────
export type SortKey = 'date' | 'priority' | 'createdAt'
export type SortDir = 'asc' | 'desc'

export interface TodoFilter {
  categoryId?: string       // undefined = 전체
  priority?: TodoPriority
  isCompleted?: boolean
  tags?: string[]
  keyword?: string          // 제목/설명 검색
  sortKey: SortKey
  sortDir: SortDir
}

// ─── Notification ────────────────────────────────────────────
export interface ScheduledNotification {
  notificationId: string
  todoId: string
  scheduledAt: string       // ISO 8601
}
