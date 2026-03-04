/**
 * tts.ts — TTS + 호출어 감지 + 음성 명령 처리
 * "글레이피" 호출 → 음성 입력 대기 → AI 처리 → TTS 응답
 */

import type { Todo } from '../types'

// ── TTS ──────────────────────────────────────────────────────
class TTSService {
  private synth = window.speechSynthesis

  isSupported() { return 'speechSynthesis' in window }

  speak(text: string, rate = 0.95): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) { reject(new Error('not supported')); return }
      this.synth.cancel()

      const utt = new SpeechSynthesisUtterance(text)
      utt.lang   = 'ko-KR'
      utt.rate   = rate
      utt.pitch  = 1.0
      utt.volume = 1.0

      // 목소리 로드 대기
      const setVoice = () => {
        const voices = this.synth.getVoices()
        const ko = voices.find(v => v.lang.startsWith('ko'))
        if (ko) utt.voice = ko
      }
      setVoice()
      if (this.synth.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoice
      }

      utt.onend   = () => resolve()
      utt.onerror = (e) => reject(e)
      this.synth.speak(utt)
    })
  }

  stop() { this.synth.cancel() }
  isSpeaking() { return this.synth.speaking }
}

export const ttsService = new TTSService()

// ── 브리핑 텍스트 ─────────────────────────────────────────────
export function buildDailyBriefing(todos: Todo[], today: string): string {
  const todayTodos = todos
    .filter(t => t.date === today && !t.isCompleted)
    .sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time > b.time ? 1 : -1
    })

  if (todayTodos.length === 0) {
    return '안녕하세요. 오늘은 등록된 일정이 없습니다. 좋은 하루 되세요.'
  }

  const nums = ['첫','두','세','네','다섯','여섯','일곱','여덟','아홉','열']
  const parts = [`안녕하세요. 오늘 일정은 총 ${todayTodos.length}개입니다.`]

  todayTodos.forEach((t, i) => {
    const num = nums[i] ?? `${i+1}번째`
    const timeStr = t.time ? `${formatKoreanTime(t.time)}에 ` : ''
    parts.push(`${num}번째, ${timeStr}${t.title}.`)
  })

  parts.push('오늘도 화이팅입니다.')
  return parts.join(' ')
}

export function formatKoreanTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? '오전' : '오후'
  const hour   = h % 12 === 0 ? 12 : h % 12
  const min    = m > 0 ? ` ${m}분` : ''
  return `${period} ${hour}시${min}`
}

// ── 하루 1회 브리핑 상태 ──────────────────────────────────────
const BRIEFING_KEY = 'gleipi:briefing_date'
const RESET_HOUR   = 6

function getBriefingResetDate(): string {
  const now = new Date()
  if (now.getHours() < RESET_HOUR) {
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }
  return now.toISOString().split('T')[0]
}

export function hasDoneBriefingToday(): boolean {
  return localStorage.getItem(BRIEFING_KEY) === getBriefingResetDate()
}

export function markBriefingDone(): void {
  localStorage.setItem(BRIEFING_KEY, getBriefingResetDate())
}

export function resetBriefingIfNeeded(): void {
  const stored = localStorage.getItem(BRIEFING_KEY)
  if (stored !== getBriefingResetDate()) localStorage.removeItem(BRIEFING_KEY)
}

// ── 호출어 + 명령 감지 서비스 ────────────────────────────────
export type VoiceCommandCallback = (transcript: string) => void

export type WakeState = 'idle' | 'listening' | 'processing'

class WakeWordService {
  private recognition:   SpeechRecognition | null = null
  private cmdRecognition: SpeechRecognition | null = null
  private active        = false
  private restartTimer: ReturnType<typeof setTimeout> | null = null

  // 외부에서 주입하는 콜백
  onWakeStateChange: ((state: WakeState) => void) | null = null
  onCommand:         VoiceCommandCallback | null = null

  isSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }

  private getSR() {
    return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  }

  // ── 호출어 감지 루프 시작 ──────────────────────────────────
  start() {
    if (!this.isSupported() || this.active) return
    this.active = true
    this._listenForWakeWord()
  }

  private _listenForWakeWord() {
    if (!this.active) return
    const SR = this.getSR()
    this.recognition = new SR()
    const r = this.recognition!

    r.lang           = 'ko-KR'
    r.continuous     = true
    r.interimResults = true
    r.maxAlternatives = 3

    r.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.replace(/\s/g, '').toLowerCase()
        const triggers = ['글레이피', '글레피', '글래이피', '그레이피', 'gleipi', '글레이비']
        if (triggers.some(t => transcript.includes(t))) {
          // 호출어 감지! → 명령 듣기 모드로 전환
          this.recognition?.stop()
          this._listenForCommand()
          break
        }
      }
    }

    r.onend = () => {
      if (this.active) {
        this.restartTimer = setTimeout(() => this._listenForWakeWord(), 300)
      }
    }

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'not-allowed') { this.active = false; return }
      if (this.active) {
        this.restartTimer = setTimeout(() => this._listenForWakeWord(), 1000)
      }
    }

    try { r.start() } catch {}
  }

  // ── 명령 듣기 (호출어 후 3초) ────────────────────────────
  private _listenForCommand() {
    this.onWakeStateChange?.('listening')
    ttsService.speak('네, 말씀하세요.', 1.1).then(() => {
      const SR = this.getSR()
      this.cmdRecognition = new SR()
      const r = this.cmdRecognition!

      r.lang           = 'ko-KR'
      r.continuous     = false
      r.interimResults = false
      r.maxAlternatives = 1

      r.onresult = (event: SpeechRecognitionEvent) => {
        const cmd = event.results[0][0].transcript
        this.onWakeStateChange?.('processing')
        this.onCommand?.(cmd)
      }

      r.onend = () => {
        // 명령 없이 끝나면 다시 호출어 대기
        setTimeout(() => {
          this.onWakeStateChange?.('idle')
          if (this.active) this._listenForWakeWord()
        }, 500)
      }

      r.onerror = () => {
        this.onWakeStateChange?.('idle')
        if (this.active) this._listenForWakeWord()
      }

      try { r.start() } catch {
        this.onWakeStateChange?.('idle')
        if (this.active) this._listenForWakeWord()
      }
    })
  }

  stop() {
    this.active = false
    if (this.restartTimer) clearTimeout(this.restartTimer)
    this.recognition?.stop()
    this.cmdRecognition?.stop()
  }

  isActive() { return this.active }
}

export const wakeWordService = new WakeWordService()
