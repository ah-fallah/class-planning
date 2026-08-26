import { cn } from '@/lib/utils'
import { AlertTriangle, CalendarX, CheckCircle2, XCircle } from 'lucide-react'
import type { ConflictInfo } from '@/lib/conflicts'
import type { Settings } from '@/types'

interface Props {
  conflicts: ConflictInfo[]
  units: number
  settings: Settings
}

export default function ConflictBanner({ conflicts, units, settings }: Props) {
  const sessionConflicts = conflicts.filter((c) => c.kind === 'session')
  const examConflicts = conflicts.filter((c) => c.kind === 'exam')
  const overMax = units > settings.maxUnits
  const underMin = units > 0 && units < settings.minUnits

  if (conflicts.length === 0 && !overMax && !underMin) {
    if (units === 0) return null
    return (
      <div className="relative flex items-start gap-2.5 overflow-hidden rounded-none border-2 border-foreground px-3.5 py-3 text-sm text-foreground shadow-[3px_3px_0_var(--color-foreground)]">
         <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `repeating-linear-gradient(-45deg, var(--color-success), var(--color-success) 10px, transparent 10px, transparent 20px)`
          }}
        />
        <div className="absolute inset-0 bg-success/10 -z-10" />
        <CheckCircle2 size={16} className="relative z-10 mt-0.5 shrink-0 text-success" />
        <span className="relative z-10 font-bold">انتخاب فعلی بدون تداخل است و مجموع واحدها ({units}) در محدوده مجاز است.</span>
      </div>
    )
  }

  return (
    <div className="rounded-sm border-2 border-foreground bg-card p-3 shadow-[3px_3px_0_var(--color-foreground)]">
      <h3 className="mb-2 flex items-center gap-1.5 px-0.5 text-sm font-bold">
        <AlertTriangle size={14} className="text-saffron" />
        خطاها و اخطارها
      </h3>
      <div className="flex flex-col gap-2">
        {sessionConflicts.length > 0 && (
          <Banner tone="error" icon={<XCircle size={15} className="mt-0.5 shrink-0" />} title={`${sessionConflicts.length} تداخل کلاس:`}>
            <ul className="list-disc pe-5">
              {sessionConflicts.map((c, i) => (
                <li key={i}>{c.label}</li>
              ))}
            </ul>
          </Banner>
        )}
        {examConflicts.length > 0 && (
          <Banner tone="warning" icon={<CalendarX size={15} className="mt-0.5 shrink-0" />} title={`${examConflicts.length} تداخل امتحان:`}>
            <ul className="list-disc pe-5">
              {examConflicts.map((c, i) => (
                <li key={i}>{c.label}</li>
              ))}
            </ul>
          </Banner>
        )}
        {overMax && (
          <Banner tone="error" icon={<XCircle size={15} className="mt-0.5 shrink-0" />}>
            مجموع واحدها ({units}) از سقف مجاز ({settings.maxUnits}) بیشتر است.
          </Banner>
        )}
        {underMin && (
          <Banner tone="warning" icon={<AlertTriangle size={15} className="mt-0.5 shrink-0" />}>
            مجموع واحدها ({units}) از حداقل مجاز ({settings.minUnits}) کمتر است.
          </Banner>
        )}
      </div>
    </div>
  )
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'error' | 'warning'
  icon?: React.ReactNode
  title?: string
  children?: React.ReactNode
}) {
  const isError = tone === 'error'
  const stripeColor = isError ? 'var(--color-destructive)' : 'var(--color-warning)'
  const stripeBg = isError ? 'oklch(from var(--color-destructive) l c h / 0.1)' : 'oklch(from var(--color-warning) l c h / 0.1)'

  return (
    <div
      className={cn(
        "relative flex items-start gap-2 overflow-hidden rounded-none border-2 border-foreground px-3 py-2.5 text-xs shadow-[3px_3px_0_var(--color-foreground)]",
      )}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `repeating-linear-gradient(-45deg, ${stripeColor}, ${stripeColor} 10px, transparent 10px, transparent 20px)`
        }}
      />
      <div className="absolute inset-0" style={{ backgroundColor: stripeBg, zIndex: -1 }} />

      <span className={isError ? 'text-destructive relative z-10' : 'text-warning relative z-10'}>{icon}</span>
      <span className="flex-1 leading-relaxed relative z-10">
        {title && <strong className="font-black">{title}</strong>}{' '}
        {children}
      </span>
    </div>
  )
}
