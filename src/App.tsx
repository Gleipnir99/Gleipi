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

// ── SVG 아이콘 탭바 (iOS Safari 최적화) ─────────────────────
const NAV_ITEMS = [
  {
    to: '/', label: '할 일',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#5B7AB0' : '#A8B6CC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2"/>
        <path d="M8 10h8M8 14h5"/>
        <path d="M7 3v4"/>
        <path d="M17 3v4"/>
      </svg>
    ),
  },
  {
    to: '/calendar', label: '캘린더',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#5B7AB0' : '#A8B6CC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
        <circle cx="12" cy="16" r="1.5" fill={active ? '#5B7AB0' : '#A8B6CC'}/>
      </svg>
    ),
  },
  {
    to: '/freetime', label: '여백',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#5B7AB0' : '#A8B6CC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 3"/>
      </svg>
    ),
  },
  {
    to: '/ai', label: 'AI',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#5B7AB0' : '#A8B6CC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 014 4v1h1a3 3 0 010 6h-1v1a4 4 0 01-8 0v-1H7a3 3 0 010-6h1V6a4 4 0 014-4z"/>
        <circle cx="9" cy="10" r="1" fill={active ? '#5B7AB0' : '#A8B6CC'}/>
        <circle cx="15" cy="10" r="1" fill={active ? '#5B7AB0' : '#A8B6CC'}/>
      </svg>
    ),
  },
  {
    to: '/settings', label: '설정',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#5B7AB0' : '#A8B6CC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
]

export default function App() {
  const hydrateTodos      = useTodoStore((s) => s.hydrate)
  const hydrateCategories = useCategoryStore((s) => s.hydrate)
  const todos             = useTodoStore((s) => s.todos)
  const addTodo           = useTodoStore((s) => s.addTodo)
  const todosLoaded       = useRef(false)
  const briefingDone      = useRef(false)

  const [wakeState, setWakeState] = useState<WakeState>('idle')
  const [speaking,  setSpeaking]  = useState(false)
  const [lastCmd,   setLastCmd]   = useState('')

  const runBriefing = useCallback((markDone = false) => {
    const text = buildDailyBriefing(todos, todayStr())
    setSpeaking(true)
    ttsService.speak(text)
      .then(() => { if (markDone) markBriefingDone() })
      .catch(() => {})
      .finally(() => setSpeaking(false))
  }, [todos])

  const handleVoiceCommand = useCallback(async (transcript: string) => {
    setLastCmd(transcript)
    const briefingTriggers = ['오늘 일정', '일정 알려', '일정 말해', '일정 읽어', '오늘 뭐']
    if (briefingTriggers.some(t => transcript.includes(t))) {
      setWakeState('idle')
      runBriefing()
      setTimeout(() => { wakeWordService.start(); setWakeState('idle') }, 3000)
      return
    }
    if (!hasApiKey()) {
      setSpeaking(true)
      await ttsService.speak('AI 탭에서 API 키를 먼저 입력해주세요.')
      setSpeaking(false)
      setWakeState('idle')
      wakeWordService.start()
      return
    }
    try {
      setSpeaking(true)
      const reply = await chatWithAI(
        [{ role: 'user', content: transcript }], todos, todayStr()
      )
      if (reply.includes('[ADD_TODO]')) {
        const jsonMatch = reply.match(/\[ADD_TODO\]\s*(\{.*?\})/s)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1])
          await addTodo({
            title: parsed.title, date: parsed.date ?? todayStr(),
            time: parsed.time,
            categoryId: parsed.categoryHint === '업무' ? 'default-work'
              : parsed.categoryHint === '건강' ? 'default-health'
              : parsed.categoryHint === '공부' ? 'default-study'
              : 'default-personal',
            priority: 'medium', isCompleted: false,
            reminder: { offset: 'none' }, tags: [],
          })
          const clean = reply.replace(/\[ADD_TODO\].*$/s, '').trim()
          await ttsService.speak(clean || `${parsed.title} 일정을 추가했습니다.`)
        }
      } else {
        const clean = reply.replace(/\*\*(.*?)\*\*/g, '$1').replace(/#{1,6}\s/g, '').slice(0, 300)
        await ttsService.speak(clean)
      }
    } catch {
      await ttsService.speak('처리 중 오류가 발생했습니다.')
    } finally {
      setSpeaking(false)
      setWakeState('idle')
      setTimeout(() => wakeWordService.start(), 500)
    }
  }, [todos, addTodo, runBriefing])

  useEffect(() => {
    const init = async () => {
      resetBriefingIfNeeded()
      await hydrateTodos()
      await hydrateCategories()
      todosLoaded.current = true
    }
    init()
    if (wakeWordService.isSupported()) {
      wakeWordService.onWakeStateChange = setWakeState
      wakeWordService.onCommand = handleVoiceCommand
      wakeWordService.start()
    }
    return () => { wakeWordService.stop() }
  }, [])

  useEffect(() => { wakeWordService.onCommand = handleVoiceCommand }, [handleVoiceCommand])

  useEffect(() => {
    if (!todosLoaded.current || briefingDone.current) return
    if (!ttsService.isSupported() || hasDoneBriefingToday()) return
    briefingDone.current = true
    const timer = setTimeout(() => runBriefing(true), 800)
    return () => clearTimeout(timer)
  }, [todos, runBriefing])

  const wakeLabel = { idle: '"글레이피" 대기 중', listening: '말씀하세요...', processing: 'AI 처리 중...' }[wakeState]
  const wakeDotColor = { idle: '#7DAD74', listening: '#C9A84C', processing: '#8FA3C8' }[wakeState]

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

        {/* ── 탭바 — iOS Safari 최적화 ── */}
        <nav className="bottom-nav">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <span className="nav-icon">{icon(isActive)}</span>
                  <span className="nav-label">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 호출어 상태 바 */}
        {wakeWordService.isSupported() && (
          <div className={`wake-bar wake-bar--${wakeState}`}>
            <span className="wake-dot" style={{ background: wakeDotColor }}/>
            <span className="wake-label">{wakeLabel}</span>
            {lastCmd && wakeState === 'processing' && (
              <span className="wake-cmd">"{lastCmd}"</span>
            )}
          </div>
        )}

        {/* 브리핑 버튼 */}
        <div className="briefing-controls">
          {speaking ? (
            <button className="briefing-btn briefing-btn--active"
              onClick={() => { ttsService.stop(); setSpeaking(false) }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1"/>
              </svg>
            </button>
          ) : (
            <button className="briefing-btn" onClick={() => runBriefing()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          )}
        </div>

        {(speaking || wakeState === 'listening') && (
          <div className={`speaking-ripple speaking-ripple--${speaking ? 'speaking' : 'listening'}`}/>
        )}
      </div>
    </BrowserRouter>
  )
}
