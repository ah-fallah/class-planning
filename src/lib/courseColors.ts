import type { Course } from '@/types'

export interface BlockColor {
  bg: string
  fg: string
}

/** پالت پایه Neon-Brutalism — ۸ رنگ برند */
export const BASE_COLORS: BlockColor[] = [
  { bg: '#FF5C5C', fg: '#000000' }, // Neon Coral
  { bg: '#4DEEEA', fg: '#000000' }, // Neon Cyan
  { bg: '#FFE156', fg: '#000000' }, // Raw Yellow
  { bg: '#74FF5C', fg: '#000000' }, // Neon Lime
  { bg: '#FF66D8', fg: '#000000' }, // Hot Pink
  { bg: '#FF9933', fg: '#000000' }, // Neon Orange
  { bg: '#9966FF', fg: '#FFFFFF' }, // Electric Purple
  { bg: '#00E5FF', fg: '#000000' }, // Electric Blue
]

/** حداقل اندازه پالت کامل: رنگ‌های برند + بقیه با گام زاویه طلایی */
const MIN_PALETTE_SIZE = 24

/** FNV-1a — hash پایدار از id درس برای انتخاب شبه‌تصادفی رنگ */
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** پالت کامل: رنگ‌های برند + تکمیل با گام زاویه طلایی تا تعداد موردنیاز */
function buildPalette(size: number): BlockColor[] {
  const palette = [...BASE_COLORS]
  for (let i = BASE_COLORS.length; palette.length < size; i++) {
    const hue = Math.round((i * 137.508) % 360)
    palette.push({ bg: `hsl(${hue} 85% 68%)`, fg: '#000000' })
  }
  return palette
}

/**
 * نقشه‌ی رنگ هر درس:
 * نقطه‌ی شروع هر درس در پالت با hash از id‌اش انتخاب می‌شود (توزیع شبه‌تصادفی
 * و متفاوت برای هر درس)، و اگر دو درس به یک رنگ برخورد کنند اولین رنگ آزاد
 * بعد از آن (linear probing) گرفته می‌شود تا هیچ دو درسی هم‌رنگ نباشند.
 * رنگ‌ها بین رندرها پایدار می‌مانند چون فقط به id درس وابسته‌اند.
 */
export function buildCourseColorMap(courses: Course[]): Map<string, BlockColor> {
  const palette = buildPalette(Math.max(MIN_PALETTE_SIZE, courses.length))
  const used = new Set<number>()
  const map = new Map<string, BlockColor>()
  for (const c of courses) {
    let idx = hashString(c.id) % palette.length
    while (used.has(idx)) idx = (idx + 1) % palette.length
    used.add(idx)
    map.set(c.id, palette[idx])
  }
  return map
}
