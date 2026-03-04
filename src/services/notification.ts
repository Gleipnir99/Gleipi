/**
 * notification.ts — 알림 서비스
 *
 * iOS  → Capacitor LocalNotifications
 * Windows → Tauri notification plugin
 * Web  → Notification API (브라우저 권한 필요)
 */

import { getPlatform } from '../utils/platform'
import { calcReminderDate } from '../utils/date'
import type { Todo, ScheduledNotification } from '../types'

// ─── 권한 요청 ────────────────────────────────────────────────
export const requestPermission = async (): Promise<boolean> => {
  const platform = getPlatform()

  if (platform === 'ios') {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  }

  if (platform === 'windows') {
    // Tauri v2 notification 권한은 OS 레벨에서 자동 허용
    return true
  }

  // Web fallback
  if ('Notification' in window) {
    const result = await Notification.requestPermission()
    return result === 'granted'
  }

  return false
}

// ─── 알림 예약 ────────────────────────────────────────────────
export const scheduleNotification = async (
  todo: Todo,
): Promise<ScheduledNotification | null> => {
  if (!todo.time || todo.reminder.offset === 'none') return null

  const fireDate = calcReminderDate(todo.date, todo.time, todo.reminder.offset)
  if (!fireDate) return null

  const platform = getPlatform()
  const notifId = Date.now().toString()

  const title = `⏰ ${todo.title}`
  const body = todo.description ?? `${todo.time} 일정이 곧 시작됩니다.`

  try {
    if (platform === 'ios') {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.schedule({
        notifications: [
          {
            id: parseInt(notifId),
            title,
            body,
            schedule: { at: fireDate },
            sound: 'default',
            extra: { todoId: todo.id },
          },
        ],
      })
    } else if (platform === 'windows') {
      const { sendNotification } = await import('@tauri-apps/plugin-notification')
      // Tauri는 즉시 알림만 지원 → setTimeout으로 지연 발화
      const delay = fireDate.getTime() - Date.now()
      if (delay > 0) {
        setTimeout(() => sendNotification({ title, body }), delay)
      }
    }

    return {
      notificationId: notifId,
      todoId: todo.id,
      scheduledAt: fireDate.toISOString(),
    }
  } catch (err) {
    console.error('[notification] 예약 실패:', err)
    return null
  }
}

// ─── 알림 취소 ────────────────────────────────────────────────
export const cancelNotification = async (notificationId: string): Promise<void> => {
  const platform = getPlatform()

  if (platform === 'ios') {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({
      notifications: [{ id: parseInt(notificationId) }],
    })
  }
  // Windows/Web: setTimeout 기반이라 취소 ID 추적이 필요하나 Phase 3에서 고도화
}
