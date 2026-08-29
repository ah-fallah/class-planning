import type { Course, DayIndex, Group, SelectionMap } from '../types'
import { DAY_NAMES, dayName, END_HOUR, minToTime, START_HOUR } from './time'
import { formatJalaliDate, isoToJalali, todayISO } from './jalali'

interface Picked {
  course: Course
  group: Group
}

function collectPicked(courses: Course[], selection: SelectionMap): Picked[] {
  const picked: Picked[] = []
  for (const c of courses) {
    const gid = selection[c.id]
    if (!gid) continue
    const g = c.groups.find((x) => x.id === gid)
    if (g) picked.push({ course: c, group: g })
  }
  return picked
}

/** تاریخ ISO میلادی -> «1405/10/30» شمسی (فرمت قابل فهم برای normalizeDate هنگام import) */
function jalaliCell(iso: string): string {
  const j = isoToJalali(iso)
  if (!j) return ''
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
}

/**
 * ردیف‌های شیت «دروس» در دقیقاً همان فرمت ستون‌هایی که parseWorkbook می‌خواند،
 * تا فایل خروجی مستقیماً قابل import مجدد باشد (round-trip).
 */
function buildImportRows(picked: Picked[]): (string | number)[][] {
  const rows: (string | number)[][] = [
    ['نام درس', 'شماره گروه', 'استاد', 'واحد', 'روزها', 'ساعت شروع', 'ساعت پایان', 'تاریخ امتحان', 'ساعت شروع امتحان', 'ساعت پایان امتحان'],
  ]
  for (const { course, group } of picked) {
    // جلسات با ساعت یکسان در یک ردیف با روزهای جدا‌شده با «،» جمع می‌شوند
    const byTime = new Map<string, number[]>()
    for (const s of group.sessions) {
      const key = `${s.startMin}-${s.endMin}`
      const dayList = byTime.get(key) ?? []
      dayList.push(s.day)
      byTime.set(key, dayList)
    }
    for (const [key, dayList] of byTime) {
      const dash = key.indexOf('-')
      const startMin = +key.slice(0, dash)
      const endMin = +key.slice(dash + 1)
      const days = dayList
        .slice()
        .sort((a, b) => a - b)
        .map((d) => dayName(d as DayIndex))
        .join('،')
      const exam = group.exam
      rows.push([
        course.name,
        group.number,
        group.instructor ?? '',
        course.units,
        days,
        minToTime(startMin),
        minToTime(endMin),
        exam ? jalaliCell(exam.dateISO) : '',
        exam ? minToTime(exam.startMin) : '',
        exam ? minToTime(exam.endMin) : '',
      ])
    }
  }
  return rows
}

/**
 * خروجی اکسل برنامه‌ی انتخاب فعلی:
 * شیت ۱ «دروس» با همان فرمت ستون‌های import (قابل import مجدد با همان دکمه‌ی «اکسل»)،
 * شیت ۲ «برنامه هفتگی» (گرید روز × ساعت با ادغام سلول‌های بلوک‌های چندساعته).
 * @returns نام فایل ساخته‌شده
 */
export async function exportTimetable(courses: Course[], selection: SelectionMap): Promise<string> {
  // xlsx به‌صورت lazy-load وارد می‌شود تا باندل اولیه سبک بماند
  const XLSX = await import('xlsx')
  const picked = collectPicked(courses, selection)
  if (picked.length === 0) throw new Error('هیچ درسی انتخاب نشده است')

  const wb = XLSX.utils.book_new()
  // راست‌به‌چپ کردن شیت‌ها برای فارسی
  wb.Workbook = { Views: [{ RTL: true }] }

  /* --- شیت ۱: دروس (فرمت سازگار با import) --- */
  const importRows = buildImportRows(picked)
  const wsList = XLSX.utils.aoa_to_sheet(importRows)
  wsList['!cols'] = [
    { wch: 26 }, { wch: 10 }, { wch: 16 }, { wch: 7 }, { wch: 20 },
    { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(wb, wsList, 'دروس')

  /* --- شیت ۲: برنامه هفتگی --- */
  const hasFriday = picked.some(({ group }) => group.sessions.some((s) => s.day === 6))
  const days = DAY_NAMES.slice(0, hasFriday ? 7 : 6)

  const grid: (string | undefined)[][] = [['ساعت', ...days]]
  for (let h = START_HOUR; h < END_HOUR; h++) {
    grid.push([`${String(h).padStart(2, '0')}:00`])
  }

  const merges: import('xlsx').Range[] = []
  for (const { course, group } of picked) {
    for (const s of group.sessions) {
      if (s.day >= days.length) continue
      const row = Math.max(0, Math.floor(s.startMin / 60) - START_HOUR) + 1
      const rowEnd = Math.min(END_HOUR, Math.ceil(s.endMin / 60) - START_HOUR) + 1
      if (row >= grid.length) continue
      const col = s.day + 1
      const text = `${course.name} — گروه ${group.number}${group.instructor ? ` (${group.instructor})` : ''} — ${minToTime(s.startMin)} تا ${minToTime(s.endMin)}`
      // تداخل کلاس‌ها در یک سلول: زیر هم نوشته می‌شوند
      grid[row][col] = grid[row][col] ? `${grid[row][col]}\n${text}` : text
      const rowspan = Math.max(1, rowEnd - row)
      if (rowspan > 1) {
        merges.push({ s: { r: row, c: col }, e: { r: row + rowspan - 1, c: col } })
      }
    }
  }

  const wsGrid = XLSX.utils.aoa_to_sheet(grid)
  wsGrid['!merges'] = merges
  wsGrid['!cols'] = [{ wch: 7 }, ...days.map(() => ({ wch: 24 }))]
  XLSX.utils.book_append_sheet(wb, wsGrid, 'برنامه هفتگی')

  const dateLabel = formatJalaliDate(todayISO()).replace(/ /g, '-')
  const fileName = `برنامه-هفتگی-${dateLabel}.xlsx`
  XLSX.writeFile(wb, fileName)
  return fileName
}