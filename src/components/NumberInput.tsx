import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberInputProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  className?: string
  id?: string
}

export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  className,
  id,
}: NumberInputProps) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1)
  }

  const handleIncrement = () => {
    if (value < max) onChange(value + 1)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (isNaN(val)) return
    if (val >= min && val <= max) {
      onChange(val)
    }
  }

  return (
    <div className={cn('flex h-12 w-full', className)} dir="ltr">
      <button
        type="button"
        tabIndex={-1}
        onClick={handleDecrement}
        disabled={value <= min}
        className="flex shrink-0 aspect-square h-full items-center justify-center border-2 border-foreground bg-primary/20 transition-all hover:bg-primary active:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
      >
        <Minus size={18} strokeWidth={3} className="text-foreground" />
      </button>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        className="h-full min-w-0 flex-1 border-y-2 border-foreground bg-background px-2 text-center text-lg font-black outline-none focus-visible:bg-secondary"
      />

      <button
        type="button"
        tabIndex={-1}
        onClick={handleIncrement}
        disabled={value >= max}
        className="flex shrink-0 aspect-square h-full items-center justify-center border-2 border-foreground bg-primary/20 transition-all hover:bg-primary active:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus size={18} strokeWidth={3} className="text-foreground" />
      </button>
    </div>
  )
}
