import type { ExamSlot } from '../types'

/* ------------------------------------------------------------------ */
/* تبدیل میلادی <-> شمسی (الگوریتم jalaali)                            */
/* ------------------------------------------------------------------ */

const div = (a: number, b: number) => Math.trunc(a / b)
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b

interface JalCalResult {
  leap: number
  gy: number
  march: number
}

function jalCal(jy: number): JalCalResult {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ]
  const bl = breaks.length
  const gy = jy + 621
  let leapJ = -14
  let jp = breaks[0]
  let jm = 0
  let jump = 0
  if (jy < jp || jy >= breaks[bl - 1]) throw new Error('سال شمسی نامعتبر: ' + jy)

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4

  return { leap, gy, march }
}

/** روز ژولینی از تاریخ میلادی */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}

/** تاریخ میلادی از روز ژولینی */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

export interface JDate {
  jy: number
  jm: number
  jd: number
}

export function toJalali(gy: number, gm: number, gd: number): JDate {
  const jdn = g2d(gy, gm, gd)
  let gyy = d2g(jdn).gy
  let jy = gyy - 621
  const r = jalCal(jy)
  const jdn1f = g2d(r.gy, 3, r.march)
  let k = jdn - jdn1f
  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }
    }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 }
}

export function toGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  const r = jalCal(jy)
  return d2g(g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1)
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return jalCal(jy).leap === 0 ? 30 : 29
}

/* ------------------------------------------------------------------ */
/* کمکی‌های نمایش                                                      */
/* ------------------------------------------------------------------ */

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

/** ارقام لاتین -> فارسی */
export function faDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => FA_DIGITS[+d])
}

/** ارقام فارسی/عربی -> لاتین */
export function enDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d) >= 0 ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(d) : '٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

/** "YYYY-MM-DD" میلادی -> اجزای شمسی */
export function isoToJalali(iso: string): JDate | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return toJalali(+m[1], +m[2], +m[3])
}

/** اجزای شمسی -> "YYYY-MM-DD" میلادی */
export function jalaliToISO(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  return `${String(gy).padStart(4, '0')}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}

/** "2027-01-20" -> «۲۹ دی ۱۴۰۵» */
export function formatJalaliDate(iso: string): string {
  const j = isoToJalali(iso)
  if (!j) return iso
  return `${faDigits(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${faDigits(j.jy)}`
}

export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** برچسب کوتاه امتحان: «امتحان ریاضی — ۲۹ دی ۱۴۰۵، ساعت ۰۸:۰۰» */
export function examLabel(courseName: string, exam: ExamSlot): string {
  return `${courseName} — ${formatJalaliDate(exam.dateISO)}، ساعت ${faDigits(minToTimeLabel(exam.startMin))}`
}

function minToTimeLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
