import { useState, useRef, useEffect } from 'react'
import { useTodoStore } from '../store/todoStore'
import { todayStr } from '../utils/date'
import {
  hasApiKey, getApiKey, setApiKey, clearApiKey,
  chatWithAI, parseVoiceToTodo, analyzeAvailability,
  type ParsedTodo,
} from '../services/ai'
import { speechService } from '../services/speech'
import { isSpeechAvailable } from '../utils/platform'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  pendingTodo?: ParsedTodo
}

// ── 빠른 질문 템플릿 ─────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: '✈', text: '여행 갈 수 있는 날 찾아줘' },
  { icon: '⚡', text: '이번주 가장 바쁜 날은?' },
  { icon: '🌙', text: '오늘 저녁 뭐하면 좋을까?' },
  { icon: '📊', text: '이번달 일정 요약해줘' },
]

export default function AIScreen() {
  const todos   = useTodoStore((s) => s.todos)
  const addTodo = useTodoStore((s) => s.addTodo)
  const today   = todayStr()

  const [apiKey,     setApiKeyState] = useState(getApiKey() ?? '')
  const [keyInput,   setKeyInput]    = useState('')
  const [showKeyUI,  setShowKeyUI]   = useState(!hasApiKey())
  const [messages,   setMessages]    = useState<Message[]>([
    { role: 'assistant', content: '안녕하세요. 저는 **Askr**입니다.\n\n일정을 추가하거나, 여행 가능한 시간을 찾거나, 오늘 뭐할지 물어보세요.' }
  ])
  const [input,      setInput]       = useState('')
  const [loading,    setLoading]     = useState(false)
  const [listening,  setListening]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── API 키 저장 ──────────────────────────────────────────
  const handleSaveKey = () => {
    if (!keyInput.trim()) return
    setApiKey(keyInput.trim())
    setApiKeyState(keyInput.trim())
    setShowKeyUI(false)
    setMessages([{ role: 'assistant', content: 'API 키가 연결되었습니다. 이제 저 **Askr**와 대화할 수 있어요.' }])
  }

  // ── 메시지 전송 ──────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages.filter(m => m.role !== 'system'), userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const apiMessages = newMessages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user'|'assistant', content: m.content }))

      const reply = await chatWithAI(apiMessages, todos, today)

      // [ADD_TODO] 태그 파싱
      if (reply.includes('[ADD_TODO]')) {
        const jsonMatch = reply.match(/\[ADD_TODO\]\s*(\{.*?\})/s)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]) as ParsedTodo
            const cleanReply = reply.replace(/\[ADD_TODO\].*$/s, '').trim()
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: cleanReply || '일정을 추가할게요. 확인해주세요.',
              pendingTodo: parsed,
            }])
            setLoading(false)
            return
          } catch {}
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      if (e.message === 'API_KEY_MISSING') {
        setShowKeyUI(true)
        setMessages(prev => [...prev, { role: 'assistant', content: 'API 키를 입력해주세요.' }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `오류가 발생했어요: ${e.message}` }])
      }
    } finally {
      setLoading(false)
    }
  }

  // ── 일정 확정 추가 ───────────────────────────────────────
  const confirmTodo = async (todo: ParsedTodo, msgIndex: number) => {
    await addTodo({
      title: todo.title,
      date: todo.date,
      time: todo.time,
      categoryId: todo.categoryHint === '업무' ? 'default-work'
        : todo.categoryHint === '개인' ? 'default-personal'
        : todo.categoryHint === '건강' ? 'default-health'
        : todo.categoryHint === '공부' ? 'default-study'
        : 'default-personal',
      priority: 'medium',
      isCompleted: false,
      reminder: { offset: 'none' },
      tags: [],
    })
    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, pendingTodo: undefined, content: m.content + '\n\n✓ 일정이 추가되었습니다.' } : m
    ))
  }

  // ── 음성 입력 ────────────────────────────────────────────
  const handleVoice = async () => {
    if (!isSpeechAvailable()) return
    try {
      setListening(true)
      const { transcript } = await speechService.start()
      setInput(transcript)
      await sendMessage(transcript)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '음성 인식에 실패했습니다.' }])
    } finally {
      setListening(false)
    }
  }

  return (
    <div className="screen ai-screen">
      {/* ── 헤더 ── */}
      <header className="screen-header ai-header">
        <div className="ai-header-title">
          <span className="ai-rune-title">ᚨᛊᚲ</span>
          <div>
            <h1 className="screen-title">Askr</h1>
            <span className="ai-subtitle">gleipi 일정 어시스턴트</span>
          </div>
        </div>
        <button className="btn-icon" onClick={() => setShowKeyUI(v => !v)} title="API 설정">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={hasApiKey() ? '#7DAD74' : '#C8A8A8'} strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </header>

      {/* ── API 키 입력 UI ── */}
      {showKeyUI && (
        <div className="api-key-panel">
          <p className="api-key-desc">
            <strong>Claude API 키</strong>를 입력하세요.<br/>
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="api-key-link">
              console.anthropic.com
            </a>에서 무료 발급 가능합니다.
          </p>
          <div className="form-row">
            <input
              className="form-input"
              type="password"
              placeholder="sk-ant-..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
            />
            <button className="btn-primary" onClick={handleSaveKey}>연결</button>
          </div>
          {hasApiKey() && (
            <button className="api-key-remove" onClick={() => { clearApiKey(); setApiKeyState(''); setShowKeyUI(true) }}>
              키 삭제
            </button>
          )}
        </div>
      )}

      {/* ── 빠른 질문 ── */}
      {messages.length <= 1 && (
        <div className="quick-prompts">
          {QUICK_PROMPTS.map((q) => (
            <button key={q.text} className="quick-prompt-btn" onClick={() => sendMessage(q.text)}>
              <span className="quick-icon">{q.icon}</span>
              <span>{q.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 채팅 메시지 ── */}
      <div className="chat-body">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
            {msg.role === 'assistant' && (
              <span className="chat-avatar">ᚨ</span>
            )}
            <div className="chat-bubble">
              {/* 줄바꿈 및 ** 볼드 처리 */}
              {msg.content.split('\n').map((line, li) => (
                <p key={li} style={{ margin: li > 0 ? '4px 0 0' : 0 }}>
                  {line.split(/\*\*(.*?)\*\*/g).map((part, pi) =>
                    pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part
                  )}
                </p>
              ))}

              {/* 일정 추가 확인 카드 */}
              {msg.pendingTodo && (
                <div className="todo-confirm-card">
                  <div className="todo-confirm-info">
                    <span className="todo-confirm-title">{msg.pendingTodo.title}</span>
                    <span className="todo-confirm-date">{msg.pendingTodo.date}{msg.pendingTodo.time ? ` ${msg.pendingTodo.time}` : ''}</span>
                  </div>
                  <div className="todo-confirm-actions">
                    <button className="btn-primary" style={{padding:'6px 14px', fontSize:13}} onClick={() => confirmTodo(msg.pendingTodo!, i)}>
                      추가
                    </button>
                    <button className="btn-secondary" style={{padding:'6px 14px', fontSize:13}}
                      onClick={() => setMessages(prev => prev.map((m,idx) => idx===i ? {...m, pendingTodo: undefined} : m))}>
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg chat-msg--assistant">
            <span className="chat-avatar">ᚨ</span>
            <div className="chat-bubble chat-bubble--loading">
              <span className="dot"/><span className="dot"/><span className="dot"/>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* ── 입력창 ── */}
      <div className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="일정 추가하거나 질문해보세요..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        {isSpeechAvailable() && (
          <button
            className={`chat-voice-btn ${listening ? 'chat-voice-btn--active' : ''}`}
            onClick={handleVoice}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>
        )}
        <button className="chat-send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
