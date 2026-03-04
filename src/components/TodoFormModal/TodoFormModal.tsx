import { useState, useEffect } from 'react'
import { useTodoStore } from '../../store/todoStore'
import { useCategoryStore } from '../../store/categoryStore'
import { todayStr } from '../../utils/date'
import { isSpeechAvailable } from '../../utils/platform'
import { speechService, parseVoiceInput } from '../../services/speech'
import type { Todo, TodoInput, ReminderOffset, TodoPriority } from '../../types'
import CategoryIcon, { getCategoryIconKey } from '../CategoryIcon'

interface Props {
  todo?: Todo           // undefined = 신규 추가, 있으면 수정
  defaultDate?: string  // 캘린더에서 날짜 선택 후 열 때 주입
  onClose: () => void
}

const REMINDER_OPTIONS: { value: ReminderOffset; label: string }[] = [
  { value: 'none',   label: '없음' },
  { value: '10min',  label: '10분 전' },
  { value: '30min',  label: '30분 전' },
  { value: '1hour',  label: '1시간 전' },
  { value: '1day',   label: '하루 전' },
]

export default function TodoFormModal({ todo, defaultDate, onClose }: Props) {
  const addTodo    = useTodoStore((s) => s.addTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const categories = useCategoryStore((s) => s.categories)

  const isEdit = !!todo

  // ─── 폼 상태 ───────────────────────────────────────────────
  const [title,       setTitle]       = useState(todo?.title ?? '')
  const [description, setDescription] = useState(todo?.description ?? '')
  const [date,        setDate]        = useState(todo?.date ?? defaultDate ?? todayStr())
  const [time,        setTime]        = useState(todo?.time ?? '')
  const [categoryId,  setCategoryId]  = useState(todo?.categoryId ?? categories[0]?.id ?? '')
  const [priority,    setPriority]    = useState<TodoPriority>(todo?.priority ?? 'medium')
  const [reminder,    setReminder]    = useState<ReminderOffset>(todo?.reminder.offset ?? 'none')
  const [tagInput,    setTagInput]    = useState('')
  const [tags,        setTags]        = useState<string[]>(todo?.tags ?? [])
  const [isListening, setIsListening] = useState(false)
  const [error,       setError]       = useState('')

  const speechAvailable = isSpeechAvailable()

  // ─── 음성 입력 ─────────────────────────────────────────────
  const handleVoiceInput = async () => {
    if (!speechAvailable) return
    try {
      setIsListening(true)
      const { transcript } = await speechService.start()
      const parsed = parseVoiceInput(transcript)

      setTitle(parsed.title)
      if (parsed.date) setDate(parsed.date)
      if (parsed.time) setTime(parsed.time)
      // categoryHint 매칭
      if (parsed.categoryHint) {
        const matched = categories.find((c) => c.name.includes(parsed.categoryHint!))
        if (matched) setCategoryId(matched.id)
      }
    } catch (err) {
      setError('음성 인식에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsListening(false)
    }
  }

  // ─── 태그 추가 ─────────────────────────────────────────────
  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '')
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  // ─── 저장 ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (!categoryId)   { setError('카테고리를 선택해주세요.'); return }

    const input: TodoInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      time: time || undefined,
      categoryId,
      priority,
      isCompleted: todo?.isCompleted ?? false,
      reminder: { offset: reminder },
      tags,
    }

    if (isEdit && todo) {
      await updateTodo(todo.id, input)
    } else {
      await addTodo(input)
    }

    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* ── 헤더 ── */}
        <div className="modal-header">
          <h2>{isEdit ? '일정 수정' : '새 일정'}</h2>
          <button onClick={onClose} className="btn-icon" aria-label="닫기">✕</button>
        </div>

        <div className="modal-body">
          {error && <p className="form-error">{error}</p>}

          {/* ── 제목 + 음성 입력 ── */}
          <div className="form-row">
            <input
              className="form-input"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {speechAvailable && (
              <button
                className={`btn-voice ${isListening ? 'btn-voice--active' : ''}`}
                onClick={handleVoiceInput}
                disabled={isListening}
                aria-label="음성으로 입력"
              >
                {isListening ? '🔴' : '🎙️'}
              </button>
            )}
          </div>

          {/* ── 설명 ── */}
          <textarea
            className="form-input form-textarea"
            placeholder="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* ── 날짜 / 시간 ── */}
          <div className="form-row">
            <label className="form-label">날짜</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label className="form-label">시간</label>
            <input
              type="time"
              className="form-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* ── 카테고리 ── */}
          <div className="form-row">
            <label className="form-label">카테고리</label>
            <div className="chip-group">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`filter-chip ${categoryId === cat.id ? 'filter-chip--active' : ''}`}
                  style={{ '--chip-color': cat.color } as React.CSSProperties}
                  onClick={() => setCategoryId(cat.id)}
                >
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <CategoryIcon
                      iconKey={getCategoryIconKey(cat.id)}
                      size={13}
                      color={categoryId === cat.id ? '#fff' : cat.color}
                      showRune
                    />
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 우선순위 ── */}
          <div className="form-row">
            <label className="form-label">우선순위</label>
            <div className="chip-group">
              {(['high', 'medium', 'low'] as TodoPriority[]).map((p) => (
                <button
                  key={p}
                  className={`filter-chip ${priority === p ? 'filter-chip--active' : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {{ high: '🔴 높음', medium: '🟡 중간', low: '🟢 낮음' }[p]}
                </button>
              ))}
            </div>
          </div>

          {/* ── 알림 ── */}
          {time && (
            <div className="form-row">
              <label className="form-label">알림</label>
              <select
                className="form-input form-select"
                value={reminder}
                onChange={(e) => setReminder(e.target.value as ReminderOffset)}
              >
                {REMINDER_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── 태그 ── */}
          <div className="form-row">
            <label className="form-label">태그</label>
            <div className="tag-input-row">
              <input
                className="form-input"
                placeholder="#태그 입력 후 Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
              />
              <button className="btn-secondary" onClick={addTag}>추가</button>
            </div>
            {tags.length > 0 && (
              <div className="todo-tags">
                {tags.map((tag) => (
                  <span key={tag} className="tag tag--removable" onClick={() => removeTag(tag)}>
                    #{tag} ✕
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 하단 버튼 ── */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button className="btn-primary" onClick={handleSubmit}>
            {isEdit ? '수정 완료' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
