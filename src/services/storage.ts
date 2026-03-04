/**
 * storage.ts — 웹/GitHub Pages 전용 localStorage 기반 저장소
 * Capacitor 의존성 제거
 */

export const STORAGE_KEYS = {
  TODOS:      'gleipi:todos',
  CATEGORIES: 'gleipi:categories',
  SETTINGS:   'gleipi:settings',
} as const

export const storage = {
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key)
  },
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  },
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key)
  },
}
