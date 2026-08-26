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
      <div className="flex items-start gap-2.5 rounded-sm border-2 border-success bg-success/15 px-3.5 py-3 text-sm text-foreground shadow-[3px_3px_0_var(--color-success)]">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
        <span>انتخاب فعلی بدون تداخل است و مجموع واحدها ({units}) در محدوده مجاز است.</span>
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
  const styles =
    tone === 'error'
      ? 'border-2 border-destructive bg-destructive/10'
      : 'border-2 border-warning bg-warning/10'
  return (
    <div className={`flex items-start gap-2 rounded-sm ${styles} px-3 py-2.5 text-xs shadow-[2px_2px_0_var(--color-foreground)]`}>
      <span className={tone === 'error' ? 'text-destructive' : 'text-warning'}>{icon}</span>
      <span className="flex-1 leading-relaxed">
        {title && <strong className="font-bold">{title}</strong>}{' '}
        {children}
      </span>
    </div>
  )
}
