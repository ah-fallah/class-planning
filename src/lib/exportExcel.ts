import type { Course, Group, SelectionMap } from '../types'
import { DAY_NAMES, dayName, END_HOUR, minToTime, START_HOUR } from './time'
import { formatJalaliDate, todayISO } from './jalali'

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

/**
 * خروجی اکسل برنامه‌ی انتخاب فعلی:
 * شیت «برنامه هفتگی» (گرید روز × ساعت با ادغام سلول‌های بلوک‌های چندساعته)،
 * شیت «امتحانات» (تاریخ شمسی) و شیت «دروس» (خلاصه‌ی انتخاب‌ها + جمع واحدها).
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

  /* --- شیت ۱: برنامه هفتگی --- */
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

  /* --- شیت ۲: امتحانات --- */
  const exams: (string | number)[][] = [['درس', 'گروه', 'تاریخ امتحان', 'ساعت شروع', 'ساعت پایان']]
  for (const { course, group } of picked) {
    if (!group.exam) continue
    exams.push([
      course.name,
      group.number,
      formatJalaliDate(group.exam.dateISO),
      minToTime(group.exam.startMin),
      minToTime(group.exam.endMin),
    ])
  }
  if (exams.length > 1) {
    const wsExams = XLSX.utils.aoa_to_sheet(exams)
    wsExams['!cols'] = [{ wch: 26 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, wsExams, 'امتحانات')
  }

  /* --- شیت ۳: دروس انتخاب‌شده --- */
  const list: (string | number)[][] = [['درس', 'گروه', 'استاد', 'واحد', 'جلسات', 'اولویت']]
  let totalUnits = 0
  for (const { course, group } of picked) {
    totalUnits += course.units
    const sessions = group.sessions
      .map((s) => `${dayName(s.day)} ${minToTime(s.startMin)}–${minToTime(s.endMin)}`)
      .join(' و ')
    list.push([course.name, group.number, group.instructor ?? '', course.units, sessions, course.priority])
  }
  list.push([])
  list.push(['جمع واحدها', '', '', totalUnits])
  const wsList = XLSX.utils.aoa_to_sheet(list)
  wsList['!cols'] = [{ wch: 26 }, { wch: 8 }, { wch: 16 }, { wch: 7 }, { wch: 40 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, wsList, 'دروس')

  const dateLabel = formatJalaliDate(todayISO()).replace(/ /g, '-')
  const fileName = `برنامه-هفتگی-${dateLabel}.xlsx`
  XLSX.writeFile(wb, fileName)
  return fileName
}