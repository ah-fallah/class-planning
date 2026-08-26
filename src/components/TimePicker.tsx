import { Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
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
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: 'center' })
    })
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" id={id} size="sm" className="w-24 justify-between px-2.5 font-normal">
          <span>{faDigits(minToTime(value))}</span>
          <Clock className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div ref={listRef} className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
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
                  'rounded-md px-2 py-1.5 text-[12px] transition-colors',
                  selected ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-accent',
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
