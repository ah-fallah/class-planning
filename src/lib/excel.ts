import * as XLSX from 'xlsx'
import type { Course, DayIndex, ExamSlot, Group, Session } from '../types'
import { dayFromName, timeToMin } from './time'
import { enDigits, isoToJalali, jalaliToISO } from './jalali'
import { genId } from './id'

const COLUMN_SYNONYMS: Record<string, string[]> = {
  name: ['نام درس', 'نام', 'درس', 'عنوان درس', 'course', 'name', 'course name'],
  group: ['شماره گروه', 'گروه', 'شماره', 'group', 'group no', 'section'],
  instructor: ['استاد', 'نام استاد', 'مدرس', 'instructor', 'teacher', 'professor'],
  units: ['واحد', 'تعداد واحد', 'units', 'credit', 'credits'],
  days: ['روزها', 'روز', 'days', 'day'],
  start: ['ساعت شروع', 'شروع', 'از ساعت', 'start', 'start time', 'from'],
  end: ['ساعت پایان', 'پایان', 'تا ساعت', 'end', 'end time', 'to'],
  examDate: ['تاریخ امتحان', 'امتحان', 'exam date', 'exam'],
  examStart: ['ساعت شروع امتحان', 'exam start'],
  examEnd: ['ساعت پایان امتحان', 'exam end'],
}

function normalizeHeader(h: string): string | null {
  const t = String(h ?? '').trim().toLowerCase()
  for (const [key, syns] of Object.entries(COLUMN_SYNONYMS)) {
    if (syns.some((s) => s.toLowerCase() === t)) return key
  }
  return null
}

export interface ParsedRow {
  rowNumber: number
  course?: { name: string; units: number; priority: number }
  error?: string
}

export interface ImportResult {
  courses: Course[]
  rows: ParsedRow[]
}

export async function parseWorkbook(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer()
  // SheetJS reads raw buffers as Latin-1 unless a BOM is present, which mangles
  // Persian CSV headers. Decode text files explicitly; fall back to raw for
  // legacy binary .xls (BIFF) that isn't valid UTF-8.
  let wb: XLSX.WorkBook
  const head = new Uint8Array(buf.slice(0, 2))
  if (head[0] === 0x50 && head[1] === 0x4b) {
    wb = XLSX.read(buf) // zip signature -> xlsx
  } else {
    let text: string | null = null
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      text = null
    }
    wb = text !== null ? XLSX.read(text, { type: 'string' }) : XLSX.read(buf)
  }
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const courses = new Map<string, Course>()
  const rows: ParsedRow[] = []

  raw.forEach((r, i) => {
    const rowNumber = i + 2 // +1 header, +1 one-indexed
    const col: Record<string, string> = {}
    for (const [header, value] of Object.entries(r)) {
      const key = normalizeHeader(header)
      if (key && !col[key]) col[key] = String(value).trim()
    }

    if (!col.name) {
      if (Object.values(col).some(Boolean)) rows.push({ rowNumber, error: 'ستون «نام درس» خالی است' })
      return
    }

    let sessions: Session[] = []
    if (col.days || col.start || col.end) {
      const start = timeToMin(col.start ?? '')
      const end = timeToMin(col.end ?? '')
      if (!col.days) {
        rows.push({ rowNumber, error: '«روزها» مشخص نشده' })
        return
      }
      if (start === null || end === null) {
        rows.push({ rowNumber, error: `ساعت نامعتبر: ${col.start}–${col.end}` })
        return
      }
      const days = splitDays(col.days)
      if (days.length === 0) {
        rows.push({ rowNumber, error: `روز نامعتبر: ${col.days}` })
        return
      }
      if (end <= start) {
        rows.push({ rowNumber, error: 'ساعت پایان باید بعد از شروع باشد' })
        return
      }
      sessions = days.map((d) => ({ day: d, startMin: start, endMin: end }))
    }

    let exam: ExamSlot | undefined
    if (col.examDate) {
      const dateISO = normalizeDate(col.examDate)
      if (!dateISO) {
        rows.push({ rowNumber, error: `تاریخ امتحان نامعتبر: ${col.examDate}` })
        return
      }
      exam = {
        dateISO,
        startMin: timeToMin(col.examStart ?? '') ?? 480,
        endMin: timeToMin(col.examEnd ?? '') ?? 600,
      }
    }

    const units = parseInt(col.units ?? '', 10) || 0
    const groupNumber = col.group || '۱'

    const key = `${col.name}||${groupNumber}`
    const existing = courses.get(key)
    if (existing) {
      const g = existing.groups.find((g) => g.number === groupNumber)
      if (g) {
        g.sessions.push(...sessions)
        if (exam) g.exam = exam
      }
      rows.push({ rowNumber, course: { name: existing.name, units: existing.units, priority: existing.priority } })
      return
    }

    const gid = genId('group')
    const group: Group = { id: gid, number: groupNumber, sessions, exam }
    const course: Course = {
      id: genId('course'),
      name: col.name,
      units,
      priority: 3,
      groups: [group],
    }
    courses.set(key, course)
    rows.push({ rowNumber, course: { name: course.name, units, priority: course.priority } })
  })

  return { courses: [...courses.values()], rows }
}

function splitDays(s: string): DayIndex[] {
  return s
    .split(/[,،;|\-–/]/)
    .map((d) => dayFromName(d))
    .filter((d): d is DayIndex => d !== null)
}

/**
 * "2027/01/14" (میلادی) یا "1405/10/24" (شمسی) -> ISO میلادی.
 * تشخیص: سال >= 1300 و < 1600 شمسی فرض می‌شود؛ ارقام فارسی هم پذیرفته می‌شود.
 * سازگاری با داده‌های قدیمی: تاریخ‌های ذخیره‌شده با سال شمسیِ بدون تبدیل
 * (مثل "1405-xx-xx") هنگام نمایش با isoToJalali بدون خطا رد می‌شوند.
 */
export function normalizeDate(s: string): string | null {
  const m = enDigits(s.trim()).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (!m) return null
  const y = +m[1]
  const mo = +m[2]
  const d = +m[3]
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  if (y >= 1300 && y < 1600) {
    // شمسی
    if (d > 31) return null
    return jalaliToISO(y, mo, d)
  }
  if (mo > 12 || d > 31) return null
  // میلادی
  if (y < 1900 || y > 2200) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** برای داده‌های قدیمی: اگر ISO در واقع شمسیِ بدون تبدیل بود، همان را برمی‌گرداند */
export function legacyJalaliISO(iso: string): string | null {
  const j = isoToJalali(iso)
  return j ? jalaliToISO(j.jy, j.jm, j.jd) : null
}
