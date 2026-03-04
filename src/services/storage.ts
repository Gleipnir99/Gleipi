/**
 * storage.ts — 저장소 추상 레이어
 *
 * 현재: localStorage (웹/Tauri) + Capacitor Preferences (iOS)
 * 추후: 이 파일만 교체하면 Firebase / Supabase 연동 가능
 */

import { Capacitor } from '@capacitor/core'

// Capacitor Preferences는 iOS 네이티브에서만 import
// 웹/Tauri 환경에서는 localStorage fallback 사용
const isNative = Capacitor.isNativePlatform()

// ─── 동적 import로 Capacitor Preferences 로드 ─────────────────
let CapPreferences: { get: Function; set: Function; remove: Function } | null = null

if (isNative) {
  import('@capacitor/preferences').then((m) => {
    CapPreferences = m.Preferences
  })
}

// ─── 공통 인터페이스 ──────────────────────────────────────────
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      if (isNative && CapPreferences) {
        const { value } = await CapPreferences.get({ key })
        return value ? (JSON.parse(value) as T) : null
      }
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value)
    if (isNative && CapPreferences) {
      await CapPreferences.set({ key, value: serialized })
    } else {
      localStorage.setItem(key, serialized)
    }
  },

  async remove(key: string): Promise<void> {
    if (isNative && CapPreferences) {
      await CapPreferences.remove({ key })
    } else {
      localStorage.removeItem(key)
    }
  },
}

// ─── 스토리지 키 상수 ─────────────────────────────────────────
export const STORAGE_KEYS = {
  TODOS: 'gleipi:todos',
  CATEGORIES: 'gleipi:categories',
  SETTINGS: 'gleipi:settings',
} as const
