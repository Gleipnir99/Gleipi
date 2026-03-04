/**
 * CategoryIcon — Gleipnir 룬문자 + SVG 아이콘
 * 개인(personal)은 황금 사슬 SVG
 * 나머지는 룬문자 뱃지
 */

interface Props {
  iconKey: string
  size?: number
  color?: string
  showRune?: boolean  // 칩에서는 룬만, 카드에서는 SVG
}

// ── 카테고리별 룬 매핑 ──────────────────────────────────────
export const CATEGORY_RUNES: Record<string, { rune: string; meaning: string }> = {
  work:     { rune: 'ᛏ',  meaning: 'Tiwaz — 질서와 책임' },
  personal: { rune: 'ᚷ',  meaning: 'Gebo — 선물과 인연' },
  health:   { rune: 'ᚢ',  meaning: 'Uruz — 힘과 생명력' },
  study:    { rune: 'ᚨ',  meaning: 'Ansuz — 지혜와 언어' },
  default:  { rune: 'ᚱ',  meaning: 'Raido — 여정' },
}

// ── SVG 아이콘 (카드용) ─────────────────────────────────────
const SVG_ICONS: Record<string, (color: string, size: number) => JSX.Element> = {
  // 업무 — Tiwaz 룬 형태의 화살표 (위를 향한 승리의 창)
  work: (color, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L12 21"/>
      <path d="M7 8 L12 3 L17 8"/>
      <path d="M7 14 L12 14"/>
      <path d="M9 18 L12 18"/>
    </svg>
  ),

  // 개인 — 황금 사슬 (Gleipnir 핵심)
  personal: (color, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),

  // 건강 — Uruz 룬 형태 (힘)
  health: (color, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3 L8 16 Q8 20 12 20 Q16 20 16 16 L16 3"/>
      <path d="M8 10 L16 10"/>
    </svg>
  ),

  // 공부 — Ansuz 룬 형태 (신의 언어)
  study: (color, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L12 21"/>
      <path d="M7 7 L12 3 L17 7"/>
      <path d="M7 13 L17 13"/>
    </svg>
  ),

  default: (color, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="8"/>
      <path d="M12 8 L12 16 M8 12 L16 12"/>
    </svg>
  ),
}

export default function CategoryIcon({ iconKey, size = 16, color = '#8FA3C8', showRune = false }: Props) {
  if (showRune) {
    const runeData = CATEGORY_RUNES[iconKey] ?? CATEGORY_RUNES.default
    return (
      <span style={{
        fontFamily: 'serif',
        fontSize: size,
        color,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
      }}>
        {runeData.rune}
      </span>
    )
  }
  const render = SVG_ICONS[iconKey] ?? SVG_ICONS.default
  return render(color, size)
}

export const getCategoryIconKey = (categoryId: string): string => {
  if (categoryId.includes('work'))     return 'work'
  if (categoryId.includes('personal')) return 'personal'
  if (categoryId.includes('health'))   return 'health'
  if (categoryId.includes('study'))    return 'study'
  return 'default'
}
