import type { Course, DayIndex, Group, SelectionMap } from '@/types'
import { DAY_NAMES, END_HOUR, minToTime, sessionsOverlap, START_HOUR } from '@/lib/time'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const TOTAL_MIN = (END_HOUR - START_HOUR) * 60

interface BlockColor {
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
  const colorMap = buildCourseColorMap(courses)
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
    <div className="rounded-sm border-2 border-foreground bg-card shadow-[4px_4px_0_var(--color-foreground)] flex flex-col flex-1 min-h-[500px] lg:min-h-0 overflow-hidden">
      <div className="flex flex-col h-full">
        {/* سربرگ روزها */}
        <div className="shrink-0 grid grid-cols-[52px_repeat(6,minmax(0,1fr))] border-b-2 border-foreground bg-foreground text-background">
            <div />
            {days.map((d) => (
              <div key={d} className="truncate py-2 text-center text-xs font-black tracking-wide">
                {d}
              </div>
            ))}
          </div>
          {/* بدنه — ارتفاع 반응‌گرا متناسب با والد */}
          <div className="flex-1 min-h-[400px] lg:min-h-0 grid grid-cols-[52px_repeat(6,minmax(0,1fr))]">
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
            courseColor={(id) => colorMap.get(id) ?? BASE_COLORS[0]}
          />
        ))}
        </div>
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
  courseColor: (courseId: string) => BlockColor
}) {
  // محاسبه گروه‌های همپوشان برای تنظیم عرض و موقعیت
  const positions = blocks.map(() => ({ width: 100, left: 0 }))

  // مرتب‌سازی بر اساس زمان شروع
  const sortedIndices = blocks.map((_, i) => i).sort((a, b) => blocks[a].startMin - blocks[b].startMin)

  // پیدا کردن کلاسترهای تداخل
  const clusters: number[][] = []
  let currentCluster: number[] = []
  let clusterEnd = 0

  for(const idx of sortedIndices) {
      const b = blocks[idx]
      if(currentCluster.length === 0 || b.startMin < clusterEnd) {
          currentCluster.push(idx)
          clusterEnd = Math.max(clusterEnd, b.endMin)
      } else {
          clusters.push(currentCluster)
          currentCluster = [idx]
          clusterEnd = b.endMin
      }
  }
  if(currentCluster.length > 0) clusters.push(currentCluster)

  for(const cluster of clusters) {
      const columns: number[][] = []
      for(const idx of cluster) {
          const b = blocks[idx]
          const col = columns.find(col => blocks[col[col.length-1]].endMin <= b.startMin)
          if(col) col.push(idx)
          else columns.push([idx])
      }
      const numCols = columns.length
      for(let i=0; i < numCols; i++) {
          for(const idx of columns[i]) {
              const b = blocks[idx]
              let colspan = 1
              for (let c = i + 1; c < numCols; c++) {
                  const collisionInCol = columns[c].some(cIdx => {
                      const other = blocks[cIdx]
                      return sessionsOverlap(
                          { day: b.day, startMin: b.startMin, endMin: b.endMin },
                          { day: other.day, startMin: other.startMin, endMin: other.endMin }
                      )
                  })
                  if (collisionInCol) {
                      break
                  }
                  colspan++
              }

              positions[idx] = {
                  width: (100 / numCols) * colspan,
                  left: (i * 100) / numCols
              }
          }
      }
  }

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

        const pos = positions[bi]
        const color = courseColor(b.course.id)

        return (
          <Tooltip key={`${b.course.id}-${bi}`}>
            <TooltipTrigger asChild onClick={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()}>
              <div
                className="absolute overflow-hidden rounded-none border-2 border-foreground text-[10px] leading-snug shadow-[2px_2px_0_var(--color-foreground)] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--color-foreground)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--color-foreground)] cursor-default hover:z-10 group"
                style={{
                  top: `${Math.max(0, topPct)}%`,
                  height: `calc(${heightPct}% - 3px)`,
                  minHeight: 24,
                  width: `calc(${pos.width}% - 4px)`,
                  right: `calc(${pos.left}% + 2px)`,
                  backgroundColor: color.bg,
                  color: color.fg,
                }}
              >
                {b.conflict && (
                  <div
                    className="absolute inset-0 opacity-30 pointer-events-none animate-stripes"
                    style={{
                      background: `repeating-linear-gradient(-45deg, var(--color-foreground), var(--color-foreground) 6px, transparent 6px, transparent 12px)`,
                      backgroundSize: '17px 17px'
                    }}
                  />
                )}
                {/* هیچ متنی اینجا نشان داده نمی‌شود، فقط باکس رنگی */}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              sideOffset={4}
              onPointerDownOutside={(e) => {
                e.preventDefault()
              }}
              className="rounded-none border-2 border-foreground px-3 py-2 shadow-[4px_4px_0_var(--color-foreground)] z-50"
              style={{ backgroundColor: color.bg, color: color.fg }}
            >
              <div className="flex flex-col gap-1" dir="rtl">
                <span className="font-black text-xs">{b.course.name}</span>
                <span className="opacity-90 font-bold">
                  گروه {b.group.number} {b.group.instructor && `— ${b.group.instructor}`}
                </span>
                <span className="opacity-90">
                  {minToTime(b.startMin)} تا {minToTime(b.endMin)}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
