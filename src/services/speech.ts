/**
 * speech.ts — 음성인식 서비스 (iOS 전용)
 *
 * Web Speech API 기반으로 시작.
 * 추후 OpenAI Whisper API로 교체 시 이 파일만 수정.
 */

import { isSpeechAvailable } from '../utils/platform'

export interface SpeechResult {
  transcript: string
  confidence: number
}

// ─── 음성인식 클래스 래퍼 ─────────────────────────────────────
class SpeechService {
  private recognition: SpeechRecognition | null = null
  private isListening = false

  constructor() {
    if (!isSpeechAvailable()) return

    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return

    this.recognition = new SR()
    this.recognition.lang = 'ko-KR'
    this.recognition.continuous = false
    this.recognition.interimResults = false
    this.recognition.maxAlternatives = 1
  }

  // ─── 인식 시작 ───────────────────────────────────────────────
  start(): Promise<SpeechResult> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('음성인식을 사용할 수 없는 환경입니다.'))
        return
      }
      if (this.isListening) {
        reject(new Error('이미 음성인식 중입니다.'))
        return
      }

      this.isListening = true

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[0][0]
        resolve({
          transcript: result.transcript,
          confidence: result.confidence,
        })
      }

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        reject(new Error(`음성인식 오류: ${event.error}`))
      }

      this.recognition.onend = () => {
        this.isListening = false
      }

      this.recognition.start()
    })
  }

  // ─── 인식 중단 ───────────────────────────────────────────────
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  get available(): boolean {
    return this.recognition !== null
  }

  get listening(): boolean {
    return this.isListening
  }
}

// ─── 음성 텍스트 파싱 ─────────────────────────────────────────
// "내일 오후 3시 팀 회의 업무 카테고리로 추가해줘" 같은 자연어를 파싱
export interface ParsedSchedule {
  title: string
  date?: string       // 'YYYY-MM-DD'
  time?: string       // 'HH:mm'
  categoryHint?: string
}

export const parseVoiceInput = (transcript: string): ParsedSchedule => {
  const now = new Date()
  let date: string | undefined
  let time: string | undefined
  let text = transcript

  // ─ 날짜 파싱
  if (/오늘/.test(text)) {
    date = now.toISOString().slice(0, 10)
    text = text.replace(/오늘/, '')
  } else if (/내일/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 1)
    date = d.toISOString().slice(0, 10)
    text = text.replace(/내일/, '')
  } else if (/모레/.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 2)
    date = d.toISOString().slice(0, 10)
    text = text.replace(/모레/, '')
  }

  // ─ 시간 파싱 (오전/오후 N시 M분)
  const timeMatch = text.match(/(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/)
  if (timeMatch) {
    let hour = parseInt(timeMatch[2])
    const min = parseInt(timeMatch[3] ?? '0')
    if (timeMatch[1] === '오후' && hour < 12) hour += 12
    if (timeMatch[1] === '오전' && hour === 12) hour = 0
    time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
    text = text.replace(timeMatch[0], '')
  }

  // ─ 카테고리 힌트
  const categoryMatch = text.match(/(\S+)\s*카테고리/)
  const categoryHint = categoryMatch?.[1]
  if (categoryMatch) text = text.replace(categoryMatch[0], '')

  // ─ 불필요한 종결어 제거
  text = text.replace(/(으?로\s*)?(추가|등록)(해줘|해|해줘요|해주세요)?\.?$/g, '').trim()

  return { title: text.trim(), date, time, categoryHint }
}

export const speechService = new SpeechService()
