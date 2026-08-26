import { ListChecks } from 'lucide-react'
import ConflictBanner from '@/components/ConflictBanner'
import { EmptyState } from '@/pages/CoursesPage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { findConflicts } from '@/lib/conflicts'
import { dayName, minToTime } from '@/lib/time'
import { totalUnits, useStore } from '@/store/useStore'
import type { Course } from '@/types'

export default function SelectionPage() {
  const courses = useStore((s) => s.courses)
  const selection = useStore((s) => s.selection)
  const settings = useStore((s) => s.settings)
  const setSelection = useStore((s) => s.setSelection)
  const clearSelection = useStore((s) => s.clearSelection)

  const units = totalUnits(useStore.getState())
  const conflicts = findConflicts(courses, selection)
  const selectedCount = Object.values(selection).filter(Boolean).length

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<ListChecks size={36} strokeWidth={1.5} />}
            title="اول درس‌ها را اضافه کنید"
            hint="از تب «دروس» درس‌های ترمتان را ثبت کنید تا بتوانید انتخاب واحد کنید."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm text-muted-foreground">
          <strong className="text-foreground">{selectedCount}</strong> درس انتخاب‌شده — مجموع{' '}
          <strong className="text-foreground">{units}</strong> واحد (مجاز: {settings.minUnits} تا{' '}
          {settings.maxUnits})
        </p>
        <Button variant="outline" size="sm" onClick={clearSelection}>
          پاک کردن انتخاب‌ها
        </Button>
      </div>

      <ConflictBanner conflicts={conflicts} units={units} settings={settings} />

      <div className="grid gap-3">
        {courses.map((c) => (
          <CoursePickCard
            key={c.id}
            course={c}
            selectedGroupId={selection[c.id] ?? null}
            onPick={(gid) => setSelection(c.id, gid)}
          />
        ))}
      </div>
    </>
  )
}

function CoursePickCard({
  course,
  selectedGroupId,
  onPick,
}: {
  course: Course
  selectedGroupId: string | null
  onPick: (gid: string | null) => void
}) {
  return (
    <Card
      className={
        selectedGroupId !== null ? 'border-primary/40 ring-1 ring-primary/20' : undefined
      }
    >
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Label className="flex cursor-pointer items-center gap-2.5 text-[15px] font-bold">
            <Checkbox
              checked={selectedGroupId !== null}
              onCheckedChange={(v) => onPick(v ? course.groups[0].id : null)}
            />
            {course.name}
          </Label>
          <Badge variant="secondary">{course.units} واحد</Badge>
          <span className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground">اولویت: {course.priority}/۵</span>
        </div>

        {selectedGroupId !== null && course.groups.length > 0 && (
          <div className="mt-3 ps-7">
            <Select value={selectedGroupId} onValueChange={(v) => onPick(v)}>
              <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {course.groups.map((g) => {
                  const times = g.sessions
                    .map((s) => `${dayName(s.day)} ${minToTime(s.startMin)}`)
                    .join(' و ')
                  return (
                    <SelectItem key={g.id} value={g.id}>
                      گروه {g.number}
                      {g.instructor ? ` — ${g.instructor}` : ''}
                      {times ? ` (${times})` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
