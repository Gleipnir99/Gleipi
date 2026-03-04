import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import { storage, STORAGE_KEYS } from '../services/storage'
import type { Category } from '../types'

// ─── 기본 카테고리 ────────────────────────────────────────────
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'default-work',     name: '업무',   color: '#8FA3C8', icon: 'work',     createdAt: new Date().toISOString() },
  { id: 'default-personal', name: '개인',   color: '#C9A84C', icon: 'personal', createdAt: new Date().toISOString() },
  { id: 'default-health',   name: '건강',   color: '#7DAD74', icon: 'health',   createdAt: new Date().toISOString() },
  { id: 'default-study',    name: '공부',   color: '#A889C0', icon: 'study',   createdAt: new Date().toISOString() },
]

// ─── 스토어 타입 ──────────────────────────────────────────────
interface CategoryStore {
  categories: Category[]

  // CRUD
  addCategory: (input: Omit<Category, 'id' | 'createdAt'>) => Category
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id' | 'createdAt'>>) => void
  deleteCategory: (id: string) => void

  // 조회
  getCategoryById: (id: string) => Category | undefined

  // 초기화 (AsyncStorage → 스토어)
  hydrate: () => Promise<void>
}

// ─── 스토어 구현 ──────────────────────────────────────────────
export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,

      addCategory: (input) => {
        const newCat: Category = {
          ...input,
          id: uuid(),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ categories: [...s.categories, newCat] }))
        return newCat
      },

      updateCategory: (id, patch) => {
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }))
      },

      deleteCategory: (id) => {
        // 기본 카테고리는 삭제 불가
        if (id.startsWith('default-')) return
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
      },

      getCategoryById: (id) => get().categories.find((c) => c.id === id),

      hydrate: async () => {
        const saved = await storage.get<Category[]>(STORAGE_KEYS.CATEGORIES)
        if (saved && saved.length > 0) {
          set({ categories: saved })
        }
      },
    }),
    {
      name: STORAGE_KEYS.CATEGORIES,
      // Zustand persist는 localStorage 기반 → 네이티브에서는 hydrate()로 직접 로드
    },
  ),
)
