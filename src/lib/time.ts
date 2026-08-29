import type { DayIndex, Session } from '../types'

/** بازه‌ی نمایش جدول هفتگی (مشترک بین UI و خروجی اکسل) */
export const START_HOUR = 7
export const END_HOUR = 20

export const DAY_NAMES = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const

export function dayName(day: DayIndex): string {
  return DAY_NAMES[day]
}

export function dayFromName(name: string): DayIndex | null {
  const normalized = name.trim().replace(/[يى]/g, 'ی').replace(/ة/g, 'ه')
  const idx = DAY_NAMES.findIndex((d) => d === normalized || normalized.startsWith(d))
  if (idx >= 0) return idx as DayIndex
  const num = parseInt(normalized, 10)
  if (!isNaN(num) && num >= 0 && num <= 6) return num as DayIndex
  return null
}

/** "08:30" | "8:30" | "8.5" | "8" -> دقیقه از نیمه‌شب */
export function timeToMin(s: string): number | null {
  const t = s.trim().replace(/[:.]/g, (m) => (m === ':' ? ':' : '.'))
  let h: number, m: number
  const hm = t.match(/^(\d{1,2}):(\d{1,2})$/)
  if (hm) {
    h = +hm[1]
    m = +hm[2]
  } else {
    const dot = t.match(/^(\d{1,2})(?:\.(\d{1,2}))?$/)
    if (!dot) return null
    h = +dot[1]
    m = dot[2] ? Math.round((+('0.' + dot[2])) * 60) : 0
  }
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

export function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function sessionsOverlap(a: Session, b: Session): boolean {
  if (a.day !== b.day) return false
  return a.startMin < b.endMin && b.startMin < a.endMin
}

/** جلسات لمس‌شده (پایان یکی = شروع دیگری) تداخل نیستند */
export function examOverlap(
  dateA: string,
  aStart: number,
  aEnd: number,
  dateB: string,
  bStart: number,
  bEnd: number,
): boolean {
  if (dateA !== dateB) return false
  return aStart < bEnd && bStart < aEnd
}
