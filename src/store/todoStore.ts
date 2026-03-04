import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import { storage, STORAGE_KEYS } from '../services/storage'
import { scheduleNotification, cancelNotification } from '../services/notification'
import { todayStr } from '../utils/date'
import type { Todo, TodoInput, TodoFilter, SortKey } from '../types'

// ─── 스토어 타입 ──────────────────────────────────────────────
interface TodoStore {
  todos: Todo[]
  filter: TodoFilter

  // ── CRUD ──────────────────────────────────────────────────
  addTodo: (input: TodoInput) => Promise<Todo>
  updateTodo: (id: string, patch: Partial<TodoInput>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  toggleComplete: (id: string) => void

  // ── 조회 ──────────────────────────────────────────────────
  getTodoById: (id: string) => Todo | undefined
  getTodosByDate: (date: string) => Todo[]
  getFilteredTodos: () => Todo[]

  // ── 필터 ──────────────────────────────────────────────────
  setFilter: (patch: Partial<TodoFilter>) => void
  resetFilter: () => void

  // ── 초기화 ───────────────────────────────────────────────
  hydrate: () => Promise<void>
}

// ─── 기본 필터 ────────────────────────────────────────────────
const DEFAULT_FILTER: TodoFilter = {
  sortKey: 'date',
  sortDir: 'asc',
}

// ─── 정렬 함수 ────────────────────────────────────────────────
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const sortTodos = (todos: Todo[], key: SortKey, dir: 'asc' | 'desc'): Todo[] => {
  const sorted = [...todos].sort((a, b) => {
    let cmp = 0
    if (key === 'date') {
      cmp = `${a.date}${a.time ?? '99:99'}`.localeCompare(`${b.date}${b.time ?? '99:99'}`)
    } else if (key === 'priority') {
      cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    } else if (key === 'createdAt') {
      cmp = a.createdAt.localeCompare(b.createdAt)
    }
    return dir === 'asc' ? cmp : -cmp
  })
  return sorted
}

// ─── 스토어 구현 ──────────────────────────────────────────────
export const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      todos: [],
      filter: DEFAULT_FILTER,

      // ── addTodo ─────────────────────────────────────────────
      addTodo: async (input) => {
        const now = new Date().toISOString()
        const newTodo: Todo = {
          ...input,
          id: uuid(),
          createdAt: now,
          updatedAt: now,
        }

        set((s) => ({ todos: [...s.todos, newTodo] }))

        // 알림 예약
        if (newTodo.time && newTodo.reminder.offset !== 'none') {
          const notif = await scheduleNotification(newTodo)
          if (notif) {
            set((s) => ({
              todos: s.todos.map((t) =>
                t.id === newTodo.id
                  ? { ...t, reminder: { ...t.reminder, notificationId: notif.notificationId } }
                  : t,
              ),
            }))
          }
        }

        return newTodo
      },

      // ── updateTodo ──────────────────────────────────────────
      updateTodo: async (id, patch) => {
        const existing = get().getTodoById(id)
        if (!existing) return

        // 기존 알림 취소
        if (existing.reminder.notificationId) {
          await cancelNotification(existing.reminder.notificationId)
        }

        const updated: Todo = {
          ...existing,
          ...patch,
          id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
          reminder: { ...(patch.reminder ?? existing.reminder), notificationId: undefined },
        }

        set((s) => ({ todos: s.todos.map((t) => (t.id === id ? updated : t)) }))

        // 새 알림 예약
        if (updated.time && updated.reminder.offset !== 'none') {
          const notif = await scheduleNotification(updated)
          if (notif) {
            set((s) => ({
              todos: s.todos.map((t) =>
                t.id === id
                  ? { ...t, reminder: { ...t.reminder, notificationId: notif.notificationId } }
                  : t,
              ),
            }))
          }
        }
      },

      // ── deleteTodo ──────────────────────────────────────────
      deleteTodo: async (id) => {
        const todo = get().getTodoById(id)
        if (todo?.reminder.notificationId) {
          await cancelNotification(todo.reminder.notificationId)
        }
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }))
      },

      // ── toggleComplete ──────────────────────────────────────
      toggleComplete: (id) => {
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id
              ? { ...t, isCompleted: !t.isCompleted, updatedAt: new Date().toISOString() }
              : t,
          ),
        }))
      },

      // ── 조회 ────────────────────────────────────────────────
      getTodoById: (id) => get().todos.find((t) => t.id === id),

      getTodosByDate: (date) =>
        get().todos.filter((t) => t.date === date),

      getFilteredTodos: () => {
        const { todos, filter } = get()
        let result = [...todos]

        if (filter.categoryId) result = result.filter((t) => t.categoryId === filter.categoryId)
        if (filter.priority) result = result.filter((t) => t.priority === filter.priority)
        if (filter.isCompleted !== undefined) result = result.filter((t) => t.isCompleted === filter.isCompleted)
        if (filter.tags?.length) result = result.filter((t) => filter.tags!.some((tag) => t.tags.includes(tag)))
        if (filter.keyword) {
          const kw = filter.keyword.toLowerCase()
          result = result.filter((t) => t.title.toLowerCase().includes(kw) || t.description?.toLowerCase().includes(kw))
        }

        return sortTodos(result, filter.sortKey, filter.sortDir)
      },

      // ── 필터 ────────────────────────────────────────────────
      setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
      resetFilter: () => set({ filter: DEFAULT_FILTER }),

      // ── hydrate ─────────────────────────────────────────────
      hydrate: async () => {
        const saved = await storage.get<Todo[]>(STORAGE_KEYS.TODOS)
        if (saved && saved.length > 0) {
          set({ todos: saved })
        }
      },
    }),
    {
      name: STORAGE_KEYS.TODOS,
    },
  ),
)
