import type { Course, Group, SelectionMap } from '../types'
import { sessionsOverlap } from './time'
import { formatJalaliDate } from './jalali'

export interface ConflictInfo {
  courseA: string
  groupA: string
  courseB: string
  groupB: string
  kind: 'session' | 'exam'
  label: string
}

export function findConflicts(
  courses: Course[],
  selection: SelectionMap,
): ConflictInfo[] {
  const chosen: { courseId: string; groupName: string; group: Group; courseName: string; units: number }[] = []
  for (const c of courses) {
    const gid = selection[c.id]
    if (!gid) continue
    const g = c.groups.find((x) => x.id === gid)
    if (g) chosen.push({ courseId: c.id, groupName: g.number, group: g, courseName: c.name, units: c.units })
  }

  const conflicts: ConflictInfo[] = []
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const a = chosen[i]
      const b = chosen[j]

      for (const sa of a.group.sessions) {
        for (const sb of b.group.sessions) {
          if (sessionsOverlap(sa, sb)) {
            conflicts.push({
              courseA: a.courseName,
              groupA: a.groupName,
              courseB: b.courseName,
              groupB: b.groupName,
              kind: 'session',
              label: `تداخل کلاس «${a.courseName}» و «${b.courseName}»`,
            })
            break
          }
        }
        if (conflicts.some((c) => c.courseA === a.courseName && c.courseB === b.courseName && c.kind === 'session')) break
      }

      if (a.group.exam && b.group.exam) {
        const ea = a.group.exam
        const eb = b.group.exam
        if (
          ea.dateISO === eb.dateISO &&
          ea.startMin < eb.endMin &&
          eb.startMin < ea.endMin
        ) {
          conflicts.push({
            courseA: a.courseName,
            groupA: a.groupName,
            courseB: b.courseName,
            groupB: b.groupName,
            kind: 'exam',
            label: `تداخل امتحان «${a.courseName}» و «${b.courseName}» در تاریخ ${formatJalaliDate(ea.dateISO)}`,
          })
        }
      }
    }
  }
  return conflicts
}
