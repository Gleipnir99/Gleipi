/**
 * ai.ts — Claude API 연동 서비스
 *
 * API 키는 앱 설정에서 입력 → localStorage에 암호화 없이 저장 (로컬 전용)
 * 모든 AI 기능의 단일 진입점
 */

import type { Todo } from '../types'

const API_KEY_STORAGE = 'gleipi:claude_api_key'
const MODEL = 'claude-sonnet-4-5'

// ── API 키 관리 ──────────────────────────────────────────────
export const getApiKey = (): string | null => localStorage.getItem(API_KEY_STORAGE)
export const setApiKey = (key: string): void => localStorage.setItem(API_KEY_STORAGE, key)
export const clearApiKey = (): void => localStorage.removeItem(API_KEY_STORAGE)
export const hasApiKey = (): boolean => !!getApiKey()

// ── 기본 Claude 호출 ─────────────────────────────────────────
// API 키 종류 감지
function detectKeyType(key: string): 'claude' | 'gemini' | 'unknown' {
  if (key.startsWith('sk-ant')) return 'claude'
  if (key.startsWith('AIza'))  return 'gemini'
  return 'unknown'
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('API_KEY_MISSING')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ────────────────────────────────────────────────────────────
// 1. 음성 자연어 → 일정 파싱
// ────────────────────────────────────────────────────────────
export interface ParsedTodo {
  title: string
  date: string       // YYYY-MM-DD
  time?: string      // HH:mm
  categoryHint?: string
  confidence: number // 0~1
}

export async function parseVoiceToTodo(
  transcript: string,
  today: string,     // YYYY-MM-DD
): Promise<ParsedTodo> {
  const system = `당신은 한국어 자연어를 일정 데이터로 변환하는 파서입니다.
오늘 날짜: ${today}
반드시 JSON만 반환하세요. 다른 텍스트 없이 순수 JSON만:
{
  "title": "일정 제목",
  "date": "YYYY-MM-DD",
  "time": "HH:mm 또는 null",
  "categoryHint": "업무/개인/건강/공부 중 하나 또는 null",
  "confidence": 0.0~1.0
}
날짜 파싱 규칙:
- 오늘/today → ${today}
- 내일 → 내일 날짜
- 모레 → 모레 날짜
- 다음주 월요일 등 → 해당 날짜 계산
- 이번달 15일 등 → 해당 날짜`

  const raw = await callClaude(system, transcript)
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as ParsedTodo
}

// ────────────────────────────────────────────────────────────
// 2. 빈 시간에 할 일 추천
// ────────────────────────────────────────────────────────────
export interface FreeTimeRecommendation {
  activity: string
  reason: string
  duration: string   // "30분", "2시간" 등
  category: string
}

export async function recommendForFreeTime(
  freeBlocks: { start: string; end: string; durationMin: number }[],
  recentTodos: Todo[],
): Promise<FreeTimeRecommendation[]> {
  const system = `당신은 개인 생산성 코치입니다. 
사용자의 빈 시간과 최근 일정 패턴을 분석해 활동을 추천합니다.
반드시 JSON 배열만 반환하세요:
[
  {
    "activity": "추천 활동명",
    "reason": "추천 이유 (1문장, 20자 이내)",
    "duration": "소요 시간",
    "category": "업무/개인/건강/공부"
  }
]
최대 4개까지 추천하세요.`

  const userMsg = `
빈 시간 블록: ${JSON.stringify(freeBlocks)}
최근 완료한 일정들: ${recentTodos.slice(0, 10).map(t => t.title).join(', ')}
오늘 날짜 기준으로 적절한 활동을 추천해주세요.`

  const raw = await callClaude(system, userMsg)
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as FreeTimeRecommendation[]
}

// ────────────────────────────────────────────────────────────
// 3. 여행/이벤트 가능 시간 분석
// ────────────────────────────────────────────────────────────
export interface AvailabilityAnalysis {
  bestPeriod: string
  reason: string
  suggestions: { date: string; note: string }[]
  warning?: string
}

export async function analyzeAvailability(
  question: string,
  todos: Todo[],
  today: string,
): Promise<AvailabilityAnalysis> {
  const system = `당신은 일정 분석 전문가입니다.
사용자의 일정 데이터를 분석해 특정 활동을 위한 최적 시간을 찾아줍니다.
오늘: ${today}
반드시 JSON만 반환:
{
  "bestPeriod": "가장 적합한 기간 (예: 이번달 셋째주)",
  "reason": "이유 (2문장 이내)",
  "suggestions": [
    { "date": "YYYY-MM-DD", "note": "이 날 추천 이유" }
  ],
  "warning": "주의사항 또는 null"
}`

  const busyDates = todos
    .filter(t => !t.isCompleted)
    .map(t => `${t.date}${t.time ? ' '+t.time : ''}: ${t.title}`)
    .join('\n')

  const userMsg = `질문: ${question}\n\n앞으로 한 달간 일정:\n${busyDates || '(일정 없음)'}`

  const raw = await callClaude(system, userMsg)
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as AvailabilityAnalysis
}

// ────────────────────────────────────────────────────────────
// 4. 자유 대화 (범용 AI 어시스턴트)
// ────────────────────────────────────────────────────────────
export async function chatWithAI(
  messages: { role: 'user' | 'assistant'; content: string }[],
  todos: Todo[],
  today: string,
): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('API_KEY_MISSING')

  // todos가 배열인지 방어
  const todoList = Array.isArray(todos) ? todos : []

  const upcomingTodos = todoList
    .filter(t => t.date >= today && !t.isCompleted)
    .slice(0, 15)
    .map(t => `- ${t.date}${t.time ? ' '+t.time : ''}: [${t.categoryId}] ${t.title}`)
    .join('\n')

  const system = `당신은 gleipi 일정 관리 앱의 AI 어시스턴트입니다. 
이름은 "아스크(Askr)"입니다. 북유럽 신화의 첫 인간 이름에서 따왔습니다.
간결하고 친근하게 대화하세요. 한국어로 답하세요.
오늘: ${today}

사용자의 앞으로 일정:
${upcomingTodos || '(등록된 일정 없음)'}

일정 추가를 요청하면 다음 형식으로 답하세요:
[ADD_TODO] {"title":"...", "date":"YYYY-MM-DD", "time":"HH:mm", "categoryHint":"..."}`

  const keyType = detectKeyType(apiKey)

  // ── Gemini API ──────────────────────────────────────────
  if (keyType === 'gemini') {
    const geminiMessages = [
      { role: 'user', parts: [{ text: system }] },
      { role: 'model', parts: [{ text: '네, 이해했습니다.' }] },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    ]
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiMessages }),
      }
    )
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  // ── Claude API (기본) ───────────────────────────────────
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
    }),
  })

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}
