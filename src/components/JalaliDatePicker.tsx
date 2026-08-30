import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  JALALI_MONTHS,
  faDigits,
  isoToJalali,
  jalaliMonthLength,
  jalaliToISO,
  toGregorian,
  todayISO,
} from '@/lib/jalali'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  /** ISO میلادی "YYYY-MM-DD" یا رشته خالی */
  value: string
  onChange: (iso: string) => void
}

/** روز هفته شمسی: ۰=شنبه … ۶=جمعه */
const WEEKDAY_HEADS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

function firstWeekdayOfJalaliMonth(jy: number, jm: number): number {
  const { gy, gm, gd } = toGregorian(jy, jm, 1)
  const d = new Date(Date.UTC(gy, gm - 1, gd))
  // JS getUTCDay: 0=یکشنبه..6=شنبه -> تبدیل به ۰=شنبه
  return (d.getUTCDay() + 1) % 7
}

export default function JalaliDatePicker({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const selected = value ? isoToJalali(value) : null

  const initial = selected ?? (() => {
    const t = isoToJalali(todayISO())!
    return { jy: t.jy, jm: Math.min(t.jm + 1, 12), jd: t.jd }
  })()
  const [viewYear, setViewYear] = useState(initial.jy)
  const [viewMonth, setViewMonth] = useState(initial.jm)

  const daysInMonth = jalaliMonthLength(viewYear, viewMonth)
  const firstWeekday = firstWeekdayOfJalaliMonth(viewYear, viewMonth)
  const todayJ = isoToJalali(todayISO())

  function move(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m > 12) { m = 1; y += 1 }
    if (m < 1) { m = 12; y -= 1 }
    setViewYear(y)
    setViewMonth(m)
  }

  function select(jd: number) {
    onChange(jalaliToISO(viewYear, viewMonth, jd))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="flex h-9 w-44 items-center justify-between gap-2 rounded-sm border-2 border-brutal-ink bg-background px-3 py-2 text-sm font-bold shadow-[2px_2px_0_var(--brutal-ink)] transition-all hover:bg-secondary active:translate-y-[1px] active:shadow-[1px_1px_0_var(--brutal-ink)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-foreground outline-none"
        >
          <span className={value ? '' : 'text-muted-foreground font-medium'}>
            {selected ? `${faDigits(selected.jd)} ${JALALI_MONTHS[selected.jm - 1]} ${faDigits(selected.jy)}` : 'انتخاب تاریخ'}
          </span>
          <span className="flex items-center gap-1">
            {value && (
              <X
                className="size-4 opacity-50 hover:opacity-100 transition-opacity"
                strokeWidth={3}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('')
                }}
              />
            )}
            <CalendarDays strokeWidth={2.5} size={16} className="opacity-60" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 rounded-none border-[3px] border-brutal-ink shadow-[6px_6px_0_var(--brutal-ink)] overflow-hidden bg-background">
        {/* سرصفحه ماه/سال */}
        <div className="flex items-center justify-between border-b-2 border-brutal-ink bg-saffron/10 px-3 py-2">
          <button type="button" aria-label="ماه قبل" onClick={() => move(-1)} className="flex size-6 items-center justify-center rounded-none border-2 border-brutal-ink bg-background hover:bg-saffron active:translate-y-[1px] transition-all">
            <ChevronRight strokeWidth={3} size={14} />
          </button>
          <div className="flex items-center gap-1 text-sm font-black tracking-wide">
            <select
              aria-label="ماه"
              className="rounded-none border-2 border-brutal-ink bg-background px-1 py-0.5 hover:bg-saffron outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              value={viewMonth}
              onChange={(e) => setViewMonth(+e.target.value)}
            >
              {JALALI_MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              aria-label="سال"
              className="rounded-none border-2 border-brutal-ink bg-background px-1 py-0.5 hover:bg-saffron outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              value={viewYear}
              onChange={(e) => setViewYear(+e.target.value)}
            >
              {Array.from({ length: 21 }, (_, i) => 1400 + i).map((y) => (
                <option key={y} value={y}>{faDigits(y)}</option>
              ))}
            </select>
          </div>
          <button type="button" aria-label="ماه بعد" onClick={() => move(1)} className="flex size-6 items-center justify-center rounded-none border-2 border-brutal-ink bg-background hover:bg-saffron active:translate-y-[1px] transition-all">
            <ChevronLeft strokeWidth={3} size={14} />
          </button>
        </div>

        {/* شبکه روزها */}
        <div className="p-3">
          <table className="w-full border-separate border-spacing-y-1 border-spacing-x-1 text-center text-[13px]">
            <thead>
              <tr className="text-[11px] text-muted-foreground font-black">
                {WEEKDAY_HEADS.map((h, i) => (
                  <th key={i} className="pb-1 w-8">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) }).map((_, row) => (
                <tr key={row}>
                  {Array.from({ length: 7 }).map((_, col) => {
                    const cellIdx = row * 7 + col
                    const jd = cellIdx - firstWeekday + 1
                    if (jd < 1 || jd > daysInMonth) return <td key={col} />
                    const isToday = todayJ && todayJ.jy === viewYear && todayJ.jm === viewMonth && todayJ.jd === jd
                    const isSelected = selected && selected.jy === viewYear && selected.jm === viewMonth && selected.jd === jd
                    return (
                      <td key={col}>
                        <button
                          type="button"
                          onClick={() => select(jd)}
                          className={cn(
                            'size-8 rounded-none border-2 text-center tabular-nums transition-all outline-none font-bold',
                            isSelected
                              ? 'bg-primary border-brutal-ink text-primary-foreground shadow-[2px_2px_0_var(--brutal-ink)] translate-x-[-1px] translate-y-[-1px] font-black'
                              : isToday
                                ? 'bg-secondary border-brutal-ink border-dashed hover:bg-saffron hover:border-solid'
                                : 'border-transparent hover:border-brutal-ink hover:bg-secondary/50',
                          )}
                        >
                          {faDigits(jd)}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* پانویس */}
        <div className="flex items-center justify-between border-t-2 border-brutal-ink bg-muted/30 px-3 py-2">
          <button
            type="button"
            className="rounded-none border-2 border-brutal-ink bg-background px-2 py-1 text-xs font-bold shadow-[2px_2px_0_var(--brutal-ink)] transition-all hover:-translate-y-[1px] hover:bg-secondary active:translate-y-0 active:shadow-none"
            onClick={() => {
              const t = todayISO()
              onChange(t)
              const j = isoToJalali(t)!
              setViewYear(j.jy)
              setViewMonth(j.jm)
              setOpen(false)
            }}
          >
            امروز
          </button>
          {value && (
            <button
              type="button"
              className="rounded-none border-2 border-brutal-ink bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive-foreground shadow-[2px_2px_0_var(--brutal-ink)] transition-all hover:-translate-y-[1px] hover:bg-destructive hover:text-white active:translate-y-0 active:shadow-none"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              حذف تاریخ
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
