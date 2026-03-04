/**
 * notification.ts — 웹 Notification API 기반
 * Tauri 의존성 제거
 */

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function scheduleNotification(
  id: string,
  title: string,
  body: string,
  scheduledAt: Date,
): Promise<void> {
  if (Notification.permission !== 'granted') return
  const delay = scheduledAt.getTime() - Date.now()
  if (delay <= 0) return
  setTimeout(() => {
    new Notification(title, { body, icon: '/favicon.ico' })
  }, delay)
}

export async function cancelNotification(_id: string): Promise<void> {
  // 웹에서는 개별 취소 불가 — setTimeout 기반이라 생략
}
