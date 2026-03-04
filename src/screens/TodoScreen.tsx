import { useState } from 'react'
import { useTodoStore } from '../store/todoStore'
import { useCategoryStore } from '../store/categoryStore'
import { todayStr } from '../utils/date'
import CategoryIcon, { getCategoryIconKey } from '../components/CategoryIcon'
import TodoItem from '../components/TodoItem/TodoItem'
import TodoFormModal from '../components/TodoFormModal/TodoFormModal'
import type { Todo } from '../types'

// ─── 카테고리별 배경 SVG ──────────────────────────────────────
// 연하게 깔리는 Gleipnir 세계관 모티프
const BG_MOTIFS: Record<string, JSX.Element> = {
  'default-work': (
    // Fenrir — 거대한 늑대 실루엣 (기하학적)
    <svg viewBox="0 0 320 480" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position:'absolute', right:-20, bottom:60, width:280, opacity:0.045, pointerEvents:'none' }}>
      {/* 늑대 머리 */}
      <ellipse cx="200" cy="160" rx="80" ry="65" stroke="#3D547E" strokeWidth="1.5"/>
      {/* 귀 */}
      <path d="M155 105 L140 55 L185 95" stroke="#3D547E" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M245 105 L265 55 L220 95" stroke="#3D547E" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* 눈 */}
      <circle cx="178" cy="148" r="8" stroke="#3D547E" strokeWidth="1.5"/>
      <circle cx="222" cy="148" r="8" stroke="#3D547E" strokeWidth="1.5"/>
      {/* 주둥이 */}
      <path d="M175 185 Q200 205 225 185" stroke="#3D547E" strokeWidth="1.5" strokeLinecap="round"/>
      {/* 몸통 */}
      <path d="M145 218 Q110 280 120 360 Q140 420 160 440" stroke="#3D547E" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M255 218 Q290 280 280 360 Q260 420 240 440" stroke="#3D547E" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M145 218 Q200 240 255 218" stroke="#3D547E" strokeWidth="1.5"/>
      {/* 앞다리 */}
      <path d="M150 310 Q130 370 120 420" stroke="#3D547E" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M250 310 Q270 370 280 420" stroke="#3D547E" strokeWidth="1.5" strokeLinecap="round"/>
      {/* 꼬리 */}
      <path d="M255 280 Q310 240 320 180 Q315 150 290 160" stroke="#3D547E" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  'default-personal': (
    // Gleipnir 사슬 — 황금빛 고리들이 이어진 패턴
    <svg viewBox="0 0 320 480" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position:'absolute', right:-10, bottom:40, width:300, opacity:0.07, pointerEvents:'none' }}>
      {/* 대각선으로 흐르는 사슬 */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <g key={i} transform={`translate(${40 + i*28}, ${60 + i*46})`}>
          <ellipse cx="0" cy="0" rx="22" ry="12" stroke="#C9A84C" strokeWidth="2"
            transform={i % 2 === 0 ? 'rotate(0)' : 'rotate(90)'}/>
        </g>
      ))}
      {/* 연결선 */}
      {[0,1,2,3,4,5,6].map((i) => (
        <line key={i}
          x1={52 + i*28} y1={60 + i*46}
          x2={68 + i*28} y2={106 + i*46}
          stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="4 3"/>
      ))}
      {/* 작은 장식 고리들 */}
      <circle cx="80" cy="200" r="18" stroke="#C9A84C" strokeWidth="1.5"/>
      <circle cx="80" cy="200" r="10" stroke="#C9A84C" strokeWidth="1"/>
      <circle cx="220" cy="320" r="24" stroke="#C9A84C" strokeWidth="1.5"/>
      <circle cx="220" cy="320" r="14" stroke="#C9A84C" strokeWidth="1"/>
    </svg>
  ),

  'default-health': (
    // Yggdrasil — 세계수 실루엣
    <svg viewBox="0 0 320 480" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position:'absolute', right:10, bottom:40, width:280, opacity:0.05, pointerEvents:'none' }}>
      {/* 줄기 */}
      <path d="M160 460 L160 180" stroke="#7DAD74" strokeWidth="3" strokeLinecap="round"/>
      {/* 뿌리 */}
      <path d="M160 460 Q120 440 90 420" stroke="#7DAD74" strokeWidth="2" strokeLinecap="round"/>
      <path d="M160 460 Q200 440 230 420" stroke="#7DAD74" strokeWidth="2" strokeLinecap="round"/>
      <path d="M160 460 Q140 450 110 460" stroke="#7DAD74" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M160 460 Q180 450 210 460" stroke="#7DAD74" strokeWidth="1.5" strokeLinecap="round"/>
      {/* 큰 가지 */}
      <path d="M160 280 Q100 240 60 200" stroke="#7DAD74" strokeWidth="2" strokeLinecap="round"/>
      <path d="M160 280 Q220 240 260 200" stroke="#7DAD74" strokeWidth="2" strokeLinecap="round"/>
      <path d="M160 320 Q90 300 50 280" stroke="#7DAD74" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M160 320 Q230 300 270 280" stroke="#7DAD74" strokeWidth="1.5" strokeLinecap="round"/>
      {/* 작은 가지 */}
      <path d="M60 200 Q40 170 30 140" stroke="#7DAD74" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M60 200 Q70 165 90 145" stroke="#7DAD74" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M260 200 Q280 170 290 140" stroke="#7DAD74" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M260 200 Q250 165 230 145" stroke="#7DAD74" strokeWidth="1.5" strokeLinecap="round"/>
      {/* 수관 */}
      <ellipse cx="160" cy="130" rx="90" ry="70" stroke="#7DAD74" strokeWidth="1.5"/>
      <ellipse cx="80" cy="120" rx="50" ry="40" stroke="#7DAD74" strokeWidth="1"/>
      <ellipse cx="240" cy="120" rx="50" ry="40" stroke="#7DAD74" strokeWidth="1"/>
      {/* 잎 점들 */}
      {[[140,90],[170,80],[120,110],[200,100],[155,65],[185,115]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="4" fill="#7DAD74" opacity="0.6"/>
      ))}
    </svg>
  ),

  'default-study': (
    // 룬 문자들 — 지식과 마법의 상징
    <svg viewBox="0 0 320 480" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position:'absolute', right:0, bottom:40, width:300, opacity:0.055, pointerEvents:'none' }}>
      {/* 룬 ᚠ Fehu — 재산/지식 */}
      <text x="220" y="120" fontSize="96" fill="#A889C0" fontFamily="serif" opacity="0.8">ᚠ</text>
      {/* 룬 ᚢ Uruz */}
      <text x="60" y="220" fontSize="72" fill="#A889C0" fontFamily="serif" opacity="0.6">ᚢ</text>
      {/* 룬 ᚦ Thurisaz */}
      <text x="200" y="310" fontSize="80" fill="#A889C0" fontFamily="serif" opacity="0.5">ᚦ</text>
      {/* 룬 ᚨ Ansuz */}
      <text x="40" y="390" fontSize="64" fill="#A889C0" fontFamily="serif" opacity="0.4">ᚨ</text>
      {/* 작은 룬들 */}
      <text x="250" y="400" fontSize="48" fill="#A889C0" fontFamily="serif" opacity="0.35">ᚱ</text>
      <text x="140" y="460" fontSize="40" fill="#A889C0" fontFamily="serif" opacity="0.3">ᚲ</text>
      {/* 원형 룬 프레임 */}
      <circle cx="160" cy="240" r="140" stroke="#A889C0" strokeWidth="0.8" strokeDasharray="6 8"/>
      <circle cx="160" cy="240" r="110" stroke="#A889C0" strokeWidth="0.5" strokeDasharray="3 12"/>
    </svg>
  ),
}

