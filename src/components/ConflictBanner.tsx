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
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
        <span>انتخاب فعلی بدون تداخل است و مجموع واحدها ({units}) در محدوده مجاز است.</span>
      </div>
    )
  }

  return (
    <>
      {sessionConflicts.length > 0 && (
        <Banner tone="error" icon={<XCircle size={18} className="mt-0.5 shrink-0" />} title={`${sessionConflicts.length} تداخل کلاس:`}>
          <ul className="list-disc pe-5">
            {sessionConflicts.map((c, i) => (
              <li key={i}>{c.label}</li>
            ))}
          </ul>
        </Banner>
      )}
      {examConflicts.length > 0 && (
        <Banner tone="warning" icon={<CalendarX size={18} className="mt-0.5 shrink-0" />} title={`${examConflicts.length} تداخل امتحان:`}>
          <ul className="list-disc pe-5">
            {examConflicts.map((c, i) => (
              <li key={i}>{c.label}</li>
            ))}
          </ul>
        </Banner>
      )}
      {overMax && (
        <Banner tone="error" icon={<XCircle size={18} className="mt-0.5 shrink-0" />}>
          مجموع واحدها ({units}) از سقف مجاز ({settings.maxUnits}) بیشتر است.
        </Banner>
      )}
      {underMin && (
        <Banner tone="warning" icon={<AlertTriangle size={18} className="mt-0.5 shrink-0" />}>
          مجموع واحدها ({units}) از حداقل مجاز ({settings.minUnits}) کمتر است.
        </Banner>
      )}
    </>
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
      ? 'border-destructive/30 bg-destructive/10'
      : 'border-warning/40 bg-warning/10'
  return (
    <div className={`mb-4 flex items-start gap-2.5 rounded-xl border ${styles} px-4 py-3 text-sm`}>
      <span className={tone === 'error' ? 'text-destructive' : 'text-warning'}>{icon}</span>
      <span className="flex-1 leading-relaxed">
        {title && <strong className="font-bold">{title}</strong>}
        {children}
      </span>
    </div>
  )
}
