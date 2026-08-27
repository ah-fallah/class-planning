import {
  GraduationCap,
  Lightbulb,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  CalendarDays,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import ConflictBanner from '@/components/ConflictBanner'
import CourseForm from '@/components/CourseForm'
import ImportDialog from '@/components/ImportDialog'
import TimetableGrid from '@/components/TimetableGrid'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { findBestCombos } from '@/lib/optimizer'
import { findConflicts } from '@/lib/conflicts'
import { blockColorFor } from '@/components/TimetableGrid'
import { DAY_NAMES, minToTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { totalUnits, useStore } from '@/store/useStore'
import type { Course } from '@/types'

export default function DashboardPage() {
  const courses = useStore((s) => s.courses)
  const selection = useStore((s) => s.selection)
  const settings = useStore((s) => s.settings)
  const setSelection = useStore((s) => s.setSelection)
  const clearSelection = useStore((s) => s.clearSelection)
  const applyPicks = useStore((s) => s.applyPicks)
  const addCourse = useStore((s) => s.addCourse)
  const updateCourse = useStore((s) => s.updateCourse)
  const deleteCourse = useStore((s) => s.deleteCourse)

  const [formOpen, setFormOpen] = useState<false | 'new' | Course>(false)
  const [importOpen, setImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const units = totalUnits({ courses, selection })
  const conflicts = findConflicts(courses, selection)

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col lg:justify-center min-h-[100dvh] px-4 py-6 pb-16 sm:px-6 lg:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-4 border-foreground pb-4 shrink-0">
        <h1 className="flex items-center gap-2 text-xl font-black tracking-wider">
          <CalendarDays strokeWidth={2.5} size={24} className="text-foreground" />
          برنامه‌ریز انتخاب واحد
        </h1>
      </header>
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_270px] lg:h-[clamp(500px,calc(100dvh_-_200px),800px)]">
      {/* ستون راست: درس‌ها */}
      <section aria-label="دروس" className="order-1 flex flex-col min-h-0 rounded-sm border-2 border-foreground bg-card pt-3.5 pb-0 px-0 shadow-[4px_4px_0_var(--color-foreground)]">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground pb-2 shrink-0 px-3.5">
          <h2 className="text-sm font-black tracking-wide">درس‌های من</h2>
          <span className="flex-1" />
          <Button size="xs" onClick={() => setFormOpen('new')}>
            <Plus /> درس
          </Button>
          <Button size="xs" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload /> اکسل
          </Button>
        </div>

        {/* لیست کارت‌ها در باکس اسکرول‌شونده؛ کل ارتفاع باقی‌مانده رو می‌گیره */}
        <ScrollArea className="flex-1 min-h-0" type="always">
          <div dir="rtl" className="flex flex-col gap-3 [&>*]:shrink-0 px-3.5 pt-3 pb-3 w-full box-border">
        {courses.length === 0 && (
          <Card className="border-[3px] border-dashed">
            <CardContent className="pt-6 text-center text-sm leading-relaxed text-muted-foreground font-bold">
              هنوز درسی ندارید. با دکمه «درس» شروع کنید یا لیست ترم را از اکسل وارد کنید.
            </CardContent>
          </Card>
        )}

        {courses.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            selected={!!selection[c.id]}
            selectedGroupId={selection[c.id] ?? null}
            colorClass={blockColorFor(courses, c.id)}
            onToggle={(checked) =>
              setSelection(c.id, checked ? c.groups[0].id : null)
            }
            onPickGroup={(gid) => setSelection(c.id, gid)}
            onEdit={() => setFormOpen(c)}
            onDelete={() => {
              if (confirm(`درس «${c.name}» حذف شود؟`)) deleteCourse(c.id)
            }}
          />
        ))}
          </div>
        </ScrollArea>
      </section>

      {/* ستون وسط: جدول هفتگی */}
      <section aria-label="جدول هفتگی" className="order-2 min-w-0 flex flex-col min-h-[500px] lg:min-h-0">
        <TimetableGrid courses={courses} selection={selection} />
      </section>

      {/* ستون چپ: وضعیت + پیشنهاد + تنظیمات */}
      <aside aria-label="وضعیت" className="order-3 flex flex-col min-h-0 rounded-sm border-2 border-foreground bg-card pt-3.5 pb-0 px-0 shadow-[4px_4px_0_var(--color-foreground)]">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground pb-2 shrink-0 px-3.5">
          <h2 className="text-sm font-black tracking-wide">وضعیت</h2>
        </div>
        {/* محتوای ستون داخل باکس اسکرول‌شونده */}
        <ScrollArea className="flex-1 min-h-0" type="always">
          <div dir="rtl" className="flex flex-col gap-4 [&>*]:shrink-0 px-3.5 pt-3 pb-3 w-full box-border">
        <UnitsPanel units={units} min={settings.minUnits} max={settings.maxUnits} />

        <SuggestionsMiniPanel
          coursesCount={courses.length}
          onApply={applyPicks}
        />

        <div className="rounded-sm border-2 border-foreground bg-card p-4 shadow-[3px_3px_0_var(--color-foreground)]">
          <div className="mb-3 flex items-center gap-2">
            <Settings2 size={15} className="text-muted-foreground" />
            <h3 className="text-sm font-black">تنظیمات</h3>
            <Button
              variant="ghost"
              size="xs"
              className="ms-auto"
              onClick={() => setSettingsOpen(true)}
            >
              تغییر
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            محدوده مجاز واحدها: <strong className="text-foreground">{settings.minUnits}</strong> تا{' '}
            <strong className="text-foreground">{settings.maxUnits}</strong> واحد.
          </p>
          <Button
            variant="ghost"
            size="xs"
            className="mt-1 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('همه داده‌ها پاک شوند؟ این عمل قابل بازگشت نیست.')) {
                useStore.getState().clearAll()
              }
            }}
          >
            پاک کردن همه داده‌ها
          </Button>
        </div>

        {Object.values(selection).some(Boolean) && (
          <Button variant="outline" size="sm" onClick={clearSelection}>
            پاک کردن انتخاب‌ها
          </Button>
        )}

        {/* باکس خطاها و اخطارها */}
        <ConflictBanner conflicts={conflicts} units={units} settings={settings} />
          </div>
        </ScrollArea>
      </aside>

      {/* فرم درس */}
      {formOpen && (
        <Dialog open onOpenChange={(v) => !v && setFormOpen(false)}>
          <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{formOpen === 'new' ? 'افزودن درس جدید' : `ویرایش درس: ${formOpen.name}`}</DialogTitle>
              <DialogDescription>مشخصات درس، گروه‌ها، جلسات و امتحان را وارد کنید.</DialogDescription>
            </DialogHeader>
            <CourseForm
              initial={formOpen === 'new' ? undefined : formOpen}
              onSave={(c) => {
                if (formOpen === 'new') addCourse(c)
                else updateCourse(c.id, c)
                setFormOpen(false)
              }}
              onCancel={() => setFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ایمپورت */}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}

      {/* تنظیمات */}
      {settingsOpen && (
        <SettingsDialog
          min={settings.minUnits}
          max={settings.maxUnits}
          onSave={({ minUnits, maxUnits }) => {
            useStore.getState().setSettings({ minUnits, maxUnits })
            setSettingsOpen(false)
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CourseCard({
  course,
  selected,
  selectedGroupId,
  colorClass,
  onToggle,
  onPickGroup,
  onEdit,
  onDelete,
}: {
  course: Course
  selected: boolean
  selectedGroupId: string | null
  colorClass: string
  onToggle: (checked: boolean) => void
  onPickGroup: (gid: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [groupPickerOpen, setGroupPickerOpen] = useState(false)
  const colorBg = colorClass.split(' ')[0]
  return (
    <Card
      className={cn(
        'group relative gap-3 overflow-hidden py-3.5 transition-all',
        selected
          ? 'border-primary shadow-[4px_4px_0_var(--color-primary)] -translate-x-[2px] -translate-y-[2px]'
          : 'shadow-[4px_4px_0_var(--color-foreground)]',
      )}
    >
      {/* نوار رنگی سمت راست کارت */}
      <span aria-hidden className={cn('absolute inset-y-0 start-0 w-2 rounded-none', colorBg)} />
      <CardContent className="ps-4 pe-3">
        {/* بخش مجزا برای نام درس تا کامل نمایش داده شود */}
        <div className="flex items-start gap-2.5">
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onToggle(v === true)}
            aria-label={`انتخاب ${course.name}`}
            className="shrink-0 mt-0.5"
          />
          <strong className="min-w-0 break-words text-sm font-bold leading-snug">{course.name}</strong>
          <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button variant="ghost" size="icon-xs" aria-label={`ویرایش ${course.name}`} onClick={onEdit}>
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`حذف ${course.name}`}
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
          <Badge variant="secondary" className="text-[10px] tabular-nums">
            {course.units} واحد
          </Badge>
          <Badge variant="outline" className="gap-1 border-saffron/40 text-[10px]">
            {[5, 4, 3, 2, 1].map((p) => (
              <span
                key={p}
                aria-hidden
                title={`اولویت ${p} از ۵`}
                className={cn(
                  'inline-block size-1.5 rounded-full',
                  p <= course.priority ? 'bg-saffron' : 'bg-muted-foreground/25',
                )}
              />
            ))}
            اولویت {course.priority}
          </Badge>
          {course.groups[0]?.instructor && (
            <span className="inline-flex items-center gap-1">
              <GraduationCap size={12} className="opacity-70" />
              {course.groups[0].instructor}
            </span>
          )}
          {(selectedGroupId
            ? course.groups.find((g) => g.id === selectedGroupId)
            : undefined
          )?.sessions.map((s, i) => (
            <span key={i} className="tabular-nums">
              {DAY_NAMES[s.day]} {minToTime(s.startMin)}–{minToTime(s.endMin)}
            </span>
          ))}
          {!selectedGroupId && course.groups.length > 0 && (
            <span>{course.groups.length} گروه</span>
          )}
        </div>

        {selected && selectedGroupId && course.groups.length > 1 && (
          <button
            type="button"
            onClick={() => setGroupPickerOpen((v) => !v)}
            className="mt-2 w-full rounded-sm border-[3px] border-dashed border-foreground px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-foreground outline-none transition-colors"
          >
            تغییر گروه…
          </button>
        )}
        {selected && groupPickerOpen && course.groups.length > 1 && (
          <Select value={selectedGroupId ?? ''} onValueChange={(v) => { onPickGroup(v); setGroupPickerOpen(false) }}>
            <SelectTrigger size="sm" className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {course.groups.map((g) => {
                const times = g.sessions.map((s) => `${DAY_NAMES[s.day]} ${minToTime(s.startMin)}`).join(' و ')
                return (
                  <SelectItem key={g.id} value={g.id}>
                    گروه {g.number}{g.instructor ? ` — ${g.instructor}` : ''}{times ? ` (${times})` : ''}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function UnitsPanel({ units, min, max }: { units: number; min: number; max: number }) {
  const overMax = units > max
  const underMin = units > 0 && units < min
  return (
    <div className="rounded-sm border-2 border-foreground bg-primary/10 p-4 shadow-[3px_3px_0_var(--color-foreground)]">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">واحدهای انتخاب‌شده</p>
      <p className="mt-0.5 text-3xl font-black tracking-tight">
        {units}
        <span className="text-base font-bold text-muted-foreground"> / {max}</span>
      </p>
      <div className="mt-2 h-3 overflow-hidden rounded-none border-2 border-foreground bg-muted">
        <div
          className={cn(
            'h-full rounded-none transition-all duration-300',
            overMax ? 'bg-destructive' : underMin ? 'bg-warning' : 'bg-success',
          )}
          style={{ width: `${Math.min(100, (units / Math.max(1, max)) * 100)}%` }}
        />
      </div>
      {(overMax || (underMin && min > 0)) && (
        <p className={cn('mt-1.5 text-xs', overMax ? 'text-destructive' : 'text-warning')}>
          {overMax ? `از سقف ${max} گذشته` : `کمتر از حداقل ${min}`}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function SuggestionsMiniPanel({
  coursesCount,
  onApply,
}: {
  coursesCount: number
  onApply: (picks: Record<string, string>) => void
}) {
  const courses = useStore((s) => s.courses)
  const settings = useStore((s) => s.settings)
  const [ran, setRan] = useState(false)
  const [combos, incomplete] = useMemo(() => {
    if (!ran || coursesCount === 0) return [[], false] as [ReturnType<typeof findBestCombos>[0], boolean]
    return findBestCombos(courses, settings, 3)
  }, [ran, courses, settings, coursesCount])

  return (
    <div className="rounded-sm border-2 border-foreground bg-card p-4 shadow-[3px_3px_0_var(--color-foreground)]">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb size={15} className="text-saffron" />
        <h3 className="text-sm font-black">پیشنهاد هوشمند</h3>
      </div>
      {coursesCount === 0 ? (
        <p className="text-xs text-muted-foreground">اول چند درس اضافه کنید.</p>
      ) : !ran ? (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            بهترین ترکیب بدون تداخل بر اساس اولویت و محدوده واحدها.
          </p>
          <Button size="xs" className="mt-2 w-full" onClick={() => setRan(true)}>
            <Sparkles /> محاسبه بهترین ترکیب‌ها
          </Button>
        </>
      ) : combos.length === 0 ? (
        <p className="text-xs leading-relaxed text-destructive">
          هیچ ترکیب معتبری پیدا نشد؛ محدوده واحدها یا تداخل گروه‌ها را بررسی کنید.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {combos.map((combo, i) => {
            const best = i === 0
            const pickedCourses = courses.filter((c) => combo.picks[c.id])
            return (
              <div
                key={i}
                className={cn(
                  'relative overflow-hidden rounded-sm border-2 p-2.5',
                  best ? 'border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_var(--color-foreground)]' : 'border-foreground bg-card shadow-[2px_2px_0_var(--color-foreground)]',
                )}
              >
                <div className="flex items-center gap-1.5">
                  {best && <Sparkles size={12} className="shrink-0 text-saffron" />}
                  <span className="text-xs font-bold">
                    {best ? 'بهترین پیشنهاد' : `گزینه ${i + 1}`}
                  </span>
                  <Badge variant="secondary" className="ms-auto text-[10px]">
                    {combo.totalUnits} واحد
                  </Badge>
                </div>
                <ul className="mt-1 space-y-0.5 ps-3 text-[11px] leading-snug" style={{ listStyleType: 'disc' }}>
                  {pickedCourses.slice(0, 6).map((c) => {
                    const g = c.groups.find((g) => g.id === combo.picks[c.id])!
                    return (
                      <li key={c.id}>
                        {c.name} — گ{g.number}
                      </li>
                    )
                  })}
                </ul>
                <Button
                  variant={best ? 'default' : 'outline'}
                  size="xs"
                  className="mt-2 w-full"
                  onClick={() => onApply(combo.picks)}
                >
                  اعمال
                </Button>
              </div>
            )
          })}
          {incomplete && (
            <p className="flex items-start gap-1.5 text-[11px] text-warning">
              <TriangleAlert size={12} className="mt-0.5 shrink-0" />
              جستجو ناقص بود؛ ممکن است ترکیب بهتر وجود داشته باشد.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function SettingsDialog({
  min,
  max,
  onSave,
  onClose,
}: {
  min: number
  max: number
  onSave: (v: { minUnits: number; maxUnits: number }) => void
  onClose: () => void
}) {
  const [minUnits, setMinUnits] = useState(String(min))
  const [maxUnits, setMaxUnits] = useState(String(max))
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>محدودیت واحدها</DialogTitle>
          <DialogDescription>این محدوده در بررسی انتخاب‌ها و پیشنهادها استفاده می‌شود.</DialogDescription>
        </DialogHeader>
        <div className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="dash-min">حداقل واحد</Label>
            <Input id="dash-min" type="number" min={0} max={24} value={minUnits} onChange={(e) => setMinUnits(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="dash-max">حداکثر واحد</Label>
            <Input id="dash-max" type="number" min={1} max={30} value={maxUnits} onChange={(e) => setMaxUnits(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button
            onClick={() => {
              const mn = Math.max(0, parseInt(minUnits, 10) || 0)
              const mx = Math.max(mn + 1, parseInt(maxUnits, 10) || mn + 1)
              onSave({ minUnits: mn, maxUnits: mx })
            }}
          >
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
