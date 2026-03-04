import { useMemo, useState } from 'react'
import { useTodoStore } from '../store/todoStore'
import { recommendForFreeTime, hasApiKey, type FreeTimeRecommendation } from '../services/ai'
import { todayStr, formatDisplayDate, navigate } from '../utils/date'

const WORK_START = 7
const WORK_END   = 23
const MIN_FREE   = 30

interface TimeBlock {
  start: number
  end: number
  type: 'busy' | 'free'
  todoTitle?: string
  todoColor?: string
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const period = h < 12 ? '오전' : '오후'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${period} ${hour}:${m.toString().padStart(2, '0')}`
}

function blockHeight(start: number, end: number): number {
  return Math.max(((end - start) / 60) * 56, 28)
}

export default function FreeTimeScreen() {
  const todos = useTodoStore((s) => s.todos)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [recs, setRecs]             = useState<FreeTimeRecommendation[]>([])
  const [recLoading, setRecLoading] = useState(false)

  const { blocks, totalFreeMin } = useMemo(() => {
    const dayTodos = todos
      .filter((t) => t.date === selectedDate && t.time && !t.isCompleted)
      .map((t) => {
        const [h, m] = t.time!.split(':').map(Number)
        const startMin = h * 60 + m
        return { start: startMin, end: startMin + 60, title: t.title, color: '#8FA3C8' }
      })
      .sort((a, b) => a.start - b.start)

    const rangeStart = WORK_START * 60
    const rangeEnd   = WORK_END * 60
    const blocks: TimeBlock[] = []
    let cursor = rangeStart

    for (const todo of dayTodos) {
      if (todo.start > cursor && todo.start - cursor >= MIN_FREE) {
        blocks.push({ start: cursor, end: todo.start, type: 'free' })
      }
      if (todo.start < rangeEnd) {
        blocks.push({
          start: Math.max(todo.start, rangeStart),
          end: Math.min(todo.end, rangeEnd),
          type: 'busy',
          todoTitle: todo.title,
          todoColor: todo.color,
        })
        cursor = Math.max(cursor, todo.end)
      }
    }

    if (cursor < rangeEnd && rangeEnd - cursor >= MIN_FREE) {
      blocks.push({ start: cursor, end: rangeEnd, type: 'free' })
    }

    const totalFreeMin = blocks
      .filter((b) => b.type === 'free')
      .reduce((s, b) => s + (b.end - b.start), 0)

    return { blocks, totalFreeMin }
  }, [todos, selectedDate])

  const freeHours   = Math.floor(totalFreeMin / 60)
  const freeMinutes = totalFreeMin % 60

  const handleAIRecommend = async () => {
    if (!hasApiKey()) {
      alert('AI 탭에서 API 키를 먼저 입력해주세요.')
      return
    }
    setRecLoading(true)
    try {
      const freeData = blocks
        .filter((b) => b.type === 'free')
        .map((b) => ({
          start: minutesToTime(b.start),
          end: minutesToTime(b.end),
          durationMin: b.end - b.start,
        }))
      const result = await recommendForFreeTime(
        freeData,
        todos.filter((t) => t.isCompleted).slice(-10),
      )
      setRecs(result)
    } catch {
      alert('추천 불러오기 실패. API 키를 확인해주세요.')
    } finally {
      setRecLoading(false)
    }
  }

  return (
    <div className="screen freetime-screen">

      {/* ── 헤더 ── */}
      <header className="screen-header gleipnir-header">
        <div className="cal-nav">
          <button className="btn-icon glyph-btn" onClick={() => setSelectedDate(navigate.prevDay(selectedDate))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="header-title-block">
            <h1 className="screen-title gleipnir-title">ᚱᛖᛊᛏ</h1>
            <span className="header-date">{formatDisplayDate(selectedDate)}</span>
          </div>
          <button className="btn-icon glyph-btn" onClick={() => setSelectedDate(navigate.nextDay(selectedDate))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* 여백 시간 요약 */}
        <div className="freetime-summary">
          <div className="summary-chain">
            <span className="chain-link"/><span className="chain-link"/><span className="chain-link"/>
          </div>
          <div className="summary-text">
            <span className="summary-free">
              {freeHours}시간 {freeMinutes > 0 ? `${freeMinutes}분` : ''}
            </span>
            <span className="summary-label">의 여백이 있습니다</span>
          </div>
          <div className="summary-chain">
            <span className="chain-link"/><span className="chain-link"/><span className="chain-link"/>
          </div>
        </div>
      </header>

      {/* ── 타임라인 + AI 추천 스크롤 영역 ── */}
      <div className="freetime-body">

        {blocks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-rune">ᚠ</div>
            <p>이 날은 일정이 없어요</p>
            <p className="empty-sub">하루 전체가 여백입니다</p>
          </div>
        ) : (
          <div className="timeline">
            {blocks.map((block, i) => (
              <div
                key={i}
                className={`timeline-block timeline-block--${block.type}`}
                style={{ height: blockHeight(block.start, block.end) }}
              >
                <div className="tl-time">
                  <span>{minutesToTime(block.start)}</span>
                  {block.type === 'free' && (
                    <span className="tl-time-end">{minutesToTime(block.end)}</span>
                  )}
                </div>

                <div className="tl-content">
                  {block.type === 'free' ? (
                    <div className="tl-free-inner">
                      <div className="tl-free-bar"/>
                      <div className="tl-free-info">
                        <span className="tl-free-duration">
                          {Math.floor((block.end - block.start) / 60) > 0 &&
                            `${Math.floor((block.end - block.start) / 60)}시간 `}
                          {(block.end - block.start) % 60 > 0 &&
                            `${(block.end - block.start) % 60}분`}
                        </span>
                        <span className="tl-free-label">여백</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="tl-busy-inner"
                      style={{ borderLeft: `3px solid ${block.todoColor}` }}
                    >
                      <span className="tl-busy-title">{block.todoTitle}</span>
                      <span className="tl-busy-duration">{block.end - block.start}분</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── AI 추천 ── */}
        <div className="freetime-ai-section">
          <button
            className={`freetime-ai-btn ${recLoading ? 'freetime-ai-btn--loading' : ''}`}
            onClick={handleAIRecommend}
            disabled={recLoading}
          >
            <span className="freetime-ai-rune">ᚨ</span>
            {recLoading ? '분석 중...' : '이 시간에 뭘 할까? AI 추천'}
          </button>

          {recs.length > 0 && (
            <div className="freetime-recs">
              {recs.map((r, i) => (
                <div key={i} className="freetime-rec-card">
                  <div className="rec-activity">{r.activity}</div>
                  <div className="rec-meta">
                    <span className="rec-duration">{r.duration}</span>
                    <span className="rec-reason">{r.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
