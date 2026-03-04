import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useTodoStore } from './store/todoStore'
import { useCategoryStore } from './store/categoryStore'
import {
  ttsService, wakeWordService,
  buildDailyBriefing,
  hasDoneBriefingToday, markBriefingDone, resetBriefingIfNeeded,
  type WakeState,
} from './services/tts'
import { chatWithAI, hasApiKey } from './services/ai'
import { todayStr } from './utils/date'
import TodoScreen from './screens/TodoScreen'
import CalendarScreen from './screens/CalendarScreen'
import SettingsScreen from './screens/SettingsScreen'
import FreeTimeScreen from './screens/FreeTimeScreen'
import AIScreen from './screens/AIScreen'

const NAV_ITEMS = [
  { to: '/',         rune: 'ᚹᛟᚱᚲ', label: '할 일'  },
  { to: '/calendar', rune: 'ᛏᛁᛗᛖ', label: '캘린더' },
  { to: '/freetime', rune: 'ᚱᛖᛊᛏ', label: '여백'   },
  { to: '/ai',       rune: 'ᚨᛊᚲ',  label: 'AI'     },
  { to: '/settings', rune: 'ᚱᚢᚾᚨ', label: '설정'   },
]

export default function App() {
  const hydrateTodos      = useTodoStore((s) => s.hydrate)
  const hydrateCategories = useCategoryStore((s) => s.hydrate)
  const todos             = useTodoStore((s) => s.todos)
  const addTodo           = useTodoStore((s) => s.addTodo)
  const todosLoaded       = useRef(false)
  const briefingDone      = useRef(false)

  const [wakeState,  setWakeState]  = useState<WakeState>('idle')
  const [speaking,   setSpeaking]   = useState(false)
  const [lastCmd,    setLastCmd]    = useState('')

  // ── 브리핑 실행 ──────────────────────────────────────────
  const runBriefing = useCallback((markDone = false) => {
    const text = buildDailyBriefing(todos, todayStr())
    setSpeaking(true)
    ttsService.speak(text)
      .then(() => { if (markDone) markBriefingDone() })
      .catch(() => {})
      .finally(() => setSpeaking(false))
  }, [todos])

  // ── 음성 명령 → AI 처리 ──────────────────────────────────
  const handleVoiceCommand = useCallback(async (transcript: string) => {
    setLastCmd(transcript)

    // 일정 브리핑 요청
    const briefingTriggers = ['오늘 일정', '일정 알려', '일정 말해', '일정 읽어', '오늘 뭐']
    if (briefingTriggers.some(t => transcript.includes(t))) {
      setWakeState('idle')
      runBriefing()
      if (wakeWordService.isActive()) wakeWordService.stop()
      setTimeout(() => { wakeWordService.start(); setWakeState('idle') }, 3000)
      return
    }

    // AI 없으면 기본 응답
    if (!hasApiKey()) {
      setSpeaking(true)
      await ttsService.speak('AI 기능을 사용하려면 AI 탭에서 API 키를 먼저 입력해주세요.')
      setSpeaking(false)
      setWakeState('idle')
      wakeWordService.start()
      return
    }

    // Claude AI로 처리
    try {
      setSpeaking(true)
      const reply = await chatWithAI(
        [{ role: 'user', content: transcript }],
        todos,
        todayStr(),
      )

      // [ADD_TODO] 태그 처리
      if (reply.includes('[ADD_TODO]')) {
        const jsonMatch = reply.match(/\[ADD_TODO\]\s*(\{.*?\})/s)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1])
          await addTodo({
            title: parsed.title,
            date: parsed.date ?? todayStr(),
            time: parsed.time,
            categoryId: parsed.categoryHint === '업무' ? 'default-work'
              : parsed.categoryHint === '건강' ? 'default-health'
              : parsed.categoryHint === '공부' ? 'default-study'
              : 'default-personal',
            priority: 'medium',
            isCompleted: false,
            reminder: { offset: 'none' },
            tags: [],
          })
          const cleanReply = reply.replace(/\[ADD_TODO\].*$/s, '').trim()
          await ttsService.speak(cleanReply || `${parsed.title} 일정을 추가했습니다.`)
        }
      } else {
        // 일반 AI 응답 — 마크다운 제거 후 읽기
        const clean = reply
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/#{1,6}\s/g, '')
          .replace(/`{1,3}[^`]*`{1,3}/g, '')
          .slice(0, 300)  // 너무 길면 앞부분만
        await ttsService.speak(clean)
      }
    } catch (e) {
      await ttsService.speak('처리 중 오류가 발생했습니다.')
    } finally {
      setSpeaking(false)
      setWakeState('idle')
      // 처리 완료 후 다시 호출어 대기
      setTimeout(() => wakeWordService.start(), 500)
    }
  }, [todos, addTodo, runBriefing])

  // ── 앱 초기화 ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      resetBriefingIfNeeded()
      await hydrateTodos()
      await hydrateCategories()
      todosLoaded.current = true
    }
    init()

    // 호출어 서비스 콜백 등록
    if (wakeWordService.isSupported()) {
      wakeWordService.onWakeStateChange = setWakeState
      wakeWordService.onCommand = handleVoiceCommand
      wakeWordService.start()
    }

    return () => { wakeWordService.stop() }
  }, [])

  // handleVoiceCommand가 바뀌면 콜백 갱신
  useEffect(() => {
    wakeWordService.onCommand = handleVoiceCommand
  }, [handleVoiceCommand])

  // ── 하루 1회 자동 브리핑 ───────────────────────────────
  useEffect(() => {
    if (!todosLoaded.current) return
    if (briefingDone.current) return
    if (!ttsService.isSupported()) return
    if (hasDoneBriefingToday()) return

    briefingDone.current = true
    const timer = setTimeout(() => runBriefing(true), 800)
    return () => clearTimeout(timer)
  }, [todos, runBriefing])

  // ── 상태별 UI ────────────────────────────────────────────
  const wakeLabel = {
    idle:       '"글레이피" 대기 중',
    listening:  '말씀하세요...',
    processing: 'AI 처리 중...',
  }[wakeState]

  const wakeColor = {
    idle:       '#7DAD74',
    listening:  '#C9A84C',
    processing: '#8FA3C8',
  }[wakeState]

  return (
    <BrowserRouter>
      <div className="app-shell">
        <main className="app-content">
          <Routes>
            <Route path="/"          element={<TodoScreen />} />
            <Route path="/calendar"  element={<CalendarScreen />} />
            <Route path="/freetime"  element={<FreeTimeScreen />} />
            <Route path="/ai"        element={<AIScreen />} />
            <Route path="/settings"  element={<SettingsScreen />} />
          </Routes>
        </main>

        <nav className="bottom-nav">
          {NAV_ITEMS.map(({ to, rune, label }) => (
            <NavLink key={to} to={to} end
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            >
              <span className="nav-rune">{rune}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 호출어 상태 바 */}
        {wakeWordService.isSupported() && (
          <div className={`wake-bar wake-bar--${wakeState}`}>
            <span className="wake-dot" style={{ background: wakeColor }}/>
            <span className="wake-label">{wakeLabel}</span>
            {lastCmd && wakeState === 'processing' && (
              <span className="wake-cmd">"{lastCmd}"</span>
            )}
          </div>
        )}

        {/* 브리핑 컨트롤 */}
        <div className="briefing-controls">
          {speaking ? (
            <button className="briefing-btn briefing-btn--active"
              onClick={() => { ttsService.stop(); setSpeaking(false) }} title="중지">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1"/>
              </svg>
            </button>
          ) : (
            <button className="briefing-btn"
              onClick={() => runBriefing()} title="오늘 일정 다시 읽기">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          )}
        </div>

        {/* 말하는 중 / 듣는 중 테두리 */}
        {(speaking || wakeState === 'listening') && (
          <div className={`speaking-ripple speaking-ripple--${speaking ? 'speaking' : 'listening'}`}/>
        )}
      </div>
    </BrowserRouter>
  )
}
