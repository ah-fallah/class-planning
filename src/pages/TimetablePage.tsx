import { CalendarDays } from 'lucide-react'
import TimetableGrid from '@/components/TimetableGrid'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/pages/CoursesPage'
import { totalUnits, useStore } from '@/store/useStore'

export default function TimetablePage() {
  const courses = useStore((s) => s.courses)
  const selection = useStore((s) => s.selection)
  const units = totalUnits(useStore.getState())
  const hasSelection = Object.values(selection).some(Boolean)

  return (
    <Card>
      <CardContent className="pt-6">
        {hasSelection ? (
          <>
            <TimetableGrid courses={courses} selection={selection} />
            <p className="mt-3 text-sm text-muted-foreground">
              مجموع واحدها: {units} — کادر قرمز یعنی تداخل زمانی.
            </p>
          </>
        ) : (
          <EmptyState
            icon={<CalendarDays size={36} strokeWidth={1.5} />}
            title="هنوز درسی انتخاب نکرده‌اید"
            hint="از تب «انتخاب واحد» درس‌هایتان را علامت بزنید تا اینجا نمایش داده شوند."
          />
        )}
      </CardContent>
    </Card>
  )
}
