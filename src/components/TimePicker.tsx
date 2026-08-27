import { Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { faDigits } from '@/lib/jalali'
import { minToTime } from '@/lib/time'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  /** دقیقه از نیمه‌شب */
  value: number
  onChange: (min: number) => void
}

const FIRST_HOUR = 6
const LAST_HOUR = 22

/** همه‌ی اسلات‌های ۱۵ دقیقه‌ای از ۰۶:۰۰ تا ۲۲:۴۵ */
const SLOTS: number[] = (() => {
  const out: number[] = []
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    for (const m of [0, 15, 30, 45]) out.push(h * 60 + m)
  }
  return out
})()

export default function TimePicker({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      listRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: 'center' })
    }, 50)
    return () => clearTimeout(id)
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="flex h-9 w-24 items-center justify-between gap-2 rounded-sm border-2 border-foreground bg-background px-3 py-2 text-sm font-bold shadow-[2px_2px_0_var(--color-foreground)] transition-all hover:bg-secondary active:translate-y-[1px] active:shadow-[1px_1px_0_var(--color-foreground)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-foreground outline-none"
        >
          <span className="tabular-nums">{faDigits(minToTime(value))}</span>
          <Clock strokeWidth={2.5} size={14} className="opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 rounded-none border-[3px] border-foreground shadow-[6px_6px_0_var(--color-foreground)] overflow-hidden">
        <div ref={listRef} className="grid h-64 grid-cols-4 gap-[2px] bg-foreground border-b-2 border-foreground neo-scrollbar overflow-y-auto" dir="ltr">
          {SLOTS.map((min) => {
            const selected = min === value
            return (
              <button
                key={min}
                type="button"
                data-selected={selected}
                onClick={() => {
                  onChange(min)
                  setOpen(false)
                }}
                className={cn(
                  'px-2 py-2 text-[12px] font-black tabular-nums transition-all outline-none bg-background hover:bg-saffron focus-visible:bg-saffron focus-visible:z-10',
                  selected && 'bg-primary text-primary-foreground shadow-inner',
                )}
              >
                {faDigits(minToTime(min))}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
