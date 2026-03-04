import { useState } from 'react'
import { useCategoryStore } from '../store/categoryStore'
import { requestPermission } from '../services/notification'
import CategoryIcon, { getCategoryIconKey } from '../components/CategoryIcon'
import type { Category } from '../types'

const PRESET_COLORS = ['#8FA3C8','#C9A84C','#7DAD74','#A889C0','#C8A8A8','#7BBFB5','#C49A6C','#5B7AB0']
const PRESET_ICONS  = ['work','personal','health','study','default']

const ICON_LABELS: Record<string, string> = {
  work: '업무', personal: '개인', health: '건강', study: '공부', default: '기타'
}

interface CategoryFormState { name: string; color: string; icon: string }
const EMPTY_FORM: CategoryFormState = { name: '', color: '#8FA3C8', icon: 'default' }

export default function SettingsScreen() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore()
  const [form, setForm]           = useState<CategoryFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'granted' | 'denied'>('idle')

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setForm({ name: cat.name, color: cat.color, icon: cat.icon })
  }
  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM) }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editingId) { updateCategory(editingId, form); setEditingId(null) }
    else addCategory(form)
    setForm(EMPTY_FORM)
  }

  return (
    <div className="screen settings-screen">
      <header className="screen-header">
        <h1 className="screen-title gleipnir-title">Settings</h1>
      </header>

      <div className="settings-body">
        {/* ── 카테고리 ── */}
        <section className="settings-section">
          <h2 className="settings-section-title">카테고리</h2>
          <div className="category-list">
            {categories.map((cat) => (
              <div key={cat.id} className="category-row">
                <span className="cat-icon-svg" style={{ color: cat.color }}>
                  <CategoryIcon iconKey={cat.icon} size={18} color={cat.color} />
                </span>
                <span className="cat-color-dot" style={{ background: cat.color }} />
                <span className="cat-name">{cat.name}</span>
                <div className="cat-actions">
                  <button className="btn-icon-sm" onClick={() => startEdit(cat)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8FA3C8" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {!cat.id.startsWith('default-') && (
                    <button className="btn-icon-sm btn-danger" onClick={() => deleteCategory(cat.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8A8A8" strokeWidth="1.8" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 추가/수정 폼 */}
          <div className="category-form">
            <h3 className="form-subtitle">{editingId ? '카테고리 수정' : '새 카테고리'}</h3>
            <input className="form-input" placeholder="카테고리 이름"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

            <div className="picker-label">아이콘</div>
            <div className="icon-picker">
              {PRESET_ICONS.map((key) => (
                <button key={key}
                  className={`icon-btn ${form.icon === key ? 'icon-btn--active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, icon: key }))}
                  title={ICON_LABELS[key]}
                >
                  <CategoryIcon iconKey={key} size={18}
                    color={form.icon === key ? form.color : '#B0BDD6'} />
                </button>
              ))}
            </div>

            <div className="picker-label">색상</div>
            <div className="color-picker">
              {PRESET_COLORS.map((color) => (
                <button key={color}
                  className={`color-btn ${form.color === color ? 'color-btn--active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setForm((f) => ({ ...f, color }))} />
              ))}
            </div>

            {/* 미리보기 */}
            <div className="cat-preview" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CategoryIcon iconKey={form.icon} size={20} color={form.color} />
              <span style={{ color: form.color, fontWeight: 600 }}>{form.name || '미리보기'}</span>
            </div>

            <div className="form-row form-row--end">
              {editingId && <button className="btn-secondary" onClick={cancelEdit}>취소</button>}
              <button className="btn-primary" onClick={handleSave}>{editingId ? '수정 완료' : '추가'}</button>
            </div>
          </div>
        </section>

        {/* ── 알림 ── */}
        <section className="settings-section">
          <h2 className="settings-section-title">알림</h2>
          <div className="settings-row">
            <span>알림 권한</span>
            <button className={`btn-secondary ${notifStatus === 'granted' ? 'btn-success' : ''}`}
              onClick={async () => { const ok = await requestPermission(); setNotifStatus(ok ? 'granted' : 'denied') }}>
              {notifStatus === 'granted' ? '✓ 허용됨' : notifStatus === 'denied' ? '✗ 거부됨' : '권한 요청'}
            </button>
          </div>
        </section>

        {/* ── 앱 정보 ── */}
        <section className="settings-section">
          <h2 className="settings-section-title">앱 정보</h2>
          <div className="settings-row">
            <span>gleipi</span>
            <span className="text-muted">v0.1.0</span>
          </div>
        </section>
      </div>
    </div>
  )
}
