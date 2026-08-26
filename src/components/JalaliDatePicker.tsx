import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
        <Button type="button" variant="outline" id={id} className="w-44 justify-between font-normal">
          <span className={value ? '' : 'text-muted-foreground'}>
            {selected ? `${faDigits(selected.jd)} ${JALALI_MONTHS[selected.jm - 1]} ${faDigits(selected.jy)}` : 'انتخاب تاریخ'}
          </span>
          <span className="flex items-center gap-0.5">
            {value && (
              <X
                className="size-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('')
                }}
              />
            )}
            <CalendarDays className="size-4 opacity-60" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        {/* سرصفحه ماه/سال */}
        <div className="mb-2 flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon-xs" aria-label="ماه قبل" onClick={() => move(-1)}>
            <ChevronRight />
          </Button>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <select
              aria-label="ماه"
              className="rounded-md bg-transparent px-1 py-0.5 hover:bg-accent"
              value={viewMonth}
              onChange={(e) => setViewMonth(+e.target.value)}
            >
              {JALALI_MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              aria-label="سال"
              className="rounded-md bg-transparent px-1 py-0.5 hover:bg-accent"
              value={viewYear}
              onChange={(e) => setViewYear(+e.target.value)}
            >
              {Array.from({ length: 21 }, (_, i) => 1400 + i).map((y) => (
                <option key={y} value={y}>{faDigits(y)}</option>
              ))}
            </select>
          </div>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="ماه بعد" onClick={() => move(1)}>
            <ChevronLeft />
          </Button>
        </div>

        {/* شبکه روزها */}
        <table className="w-full border-separate border-spacing-y-0.5 text-center text-[13px]">
          <thead>
            <tr className="text-[11px] text-muted-foreground">
              {WEEKDAY_HEADS.map((h, i) => (
                <th key={i} className="font-medium pb-1 w-9">{h}</th>
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
                          'size-8 rounded-md text-center transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : isToday
                              ? 'bg-accent font-semibold'
                              : 'hover:bg-accent',
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

        {/* پانویس */}
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
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
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              حذف تاریخ
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
