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

// ── 룬문자 탭바 ─────────────────────────────────────────────
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
