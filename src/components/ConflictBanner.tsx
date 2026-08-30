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
      <div className="relative flex items-center gap-2.5 overflow-hidden rounded-none border-2 border-brutal-ink bg-success text-success-foreground px-3.5 py-3 text-sm shadow-[3px_3px_0_var(--brutal-ink)]">
        <CheckCircle2 size={18} strokeWidth={2.5} className="shrink-0" />
        <span className="font-bold">انتخاب فعلی عالیست! بدون تداخل و در محدوده مجاز.</span>
      </div>
    )
  }

  return (
    <div className="rounded-sm border-2 border-brutal-ink bg-card p-3 shadow-[3px_3px_0_var(--brutal-ink)]">
      <h3 className="mb-3 flex items-center gap-2 px-0.5 text-sm font-black uppercase tracking-wider">
        <AlertTriangle size={16} strokeWidth={2.5} className="text-destructive" />
        نیازمند بررسی
      </h3>
      <div className="flex flex-col gap-2.5">
        {sessionConflicts.length > 0 && (
          <Banner tone="error" icon={<XCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />} title={`${sessionConflicts.length} تداخل کلاسی پیدا شد:`}>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {sessionConflicts.map((c, i) => (
                <div key={i} className="rounded-sm border border-brutal-ink/30 bg-background/50 px-2 py-1.5 font-bold text-foreground">
                  {c.label}
                </div>
              ))}
            </div>
          </Banner>
        )}
        {examConflicts.length > 0 && (
          <Banner tone="warning" icon={<CalendarX size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />} title={`${examConflicts.length} امتحان همزمان:`}>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {examConflicts.map((c, i) => (
                <div key={i} className="rounded-sm border border-brutal-ink/30 bg-background/50 px-2 py-1.5 font-bold text-foreground">
                  {c.label}
                </div>
              ))}
            </div>
          </Banner>
        )}
        {overMax && (
          <Banner tone="error" icon={<XCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />}>
            مجموع واحدها (<span className="text-base font-black">{units}</span>) از سقف مجاز عبور کرده است.
          </Banner>
        )}
        {underMin && (
          <Banner tone="warning" icon={<AlertTriangle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />}>
            حداقل واحد رعایت نشده! (<span className="text-base font-black">{units}</span> واحد انتخاب شده)
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

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 overflow-hidden rounded-sm border-2 border-brutal-ink px-3 py-2.5 text-xs shadow-[2px_2px_0_var(--brutal-ink)] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--brutal-ink)]",
        isError ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
      )}
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(-45deg, currentColor, currentColor 10px, transparent 10px, transparent 20px)`
        }}
      />

      <div className="flex items-start gap-2 relative z-10">
        <span className="shrink-0">{icon}</span>
        <div className="flex-1 leading-relaxed">
          {title && <strong className="block text-[13px] font-black">{title}</strong>}
          {children}
        </div>
      </div>
    </div>
  )
}
