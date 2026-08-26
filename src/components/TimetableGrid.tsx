import { cn } from '@/lib/utils'
import type { Course, DayIndex, Group, SelectionMap } from '@/types'
import { DAY_NAMES, minToTime, sessionsOverlap } from '@/lib/time'

export const START_HOUR = 7
export const END_HOUR = 20
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60

export const BLOCK_COLORS = [
  'bg-sky-700 dark:bg-sky-500',
  'bg-violet-700 dark:bg-violet-500',
  'bg-cyan-700 dark:bg-cyan-600',
  'bg-emerald-700 dark:bg-emerald-600',
  'bg-orange-700 dark:bg-orange-600',
  'bg-rose-700 dark:bg-rose-600',
  'bg-pink-700 dark:bg-pink-600',
  'bg-indigo-700 dark:bg-indigo-500',
  'bg-teal-700 dark:bg-teal-600',
  'bg-lime-700 dark:bg-lime-600',
]

export function blockColorFor(courses: Course[], courseId: string): string {
  return BLOCK_COLORS[Math.max(0, courses.findIndex((c) => c.id === courseId)) % BLOCK_COLORS.length]
}

interface Block {
  course: Course
  group: Group
  day: DayIndex
  startMin: number
  endMin: number
  conflict: boolean
}

export default function TimetableGrid({
  courses,
  selection,
}: {
  courses: Course[]
  selection: SelectionMap
}) {
  const blocks: Block[] = []
  for (const c of courses) {
    const gid = selection[c.id]
    if (!gid) continue
    const g = c.groups.find((x) => x.id === gid)
    if (!g) continue
    for (const s of g.sessions) {
      blocks.push({
        course: c,
        group: g,
        day: s.day,
        startMin: s.startMin,
        endMin: s.endMin,
        conflict: false,
      })
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (
        sessionsOverlap(
          { day: blocks[i].day, startMin: blocks[i].startMin, endMin: blocks[i].endMin },
          { day: blocks[j].day, startMin: blocks[j].startMin, endMin: blocks[j].endMin },
        )
      ) {
        blocks[i].conflict = true
        blocks[j].conflict = true
      }
    }
  }

  const days = DAY_NAMES.slice(0, 6)

  return (
    <div className="rounded-sm border-2 border-foreground bg-card shadow-[4px_4px_0_var(--color-foreground)]">
      {/* سربرگ روزها */}
      <div className="grid grid-cols-[52px_repeat(6,minmax(0,1fr))] border-b-2 border-foreground bg-foreground text-background">
        <div />
        {days.map((d) => (
          <div key={d} className="truncate py-2 text-center text-xs font-black tracking-wide">
            {d}
          </div>
        ))}
      </div>
      {/* بدنه — ارتفاع واکنش‌گرا تا کل جدول بدون اسکرول در دید بماند */}
      <div className="grid h-[clamp(340px,calc(100dvh_-_300px),620px)] grid-cols-[52px_repeat(6,minmax(0,1fr))]">
        <div className="relative border-e-2 border-foreground">
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR).map((h) => (
            <span
              key={h}
              className="absolute inset-x-0 text-center text-sm font-bold tabular-nums text-foreground/60"
              style={{
                top: `${(((h - START_HOUR) * 60) / TOTAL_MIN) * 100}%`,
                transform: h === START_HOUR ? undefined : 'translateY(-50%)',
              }}
            >
              {`${String(h).padStart(2, '0')}:00`}
            </span>
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((day) => (
          <DayColumn
            key={day}
            day={day}
            blocks={blocks.filter((b) => b.day === day)}
            courseColor={(id) => blockColorFor(courses, id)}
          />
        ))}
      </div>
    </div>
  )
}

function DayColumn({
  day,
  blocks,
  courseColor,
}: {
  day: number
  blocks: Block[]
  courseColor: (courseId: string) => string
}) {
  return (
    <div className="relative border-e-2 border-foreground last:border-e-0" data-day={day}>
      {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute inset-x-0 border-t border-foreground/20"
          style={{ top: `${((i * 60) / TOTAL_MIN) * 100}%` }}
        />
      ))}
      {blocks.map((b, bi) => {
        const topPct = ((b.startMin - START_HOUR * 60) / TOTAL_MIN) * 100
        const heightPct = ((b.endMin - b.startMin) / TOTAL_MIN) * 100
        if (topPct >= 100 || topPct + heightPct <= 0) return null
        return (
          <div
            key={`${b.course.id}-${bi}`}
            title={`${b.course.name} — گروه ${b.group.number}`}
            className={cn(
              'absolute inset-x-0.5 overflow-hidden rounded-none border-2 border-foreground px-1.5 py-0.5 text-[10px] leading-snug text-white shadow-[2px_2px_0_var(--color-foreground)]',
              courseColor(b.course.id),
              b.conflict &&
                'outline outline-2 outline-offset-[-2px] outline-destructive',
            )}
            style={{
              top: `${Math.max(0, topPct)}%`,
              height: `${heightPct}%`,
              minHeight: 24,
            }}
          >
            <span className="block truncate font-black">{b.course.name}</span>
            <span className="block truncate opacity-90">
              گ{b.group.number} {minToTime(b.startMin)}–{minToTime(b.endMin)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