// 기본 배경 (커스텀 카테고리용)
const DEFAULT_BG = (color: string) => (
  <svg viewBox="0 0 320 480" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position:'absolute', right:0, bottom:40, width:300, opacity:0.04, pointerEvents:'none' }}>
    <circle cx="200" cy="280" r="120" stroke={color} strokeWidth="1"/>
    <circle cx="200" cy="280" r="80"  stroke={color} strokeWidth="0.8" strokeDasharray="6 6"/>
    <circle cx="200" cy="280" r="40"  stroke={color} strokeWidth="0.6"/>
  </svg>
)

export default function TodoScreen() {
  const todos          = useTodoStore((s) => s.getFilteredTodos())
  const filter         = useTodoStore((s) => s.filter)
  const setFilter      = useTodoStore((s) => s.setFilter)
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const deleteTodo     = useTodoStore((s) => s.deleteTodo)
  const categories     = useCategoryStore((s) => s.categories)

  const [modalOpen, setModalOpen]   = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>()

  const openAdd  = () => { setEditingTodo(undefined); setModalOpen(true) }
  const openEdit = (todo: Todo) => { setEditingTodo(todo); setModalOpen(true) }

  const today = todayStr()
  const grouped = {
    past:     todos.filter((t) => t.date < today && !t.isCompleted),
    today:    todos.filter((t) => t.date === today),
    upcoming: todos.filter((t) => t.date > today),
    done:     todos.filter((t) => t.isCompleted),
  }

  // 현재 선택된 카테고리 정보
  const activeCat = categories.find((c) => c.id === filter.categoryId)
  const bgMotif   = filter.categoryId
    ? (BG_MOTIFS[filter.categoryId] ?? DEFAULT_BG(activeCat?.color ?? '#8FA3C8'))
    : null

  return (
    <div className="screen todo-screen" style={{ position: 'relative', overflow: 'hidden' }}>

      {/* ── 카테고리 배경 모티프 ── */}
      {bgMotif}

      {/* ── 헤더 ── */}
      <header className="screen-header" style={{ background: 'rgba(255,255,255,0.92)' }}>
        <h1 className="screen-title">할 일</h1>
        <button className="btn-icon btn-add" onClick={openAdd} aria-label="일정 추가">+</button>
      </header>

      {/* ── 카테고리 필터 칩 ── */}
      <div className="category-filter" style={{ background: 'rgba(255,255,255,0.88)' }}>
        <button
          className={`filter-chip ${!filter.categoryId ? 'filter-chip--active' : ''}`}
          onClick={() => setFilter({ categoryId: undefined })}
        >
          전체
        </button>
        {categories.map((cat) => {
          const isActive = filter.categoryId === cat.id
          const iconKey  = getCategoryIconKey(cat.id)
          return (
            <button
              key={cat.id}
              className={`filter-chip ${isActive ? 'filter-chip--active' : ''}`}
              style={{ '--chip-color': cat.color } as React.CSSProperties}
              onClick={() => setFilter({ categoryId: cat.id })}
            >
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <CategoryIcon iconKey={iconKey} size={14} color={isActive ? '#fff' : cat.color} showRune />
                {cat.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Todo 목록 ── */}
      <div className="todo-list" style={{ position:'relative', zIndex:1 }}>
        {todos.length === 0 && (
          <div className="empty-state">
            <div className="empty-rune">ᚠ</div>
            <p>아직 일정이 없어요</p>
            <button className="btn-primary" onClick={openAdd}>첫 일정 추가하기</button>
          </div>
        )}

        {grouped.past.length > 0 && (
          <section>
            <h2 className="group-label group-label--past">— 지난 일정</h2>
            {grouped.past.map((t) => (
              <TodoItem key={t.id} todo={t} onToggle={toggleComplete} onEdit={openEdit} onDelete={deleteTodo} />
            ))}
          </section>
        )}
        {grouped.today.length > 0 && (
          <section>
            <h2 className="group-label">— 오늘</h2>
            {grouped.today.map((t) => (
              <TodoItem key={t.id} todo={t} onToggle={toggleComplete} onEdit={openEdit} onDelete={deleteTodo} />
            ))}
          </section>
        )}
        {grouped.upcoming.length > 0 && (
          <section>
            <h2 className="group-label">— 예정</h2>
            {grouped.upcoming.map((t) => (
              <TodoItem key={t.id} todo={t} onToggle={toggleComplete} onEdit={openEdit} onDelete={deleteTodo} />
            ))}
          </section>
        )}
        {grouped.done.length > 0 && (
          <section>
            <h2 className="group-label group-label--done">— 완료됨</h2>
            {grouped.done.map((t) => (
              <TodoItem key={t.id} todo={t} onToggle={toggleComplete} onEdit={openEdit} onDelete={deleteTodo} />
            ))}
          </section>
        )}
      </div>

      {modalOpen && (
        <TodoFormModal todo={editingTodo} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
