// tts.ts에서 import 순환 방지용 분리 헬퍼
export { todayStr } from '../utils/date'

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? '오전' : '오후'
  const hour   = h % 12 === 0 ? 12 : h % 12
  const min    = m > 0 ? ` ${m}분` : ''
  return `${period} ${hour}시${min}`
}
