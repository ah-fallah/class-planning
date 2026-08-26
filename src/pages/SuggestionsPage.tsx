import { Lightbulb, Sparkles, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { findBestCombos } from '@/lib/optimizer'
import { cn } from '@/lib/utils'
import type { SuggestionCombo } from '@/types'
import { useStore } from '@/store/useStore'
import { EmptyState } from '@/pages/CoursesPage'
import { dayName, minToTime } from '@/lib/time'

export default function SuggestionsPage() {
  const courses = useStore((s) => s.courses)
  const settings = useStore((s) => s.settings)
  const applyPicks = useStore((s) => s.applyPicks)
  const [ran, setRan] = useState(false)

  const [combos, incomplete] = useMemo(() => {
    if (!ran) return [[], false] as [SuggestionCombo[], boolean]
    return findBestCombos(courses, settings, 5)
  }, [ran, courses, settings])

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<Lightbulb size={36} strokeWidth={1.5} />}
            title="اول درس‌ها را اضافه کنید"
            hint="از تب «دروس» درس‌های ترمتان را ثبت کنید."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => setRan(true)}>
          <Sparkles /> پیدا کردن بهترین ترکیب‌ها
        </Button>
        <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
          بر اساس اولویت دروس و محدودیت {settings.minUnits} تا {settings.maxUnits} واحد، بهترین ۵
          ترکیب بدون تداخل پیشنهاد می‌شود.
        </p>
      </div>

      {ran && combos.length === 0 && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          هیچ ترکیب معتبری پیدا نشد. محدوده واحدها یا تداخل‌های بین گروه‌ها را بررسی کنید.
        </div>
      )}

      {incomplete && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" />
          <span>تعداد حالت‌ها زیاد بود و جستجو ناقص انجام شد؛ ممکن است ترکیب بهتر وجود داشته باشد.</span>
        </div>
      )}

      <div className="grid gap-3">
        {combos.map((combo, i) => {
          const pickedCourses = courses.filter((c) => combo.picks[c.id])
          const droppedCourses = courses.filter((c) => !combo.picks[c.id])
          const best = i === 0
          return (
            <Card
              key={i}
              className={cn(
                'relative overflow-hidden',
                best && 'border-saffron bg-saffron-soft ring-1 ring-saffron/50',
              )}
            >
              {best && (
                <div className="absolute inset-y-0 start-0 w-1 bg-saffron" aria-hidden />
              )}
              <CardContent className="pt-6">
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {best ? (
                    <Badge className="bg-saffron text-foreground hover:bg-saffron">
                      <Sparkles size={12} /> بهترین پیشنهاد
                    </Badge>
                  ) : null}
                  <strong>پیشنهاد {i + 1}</strong>
                  <span className={cn('text-xs', best ? 'text-foreground/70' : 'text-muted-foreground')}>
                    {pickedCourses.length} از {courses.length} درس — مجموع {combo.totalUnits} واحد —
                    امتیاز اولویت: {combo.score}
                  </span>
                  <span className="flex-1" />
                  <Button variant={best ? 'default' : 'outline'} size="sm" onClick={() => applyPicks(combo.picks)}>
                    اعمال این انتخاب
                  </Button>
                </div>

                <ul className="space-y-1 ps-5 text-sm leading-relaxed" style={{ listStyleType: 'disc' }}>
                  {pickedCourses.map((c) => {
                    const g = c.groups.find((g) => g.id === combo.picks[c.id])!
                    return (
                      <li key={c.id}>
                        <strong>{c.name}</strong> — گروه {g.number}
                        {g.instructor ? ` (${g.instructor})` : ''}
                        {g.sessions.map((s, si) => (
                          <span key={si} className="text-muted-foreground">
                            {' · '}
                            {dayName(s.day)} {minToTime(s.startMin)}–{minToTime(s.endMin)}
                          </span>
                        ))}
                      </li>
                    )
                  })}
                  {droppedCourses.length > 0 && (
                    <li className="text-muted-foreground">
                      حذف‌شده به دلیل محدودیت: {droppedCourses.map((c) => c.name).join('، ')}
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
