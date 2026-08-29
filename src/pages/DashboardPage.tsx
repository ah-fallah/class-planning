import {
  GraduationCap,
  Lightbulb,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  TriangleAlert,
  CalendarDays,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import ConflictBanner from '@/components/ConflictBanner'
import CourseForm from '@/components/CourseForm'
import ImportDialog from '@/components/ImportDialog'
import { exportTimetable } from '@/lib/exportExcel'
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
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/NumberInput'
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

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
          <Button size="xs" variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet /> اکسل
          </Button>
          <Button size="xs" onClick={() => setFormOpen('new')}>
            <Plus /> درس
          </Button>
        </div>

        {/* لیست کارت‌ها در باکس اسکرول‌شونده؛ کل ارتفاع باقی‌مانده رو می‌گیره */}
        <ScrollArea className="flex-1 min-h-0" type="always">
          <div dir="rtl" className="flex flex-col gap-3 [&>*]:shrink-0 px-3.5 pt-3 pb-3 w-full box-border">
        {courses.length === 0 && (
          <Card className="border-[3px] border-dashed">
            <CardContent className="pt-6 text-center text-sm leading-relaxed text-muted-foreground font-bold">
              هنوز درسی ندارید. با دکمه «درس» شروع کنید.
            </CardContent>
          </Card>
        )}

        {courses.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            selected={!!selection[c.id]}
            selectedGroupId={selection[c.id] ?? null}
            colorBg={blockColorFor(courses, c.id).bg}
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
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
          <h2 className="text-sm font-black tracking-wide">جدول هفتگی</h2>
          <span className="flex-1" />
          <Button
            size="xs"
            variant="outline"
            disabled={courses.length === 0}
            onClick={async () => {
              try {
                await exportTimetable(courses, selection)
              } catch {
                alert('خروجی اکسل ناموفق بود. لطفاً دوباره تلاش کنید.')
              }
            }}
          >
            <FileDown /> خروجی اکسل
          </Button>
        </div>
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

        <div className="rounded-none border-[3px] border-foreground bg-card p-4 shadow-[4px_4px_0_var(--color-foreground)]">
          <div className="mb-4 flex items-center gap-2 border-b-2 border-foreground pb-2">
            <div className="flex size-7 items-center justify-center border-2 border-foreground bg-muted shadow-[2px_2px_0_var(--color-foreground)]">
              <Settings2 size={16} strokeWidth={2.5} className="text-foreground" />
            </div>
            <h3 className="text-sm font-black tracking-wide">تنظیمات</h3>
            <Button
              variant="outline"
              size="xs"
              className="ms-auto rounded-none border-2 border-foreground shadow-[2px_2px_0_var(--color-foreground)] active:translate-y-[1px] active:shadow-none"
              onClick={() => setSettingsOpen(true)}
            >
              تغییر
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-muted-foreground">محدوده مجاز واحدها:</p>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center justify-between border-2 border-foreground bg-background px-2 py-1 shadow-[2px_2px_0_var(--color-foreground)]">
                <span className="text-xs font-black text-muted-foreground">حداقل</span>
                <span className="font-black tabular-nums">{settings.minUnits}</span>
              </div>
              <span className="font-black text-foreground">تا</span>
              <div className="flex flex-1 items-center justify-between border-2 border-foreground bg-background px-2 py-1 shadow-[2px_2px_0_var(--color-foreground)]">
                <span className="text-xs font-black text-muted-foreground">حداکثر</span>
                <span className="font-black tabular-nums">{settings.maxUnits}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t-2 border-foreground pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-none border-2 border-foreground bg-destructive/10 text-destructive-foreground font-black shadow-[2px_2px_0_var(--color-foreground)] transition-all hover:-translate-y-[1px] hover:bg-destructive hover:text-white hover:shadow-[3px_3px_0_var(--color-foreground)] active:translate-y-[1px] active:shadow-none"
              onClick={() => {
                if (confirm('همه داده‌ها پاک شوند؟ این عمل قابل بازگشت نیست.')) {
                  useStore.getState().clearAll()
                }
              }}
            >
              پاک کردن همه داده‌ها
            </Button>
          </div>
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
          <DialogContent className="max-h-[90dvh] h-[90dvh] max-w-2xl overflow-hidden p-0 gap-0">
            <DialogHeader className="shrink-0 border-b-2 border-foreground bg-saffron/10 z-10">
              <DialogTitle>{formOpen === 'new' ? 'افزودن درس جدید' : `ویرایش درس: ${formOpen.name}`}</DialogTitle>
              <DialogDescription>مشخصات درس، گروه‌ها، جلسات و امتحان را وارد کنید.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1" type="always">
              <div className="p-6">
                <CourseForm
                  initial={formOpen === 'new' ? undefined : formOpen}
                  onSave={(c) => {
                    if (formOpen === 'new') addCourse(c)
                    else updateCourse(c.id, c)
                    setFormOpen(false)
                  }}
                  onCancel={() => setFormOpen(false)}
                />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

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

      {/* ورود از اکسل */}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CourseCard({
  course,
  selected,
  selectedGroupId,
  colorBg,
  onToggle,
  onPickGroup,
  onEdit,
  onDelete,
}: {
  course: Course
  selected: boolean
  selectedGroupId: string | null
  colorBg: string
  onToggle: (checked: boolean) => void
  onPickGroup: (gid: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [groupPickerOpen, setGroupPickerOpen] = useState(false)
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
          <strong className="min-w-0 break-words text-sm font-bold leading-snug tracking-wide">{course.name}</strong>
          <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 mr-auto -mt-1 gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              aria-label={`ویرایش ${course.name}`}
              onClick={onEdit}
              className="size-6 rounded-none border-2 shadow-[1px_1px_0_var(--color-foreground)] bg-primary/20 hover:bg-primary hover:-translate-y-[1px] hover:shadow-[2px_2px_0_var(--color-foreground)] active:translate-y-0 active:shadow-none"
            >
              <Pencil size={12} strokeWidth={2.5} className="text-foreground" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              aria-label={`حذف ${course.name}`}
              className="size-6 rounded-none border-2 shadow-[1px_1px_0_var(--color-foreground)] bg-destructive/20 hover:bg-destructive hover:-translate-y-[1px] hover:shadow-[2px_2px_0_var(--color-foreground)] active:translate-y-0 active:shadow-none"
              onClick={onDelete}
            >
              <Trash2 size={12} strokeWidth={2.5} className="text-destructive-foreground hover:text-foreground" />
            </Button>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground font-bold">
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
    <div className="relative overflow-hidden rounded-none border-[3px] border-foreground bg-primary/10 p-4 shadow-[4px_4px_0_var(--color-foreground)]">
      {/* Hatch pattern effect */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--color-foreground) 0, var(--color-foreground) 2px, transparent 2px, transparent 8px)' }} />

      <div className="relative z-10">
        <div className="flex items-center justify-between border-b-2 border-foreground pb-2">
          <p className="text-xs font-black uppercase tracking-widest text-foreground bg-background px-2 py-0.5 border-2 border-foreground shadow-[2px_2px_0_var(--color-foreground)]">وضعیت واحدها</p>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <p className="text-4xl font-black tracking-tighter tabular-nums drop-shadow-[2px_2px_0_var(--color-muted-foreground)]">
            {units}
          </p>
          <span className="mb-1 text-sm font-bold text-muted-foreground">/ {max} واحد</span>
        </div>

        <div className="mt-3 relative h-5 rounded-none border-[3px] border-foreground bg-background">
          <div
            className={cn(
              'h-full rounded-none transition-all duration-300 border-r-2 border-foreground',
              overMax ? 'bg-destructive' : underMin ? 'bg-warning' : 'bg-success',
            )}
            style={{ width: `${Math.min(100, (units / Math.max(1, max)) * 100)}%` }}
          />
          {/* Target marker */}
          <div className="absolute top-[-4px] bottom-[-4px] w-1 bg-foreground" style={{ left: `${(min / Math.max(1, max)) * 100}%` }} />
        </div>

        <div className="mt-2 flex justify-between text-[11px] font-black">
          <span>۰</span>
          <span className="text-muted-foreground">حداقل {min}</span>
          <span>{max}</span>
        </div>

        {(overMax || (underMin && min > 0)) && (
          <p className={cn('mt-2 text-xs font-black px-2 py-1 border-2 border-foreground bg-background inline-block shadow-[2px_2px_0_var(--color-foreground)]', overMax ? 'text-destructive' : 'text-warning')}>
            {overMax ? `از سقف ${max} گذشته!` : `کمتر از حداقل ${min}!`}
          </p>
        )}
      </div>
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
    <div className="rounded-none border-[3px] border-foreground bg-card p-4 shadow-[4px_4px_0_var(--color-foreground)]">
      <div className="mb-3 flex items-center gap-2 border-b-2 border-foreground pb-2">
        <div className="flex size-7 items-center justify-center border-2 border-foreground bg-saffron shadow-[2px_2px_0_var(--color-foreground)]">
          <Lightbulb size={16} strokeWidth={2.5} className="text-foreground" />
        </div>
        <h3 className="text-sm font-black tracking-wide">پیشنهاد هوشمند</h3>
      </div>

      {coursesCount === 0 ? (
        <div className="border-2 border-dashed border-foreground bg-muted/50 p-3 text-center">
          <p className="text-xs font-bold text-muted-foreground">اول چند درس اضافه کنید.</p>
        </div>
      ) : !ran ? (
        <>
          <p className="text-xs font-bold leading-relaxed text-muted-foreground mb-3">
            بهترین ترکیب بدون تداخل بر اساس اولویت و محدوده واحدها.
          </p>
          <Button
            className="w-full rounded-none border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_var(--color-foreground)] transition-all hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--color-foreground)] active:translate-y-[2px] active:shadow-none"
            onClick={() => setRan(true)}
          >
            <Sparkles size={16} className="mr-2" /> محاسبه ترکیب‌ها
          </Button>
        </>
      ) : combos.length === 0 ? (
        <div className="border-2 border-foreground bg-destructive/10 p-3">
          <p className="text-xs font-bold leading-relaxed text-destructive">
            هیچ ترکیب معتبری پیدا نشد؛ محدوده واحدها یا تداخل گروه‌ها را بررسی کنید.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {combos.map((combo, i) => {
            const best = i === 0
            const pickedCourses = courses.filter((c) => combo.picks[c.id])
            return (
              <div
                key={i}
                className={cn(
                  'relative overflow-hidden rounded-none border-[3px] p-3 transition-colors',
                  best ? 'border-foreground bg-saffron/20 shadow-[4px_4px_0_var(--color-foreground)]' : 'border-foreground bg-card shadow-[2px_2px_0_var(--color-foreground)] hover:bg-muted/30',
                )}
              >
                <div className="flex items-center gap-1.5 border-b-2 border-foreground pb-2 mb-2">
                  {best && <Sparkles size={14} className="shrink-0 text-foreground" strokeWidth={2.5} />}
                  <span className="text-xs font-black tracking-wide">
                    {best ? 'بهترین پیشنهاد' : `گزینه ${i + 1}`}
                  </span>
                  <Badge variant="secondary" className="ms-auto rounded-none border-2 border-foreground bg-background shadow-[2px_2px_0_var(--color-foreground)] px-2 py-0.5 text-[11px] font-black">
                    {combo.totalUnits} واحد
                  </Badge>
                </div>

                <ul className="space-y-1.5 text-[11px] font-bold">
                  {pickedCourses.slice(0, 6).map((c) => {
                    const g = c.groups.find((g) => g.id === combo.picks[c.id])!
                    return (
                      <li key={c.id} className="flex items-center gap-2">
                        <div className="size-1.5 bg-foreground rounded-none" />
                        <span className="truncate flex-1">{c.name}</span>
                        <span className="shrink-0 bg-muted px-1 border border-foreground">گ{g.number}</span>
                      </li>
                    )
                  })}
                </ul>

                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "mt-3 w-full rounded-none border-2 border-foreground font-black transition-all active:translate-y-[1px] active:shadow-none",
                    best
                      ? "bg-primary text-primary-foreground shadow-[3px_3px_0_var(--color-foreground)] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--color-foreground)]"
                      : "bg-background shadow-[2px_2px_0_var(--color-foreground)] hover:-translate-y-[1px] hover:bg-secondary hover:shadow-[3px_3px_0_var(--color-foreground)]"
                  )}
                  onClick={() => onApply(combo.picks)}
                >
                  اعمال این ترکیب
                </Button>
              </div>
            )
          })}
          {incomplete && (
            <div className="mt-1 border-2 border-foreground bg-warning/20 p-2 shadow-[2px_2px_0_var(--color-foreground)]">
              <p className="flex items-start gap-1.5 text-[11px] font-bold text-foreground">
                <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                جستجو ناقص بود؛ ممکن است ترکیب بهتر وجود داشته باشد.
              </p>
            </div>
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
  const [minUnits, setMinUnits] = useState(min)
  const [maxUnits, setMaxUnits] = useState(max)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader>
          <DialogTitle>تنظیمات انتخاب واحد</DialogTitle>
          <DialogDescription>محدوده مجاز واحدها در این ترم را مشخص کنید.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5 p-6 overflow-x-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 w-full px-1">
            <div className="flex w-full sm:flex-1 flex-col gap-2 min-w-0">
              <Label htmlFor="dash-min" className="text-xs font-black text-muted-foreground uppercase tracking-wider text-center">حداقل واحد</Label>
              <NumberInput
                id="dash-min"
                min={0}
                max={maxUnits}
                value={minUnits}
                onChange={setMinUnits}
                className="shadow-[3px_3px_0_var(--color-foreground)] w-full"
              />
            </div>
            <div className="flex w-full sm:flex-1 flex-col gap-2 min-w-0">
              <Label htmlFor="dash-max" className="text-xs font-black text-muted-foreground uppercase tracking-wider text-center">حداکثر واحد</Label>
              <NumberInput
                id="dash-max"
                min={minUnits > 0 ? minUnits : 1}
                max={30}
                value={maxUnits}
                onChange={setMaxUnits}
                className="shadow-[3px_3px_0_var(--color-foreground)] w-full"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">انصراف</Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => onSave({ minUnits, maxUnits })}
          >
            ذخیره تغییرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
