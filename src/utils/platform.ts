import { Capacitor } from '@capacitor/core'
import type { Platform } from '../types'

// ─── 플랫폼 감지 ─────────────────────────────────────────────
// Capacitor 네이티브 → 'ios'
// Tauri (window.__TAURI__) → 'windows'
// 그 외 브라우저 → 'web'
export const getPlatform = (): Platform => {
  if (Capacitor.isNativePlatform()) return 'ios'
  if (typeof window !== 'undefined' && '__TAURI__' in window) return 'windows'
  return 'web'
}

export const isIOS = (): boolean => getPlatform() === 'ios'
export const isWindows = (): boolean => getPlatform() === 'windows'

// 음성인식은 iOS 전용
export const isSpeechAvailable = (): boolean =>
  isIOS() || (typeof window !== 'undefined' && 'SpeechRecognition' in window)
