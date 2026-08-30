import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  FileDown,
  FileUp,
  GraduationCap,
  Layers,
  Lightbulb,
  Lock,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  TriangleAlert,
  Unlock,
} from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import ConflictBanner from '@/components/ConflictBanner'
import CourseForm from '@/components/CourseForm'
import ImportDialog from '@/components/ImportDialog'
import { exportTimetable } from '@/lib/exportExcel'
import TimePicker from '@/components/TimePicker'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { findBestCombos } from '@/lib/optimizer'
import { findConflicts } from '@/lib/conflicts'
import { PREF_LABELS, PREF_LEVELS } from '@/lib/prefs'
import { PRIORITY_LABELS, PRIORITY_WEIGHT } from '@/lib/priority'
import { BASE_COLORS, buildCourseColorMap } from '@/lib/courseColors'
import { downloadBackup, parseBackupFile, type BackupParseResult } from '@/lib/backup'
import { faDigits, formatJalaliDate, todayISO } from '@/lib/jalali'
import { DAY_NAMES, minToTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { totalUnits, useStore } from '@/store/useStore'
import type { Course, PrefLevel, Priority, Settings, ThemeMode } from '@/types'

export default function DashboardPage() {
  const courses = useStore((s) => s.courses)
  const selection = useStore((s) => s.selection)
  const settings = useStore((s) => s.settings)
  const locked = useStore((s) => s.locked)
  const setLocked = useStore((s) => s.setLocked)
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
  const colorMap = buildCourseColorMap(courses)

  const overMax = units > settings.maxUnits
  const underMin = units > 0 && units < settings.minUnits
  // تم مؤثر فعلی: برای آیکون و عملکرد دکمه تغییر سریع
  const resolvedDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const toggleTheme = () => {
    useStore.getState().setSettings({ theme: resolvedDark ? 'light' : 'dark' })
  }
  // کل موارد نیازمند بررسی: تداخل‌های کلاسی/امتحان + مشکل محدوده واحدها
  const issuesCount = conflicts.length + (overMax ? 1 : 0) + (underMin ? 1 : 0)
  // روز هفته جاری: getDay() یکشنبه=0 ... شنبه=6 → شنبه در جدول ایندکس 0 است
  const todayLabel = `${DAY_NAMES[(new Date().getDay() + 1) % 7]}، ${formatJalaliDate(todayISO())}`

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col lg:justify-center min-h-[100dvh] px-4 py-6 pb-16 sm:px-6 lg:py-8">
      <header
        aria-label="سربرگ برنامه‌ریز"
        className="sticky top-0 z-30 -mx-4 mb-6 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b-4 border-brutal-ink bg-background/90 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
      >
        {/* برند */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center border-2 border-brutal-ink bg-saffron shadow-[3px_3px_0_var(--brutal-ink)]">
            <GraduationCap size={22} strokeWidth={2.5} className="text-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black leading-tight tracking-wider">برنامه‌ریز انتخاب واحد</h1>
            <p className="hidden text-[11px] font-bold text-muted-foreground sm:block">
              چیدمان بدون تداخل کلاس‌های ترم
            </p>
          </div>
        </div>

        <span className="flex-1" />

        {/* آمار زنده */}
        <div className="hidden items-center gap-2 md:flex">
          <HeaderStat
            icon={<CalendarDays size={14} strokeWidth={2.5} className="text-foreground" />}
            label="امروز"
            value={todayLabel}
          />
          <HeaderStat
            icon={<BookOpen size={14} strokeWidth={2.5} className="text-foreground" />}
            value={`${faDigits(String(courses.length))} درس`}
          />
          <HeaderStat
            icon={<Layers size={14} strokeWidth={2.5} className="text-foreground" />}
            label="واحد"
            value={`${faDigits(String(units))} از ${faDigits(String(settings.maxUnits))}`}
            tone={overMax ? 'danger' : underMin ? 'warn' : 'ok'}
          />
        </div>

        {/* دسترسی سریع اخطارها و تداخل‌ها */}
        {(issuesCount > 0 || units > 0) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={issuesCount > 0 ? `اخطارها و تداخل‌ها: ${faDigits(String(issuesCount))} مورد` : 'وضعیت انتخاب‌ها'}
                className={cn(
                  'relative shrink-0',
                  issuesCount > 0
                    ? 'border-destructive bg-destructive/15 text-destructive'
                    : 'border-success bg-success/15 text-success',
                )}
              >
                {issuesCount > 0 ? <TriangleAlert /> : <CheckCircle2 />}
                {issuesCount > 0 && (
                  <span className="absolute -top-2 -left-2 flex size-5 items-center justify-center border-2 border-brutal-ink bg-destructive text-[9px] font-black text-white">
                    {faDigits(String(issuesCount))}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-80 max-w-[calc(100vw-2rem)] rounded-none border-2 border-brutal-ink p-3 shadow-[4px_4px_0_var(--brutal-ink)]"
            >
              <ConflictBanner conflicts={conflicts} units={units} settings={settings} />
            </PopoverContent>
          </Popover>
        )}

        {/* تغییر سریع حالت روشن/تاریک */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={resolvedDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
              onClick={toggleTheme}
              className="shrink-0"
            >
              {resolvedDark ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{resolvedDark ? 'حالت روشن' : 'حالت تاریک'}</TooltipContent>
        </Tooltip>

        {/* دسترسی سریع تنظیمات */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="تنظیمات"
              onClick={() => setSettingsOpen(true)}
              className="shrink-0"
            >
              <Settings2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>تنظیمات واحدها و ترجیحات</TooltipContent>
        </Tooltip>
      </header>
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_270px] lg:h-[clamp(500px,calc(100dvh_-_200px),800px)]">
      {/* ستون راست: درس‌ها */}
      <section aria-label="دروس" className="order-1 flex flex-col min-h-0 rounded-sm border-2 border-brutal-ink bg-card pt-3.5 pb-0 px-0 shadow-[4px_4px_0_var(--brutal-ink)]">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-brutal-ink pb-2 shrink-0 px-3.5">
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
            locked={!!locked[c.id] && !!selection[c.id]}
            onToggleLock={() => setLocked(c.id, !locked[c.id])}
            colorBg={colorMap.get(c.id)?.bg ?? BASE_COLORS[0].bg}
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

      {/* ستون چپ: وضعیت + پیشنهاد هوشمند */}
      <aside aria-label="وضعیت" className="order-3 flex flex-col min-h-0 rounded-sm border-2 border-brutal-ink bg-card pt-3.5 pb-0 px-0 shadow-[4px_4px_0_var(--brutal-ink)]">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-brutal-ink pb-2 shrink-0 px-3.5">
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

        {Object.values(selection).some(Boolean) && (
          <Button variant="outline" size="sm" onClick={clearSelection}>
            پاک کردن انتخاب‌ها
          </Button>
        )}

        {/* ناحیه خطر: پاک‌سازی کامل داده‌ها */}
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-none border-2 border-brutal-ink bg-destructive/10 font-black text-destructive-foreground shadow-[2px_2px_0_var(--brutal-ink)] transition-all hover:-translate-y-[1px] hover:bg-destructive hover:text-white hover:shadow-[3px_3px_0_var(--brutal-ink)] active:translate-y-[1px] active:shadow-none"
          onClick={() => {
            if (confirm('همه داده‌ها پاک شوند؟ این عمل قابل بازگشت نیست.')) {
              useStore.getState().clearAll()
            }
          }}
        >
          پاک کردن همه داده‌ها
        </Button>
          </div>
        </ScrollArea>
      </aside>

      {/* فرم درس */}
      {formOpen && (
        <Dialog open onOpenChange={(v) => !v && setFormOpen(false)}>
          <DialogContent className="max-h-[90dvh] h-[90dvh] max-w-2xl overflow-hidden p-0 gap-0">
            <DialogHeader className="shrink-0 border-b-2 border-brutal-ink bg-saffron/10 z-10">
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
          settings={settings}
          onSave={(v) => {
            useStore.getState().setSettings(v)
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

/** چیپ آمار سربرگ: آیکن + برچسب/مقدار با پس‌زمینه رنگی بسته به وضعیت */
function HeaderStat({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: ReactNode
  label?: string
  value: string
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 border-2 border-brutal-ink bg-card px-2.5 py-1 shadow-[2px_2px_0_var(--brutal-ink)]',
        tone === 'ok' && 'bg-success/15',
        tone === 'warn' && 'bg-warning/20',
        tone === 'danger' && 'bg-destructive/15',
      )}
    >
      {icon}
      {label && <span className="text-[11px] font-bold text-muted-foreground">{label}</span>}
      <span className={cn('text-xs font-black tabular-nums', tone === 'danger' && 'text-destructive')}>{value}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CourseCard({
  course,
  selected,
  selectedGroupId,
  locked,
  onToggleLock,
  colorBg,
  onToggle,
  onPickGroup,
  onEdit,
  onDelete,
}: {
  course: Course
  selected: boolean
  selectedGroupId: string | null
  locked: boolean
  onToggleLock: () => void
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
          : 'shadow-[4px_4px_0_var(--brutal-ink)]',
      )}
    >
      {/* نوار رنگی سمت راست کارت */}
      <span
        aria-hidden
        className="absolute inset-y-0 start-0 w-2 rounded-none"
        style={{ backgroundColor: colorBg }}
      />

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
          <div className="mr-auto -mt-1 flex shrink-0 items-start gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              aria-label={locked ? `قفل گروه ${course.name} فعال است` : `قفل کردن گروه ${course.name}`}
              title={locked ? 'گروه قفل شده؛ در همه پیشنهادها ثابت می‌ماند' : 'قفل این گروه در پیشنهاد هوشمند'}
              disabled={!selectedGroupId}
              onClick={onToggleLock}
              className={cn(
                'size-6 rounded-none border-2 shadow-[1px_1px_0_var(--brutal-ink)] transition-all active:translate-y-0 active:shadow-none disabled:pointer-events-none disabled:opacity-40',
                locked
                  ? 'bg-primary text-primary-foreground hover:-translate-y-[1px] hover:shadow-[2px_2px_0_var(--brutal-ink)]'
                  : 'bg-secondary/60 hover:bg-secondary hover:-translate-y-[1px] hover:shadow-[2px_2px_0_var(--brutal-ink)]',
              )}
            >
              {locked ? (
                <Lock size={12} strokeWidth={2.5} />
              ) : (
                <Unlock size={12} strokeWidth={2.5} className="text-foreground" />
              )}
            </Button>
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Button
                variant="outline"
                size="icon-xs"
                aria-label={`ویرایش ${course.name}`}
                onClick={onEdit}
                className="size-6 rounded-none border-2 shadow-[1px_1px_0_var(--brutal-ink)] bg-primary/20 hover:bg-primary hover:-translate-y-[1px] hover:shadow-[2px_2px_0_var(--brutal-ink)] active:translate-y-0 active:shadow-none"
              >
                <Pencil size={12} strokeWidth={2.5} className="text-foreground" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                aria-label={`حذف ${course.name}`}
                className="size-6 rounded-none border-2 shadow-[1px_1px_0_var(--brutal-ink)] bg-destructive/20 hover:bg-destructive hover:-translate-y-[1px] hover:shadow-[2px_2px_0_var(--brutal-ink)] active:translate-y-0 active:shadow-none"
                onClick={onDelete}
              >
                <Trash2 size={12} strokeWidth={2.5} className="text-destructive-foreground hover:text-foreground" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground font-bold">
          <Badge variant="secondary" className="text-[10px] tabular-nums">
            {course.units} واحد
          </Badge>
          <Badge variant="outline" className="gap-1 border-saffron/40 text-[10px]">
            {(['high', 'medium', 'low'] as Priority[]).map((p) => (
              <span
                key={p}
                aria-hidden
                title={`اولویت ${PRIORITY_LABELS[course.priority]}`}
                className={cn(
                  'inline-block size-1.5 rounded-full',
                  PRIORITY_WEIGHT[course.priority] >= PRIORITY_WEIGHT[p] ? 'bg-saffron' : 'bg-muted-foreground/25',
                )}
              />
            ))}
            اولویت {PRIORITY_LABELS[course.priority]}
          </Badge>
          {locked && (
            <Badge variant="outline" className="gap-1 border-brutal-ink bg-primary/10 text-[10px]">
              <Lock size={9} strokeWidth={2.5} />
              قفل
            </Badge>
          )}
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
            className="mt-2 w-full rounded-sm border-[3px] border-dashed border-brutal-ink px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-foreground outline-none transition-colors"
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
    <div className="relative overflow-hidden rounded-none border-[3px] border-brutal-ink bg-primary/10 p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
      {/* Hatch pattern effect */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--color-foreground) 0, var(--color-foreground) 2px, transparent 2px, transparent 8px)' }} />

      <div className="relative z-10">
        <div className="flex items-center justify-between border-b-2 border-brutal-ink pb-2">
          <p className="text-xs font-black uppercase tracking-widest text-foreground bg-background px-2 py-0.5 border-2 border-brutal-ink shadow-[2px_2px_0_var(--brutal-ink)]">وضعیت واحدها</p>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <p className="text-4xl font-black tracking-tighter tabular-nums drop-shadow-[2px_2px_0_var(--color-muted-foreground)]">
            {units}
          </p>
          <span className="mb-1 text-sm font-bold text-muted-foreground">/ {max} واحد</span>
        </div>

        <div className="mt-3 relative h-5 rounded-none border-[3px] border-brutal-ink bg-background">
          <div
            className={cn(
              'h-full rounded-none transition-all duration-300 border-l-2 border-brutal-ink',
              overMax ? 'bg-destructive' : underMin ? 'bg-warning' : 'bg-success',
            )}
            style={{ width: `${Math.min(100, (units / Math.max(1, max)) * 100)}%` }}
          />
          {/* نشانگر حداقل واحد: خط‌چین عمودی روی نسبت min/max (مقیاس راست‌محور؛ صفر سمت راست) */}
          {min > 0 && (
            <div
              className="pointer-events-none absolute top-[-5px] bottom-[-5px] w-0 border-r-2 border-dashed border-brutal-ink"
              style={{ right: `${Math.min(100, (min / Math.max(1, max)) * 100)}%` }}
            />
          )}
        </div>

        <div className="mt-2 relative flex justify-between text-[11px] font-black">
          <span>۰</span>
          {min > 0 && (
            <span
              className="absolute top-0 whitespace-nowrap text-muted-foreground"
              style={{
                // برچسب دقیقاً زیر نشانگر؛ با clamp از برچسب‌های لبه (۰ و max) فاصله می‌گیرد
                right: `clamp(8%, ${(min / Math.max(1, max)) * 100}%, 92%)`,
                transform: 'translateX(50%)',
              }}
            >
              حداقل {min}
            </span>
          )}
          <span>{max}</span>
        </div>

        {(overMax || (underMin && min > 0)) && (
          <p className={cn('mt-2 text-xs font-black px-2 py-1 border-2 border-brutal-ink bg-background inline-block shadow-[2px_2px_0_var(--brutal-ink)]', overMax ? 'text-destructive' : 'text-warning')}>
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
  const selection = useStore((s) => s.selection)
  const settings = useStore((s) => s.settings)
  const locked = useStore((s) => s.locked)
  const [ran, setRan] = useState(false)

  // گروه‌های قفل‌شده: courseId -> groupId (فقط قفل‌های دارای انتخاب معتبر)
  const lockedPicks = useMemo(() => {
    const out: Record<string, string> = {}
    for (const c of courses) {
      if (!locked[c.id]) continue
      const gid = selection[c.id]
      if (gid && c.groups.some((g) => g.id === gid)) out[c.id] = gid
    }
    return out
  }, [courses, selection, locked])
  const lockedCount = Object.keys(lockedPicks).length

  const [combos, incomplete] = useMemo(() => {
    if (!ran || coursesCount === 0) return [[], false] as [ReturnType<typeof findBestCombos>[0], boolean]
    return findBestCombos(courses, settings, 3, lockedPicks)
  }, [ran, courses, settings, coursesCount, lockedPicks])

  return (
    <div className="rounded-none border-[3px] border-brutal-ink bg-card p-4 shadow-[4px_4px_0_var(--brutal-ink)]">
      <div className="mb-3 flex items-center gap-2 border-b-2 border-brutal-ink pb-2">
        <div className="flex size-7 items-center justify-center border-2 border-brutal-ink bg-saffron shadow-[2px_2px_0_var(--brutal-ink)]">
          <Lightbulb size={16} strokeWidth={2.5} className="text-foreground" />
        </div>
        <h3 className="text-sm font-black tracking-wide">پیشنهاد هوشمند</h3>
      </div>

      {coursesCount === 0 ? (
        <div className="border-2 border-dashed border-brutal-ink bg-muted/50 p-3 text-center">
          <p className="text-xs font-bold text-muted-foreground">اول چند درس اضافه کنید.</p>
        </div>
      ) : !ran ? (
        <>
          <p className="text-xs font-bold leading-relaxed text-muted-foreground mb-3">
            بهترین ترکیب بدون تداخل بر اساس اولویت، محدوده واحدها و ترجیحات شما.
          </p>
          <Button
            className="w-full rounded-none border-2 border-brutal-ink bg-primary text-primary-foreground shadow-[3px_3px_0_var(--brutal-ink)] transition-all hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--brutal-ink)] active:translate-y-[2px] active:shadow-none"
            onClick={() => setRan(true)}
          >
            <Sparkles size={16} className="mr-2" /> محاسبه ترکیب‌ها
          </Button>
        </>
      ) : combos.length === 0 ? (
        <div className="border-2 border-brutal-ink bg-destructive/10 p-3">
          <p className="text-xs font-bold leading-relaxed text-destructive">
            {lockedCount > 0
              ? 'هیچ ترکیب معتبری پیدا نشد؛ گروه‌های قفل‌شده ممکن است با هم یا با محدوده واحدها تداخل داشته باشند.'
              : 'هیچ ترکیب معتبری پیدا نشد؛ محدوده واحدها یا تداخل گروه‌ها را بررسی کنید.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lockedCount > 0 && (
            <div className="flex items-center gap-1.5 border-2 border-brutal-ink bg-muted/50 px-2 py-1">
              <Lock size={11} strokeWidth={2.5} className="shrink-0" />
              <p className="text-[11px] font-bold">
                {faDigits(String(lockedCount))} گروه قفل‌شده در همه ترکیب‌ها ثابت است.
              </p>
            </div>
          )}
          {combos.map((combo, i) => {
            const best = i === 0
            const pickedCourses = courses.filter((c) => combo.picks[c.id])
            return (
              <div
                key={i}
                className={cn(
                  'relative overflow-hidden rounded-none border-[3px] p-3 transition-colors',
                  best ? 'border-brutal-ink bg-saffron/20 shadow-[4px_4px_0_var(--brutal-ink)]' : 'border-brutal-ink bg-card shadow-[2px_2px_0_var(--brutal-ink)] hover:bg-muted/30',
                )}
              >
                <div className="flex items-center gap-1.5 border-b-2 border-brutal-ink pb-2 mb-2">
                  {best && <Sparkles size={14} className="shrink-0 text-foreground" strokeWidth={2.5} />}
                  <span className="text-xs font-black tracking-wide">
                    {best ? 'بهترین پیشنهاد' : `گزینه ${i + 1}`}
                  </span>
                  <Badge variant="secondary" className="ms-auto rounded-none border-2 border-brutal-ink bg-background shadow-[2px_2px_0_var(--brutal-ink)] px-2 py-0.5 text-[11px] font-black">
                    {combo.totalUnits} واحد
                  </Badge>
                  {settings.freeDays !== 'off' && (
                    <Badge variant="secondary" className="rounded-none border-2 border-brutal-ink bg-background shadow-[2px_2px_0_var(--brutal-ink)] px-2 py-0.5 text-[11px] font-black">
                      {faDigits(String(combo.freeDays))} روز آزاد
                    </Badge>
                  )}
                </div>

                <ul className="space-y-1.5 text-[11px] font-bold">
                  {pickedCourses.slice(0, 6).map((c) => {
                    const g = c.groups.find((g) => g.id === combo.picks[c.id])!
                    return (
                      <li key={c.id} className="flex items-center gap-2">
                        <div className="size-1.5 bg-foreground rounded-none" />
                        <span className="truncate flex-1">{c.name}</span>
                        <span className="shrink-0 bg-muted px-1 border border-brutal-ink">گ{g.number}</span>
                        {lockedPicks[c.id] && <Lock size={9} strokeWidth={2.5} className="shrink-0 opacity-60" />}
                      </li>
                    )
                  })}
                </ul>

                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "mt-3 w-full rounded-none border-2 border-brutal-ink font-black transition-all active:translate-y-[1px] active:shadow-none",
                    best
                      ? "bg-primary text-primary-foreground shadow-[3px_3px_0_var(--brutal-ink)] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--brutal-ink)]"
                      : "bg-background shadow-[2px_2px_0_var(--brutal-ink)] hover:-translate-y-[1px] hover:bg-secondary hover:shadow-[3px_3px_0_var(--brutal-ink)]"
                  )}
                  onClick={() => onApply(combo.picks)}
                >
                  اعمال این ترکیب
                </Button>
              </div>
            )
          })}
          {incomplete && (
            <div className="mt-1 border-2 border-brutal-ink bg-warning/20 p-2 shadow-[2px_2px_0_var(--brutal-ink)]">
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

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'روشن', icon: Sun },
  { value: 'dark', label: 'تاریک', icon: Moon },
  { value: 'system', label: 'سیستم', icon: Monitor },
]

function SettingsDialog({
  settings,
  onSave,
  onClose,
}: {
  settings: Settings
  onSave: (v: Settings) => void
  onClose: () => void
}) {
  const [minUnits, setMinUnits] = useState(settings.minUnits)
  const [maxUnits, setMaxUnits] = useState(settings.maxUnits)
  const [freeDays, setFreeDays] = useState<PrefLevel>(settings.freeDays)
  const [timeEnabled, setTimeEnabled] = useState(settings.timeFrom !== null && settings.timeTo !== null)
  const [timeFrom, setTimeFrom] = useState(settings.timeFrom ?? 8 * 60)
  const [timeTo, setTimeTo] = useState(settings.timeTo ?? 14 * 60)
  const [timeWeight, setTimeWeight] = useState<PrefLevel>(settings.timeWeight === 'off' ? 'low' : settings.timeWeight)

  /* پشتیبان‌گیری و بازیابی */
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingRestore, setPendingRestore] = useState<Extract<BackupParseResult, { ok: true }> | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const handleBackupDownload = () => {
    const st = useStore.getState()
    downloadBackup({ courses: st.courses, selection: st.selection, locked: st.locked, settings: st.settings })
  }

  const handleRestorePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setRestoreError(null)
    setPendingRestore(null)
    try {
      const res = parseBackupFile(await file.text())
      if (res.ok) setPendingRestore(res)
      else setRestoreError(res.error)
    } catch {
      setRestoreError('خواندن فایل ناموفق بود.')
    }
  }

  const confirmRestore = () => {
    if (!pendingRestore) return
    useStore.getState().restoreAll(pendingRestore.data)
    setPendingRestore(null)
    onClose()
  }

  const handleSave = () => {
    let from: number | null = null
    let to: number | null = null
    if (timeEnabled) {
      // نرمال‌سازی بازه: همیشه «از» قبل از «تا»
      from = Math.min(timeFrom, timeTo)
      to = Math.max(timeFrom, timeTo)
      if (to - from < 15) to = from + 30
    }
    onSave({
      minUnits,
      maxUnits,
      freeDays,
      timeFrom: from,
      timeTo: to,
      timeWeight: timeEnabled ? timeWeight : 'off',
      // تم فوری اعمال شده و نباید با «ذخیره» ریست شود
      theme: settings.theme,
    })
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader>
          <DialogTitle>تنظیمات انتخاب واحد</DialogTitle>
          <DialogDescription>محدوده واحدها و ترجیحات پیشنهاد هوشمند را مشخص کنید.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5 p-6 max-h-[65dvh] overflow-y-auto overflow-x-hidden neo-scrollbar">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 w-full px-1">
            <div className="flex w-full sm:flex-1 flex-col gap-2 min-w-0">
              <Label htmlFor="dash-min" className="text-xs font-black text-muted-foreground uppercase tracking-wider text-center">حداقل واحد</Label>
              <NumberInput
                id="dash-min"
                min={0}
                max={maxUnits}
                value={minUnits}
                onChange={setMinUnits}
                className="shadow-[3px_3px_0_var(--brutal-ink)] w-full"
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
                className="shadow-[3px_3px_0_var(--brutal-ink)] w-full"
              />
            </div>
          </div>

          {/* حالت نمایش */}
          <div className="flex flex-col gap-2 border-t-2 border-brutal-ink pt-4 w-full">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">حالت نمایش</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => useStore.getState().setSettings({ theme: o.value })}
                  aria-pressed={settings.theme === o.value}
                  className={cn(
                    'flex items-center justify-center gap-1.5 border-2 border-brutal-ink py-1.5 text-xs font-black transition-all active:translate-y-[1px] active:shadow-none',
                    settings.theme === o.value
                      ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_var(--brutal-ink)]'
                      : 'bg-background text-foreground shadow-[2px_2px_0_var(--brutal-ink)] hover:bg-secondary',
                  )}
                >
                  <o.icon size={13} strokeWidth={2.5} />
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
              بلافاصله اعمال می‌شود؛ «سیستم» با تنظیم روشن/تاریک دستگاه هماهنگ می‌ماند.
            </p>
          </div>

          <div className="flex flex-col gap-4 border-t-2 border-brutal-ink pt-4 w-full">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">ترجیحات پیشنهاد هوشمند</p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="dash-freedays" className="text-xs font-bold">اهمیت روزهای آزاد</Label>
              <Select value={freeDays} onValueChange={(v) => setFreeDays(v as PrefLevel)}>
                <SelectTrigger id="dash-freedays" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREF_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {PREF_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
                با «کم» یا «زیاد»، ترکیب‌هایی که روز خالی بیشتری دارند امتیاز بیشتری می‌گیرند.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={timeEnabled} onCheckedChange={(v) => setTimeEnabled(v === true)} />
                <span className="text-xs font-bold">ترجیح بازه زمانی مطلوب کلاس‌ها</span>
              </label>
              {timeEnabled && (
                <>
                  <div className="flex items-end justify-center gap-3 w-full">
                    <div className="flex flex-col items-center gap-1.5">
                      <Label className="text-[11px] font-black text-muted-foreground">از</Label>
                      <TimePicker value={timeFrom} onChange={setTimeFrom} />
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <Label className="text-[11px] font-black text-muted-foreground">تا</Label>
                      <TimePicker value={timeTo} onChange={setTimeTo} />
                    </div>
                  </div>
                  <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
                    جلسات بیرون از این بازه در امتیازدهی جریمه می‌شوند.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="dash-timeweight" className="text-xs font-bold">اهمیت این ترجیح</Label>
                    <Select value={timeWeight} onValueChange={(v) => setTimeWeight(v as PrefLevel)}>
                      <SelectTrigger id="dash-timeweight" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">کم</SelectItem>
                        <SelectItem value="high">زیاد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* پشتیبان‌گیری و بازیابی داده‌ها */}
          <div className="flex flex-col gap-3 border-t-2 border-brutal-ink pt-4 w-full">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">پشتیبان‌گیری و بازیابی</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 font-black" onClick={handleBackupDownload}>
                <FileDown size={14} strokeWidth={2.5} />
                دانلود بکاپ
              </Button>
              <Button variant="outline" size="sm" className="flex-1 font-black" onClick={() => fileRef.current?.click()}>
                <FileUp size={14} strokeWidth={2.5} />
                بازیابی از فایل
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleRestorePick}
              />
            </div>
            {restoreError && (
              <p className="flex items-start gap-1.5 border-2 border-destructive bg-destructive/10 p-2 text-[11px] font-bold text-destructive-foreground">
                <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                {restoreError}
              </p>
            )}
            {pendingRestore && (
              <div className="border-2 border-brutal-ink bg-warning/20 p-2.5 shadow-[2px_2px_0_var(--brutal-ink)]">
                <p className="text-[11px] font-bold leading-relaxed text-foreground">
                  {faDigits(String(pendingRestore.stats.courses))} درس و {faDigits(String(pendingRestore.stats.locked))} گروه
                  قفل‌شده در فایل است. بازیابی، همه‌ی داده‌های فعلی را جایگزین می‌کند!
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="xs" className="flex-1 font-black" onClick={confirmRestore}>
                    بازیابی کن
                  </Button>
                  <Button size="xs" variant="outline" className="flex-1 font-black" onClick={() => setPendingRestore(null)}>
                    انصراف
                  </Button>
                </div>
              </div>
            )}
            <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
              بکاپ شامل درس‌ها، انتخاب‌ها، قفل‌ها و تنظیمات است — برای انتقال به دستگاه یا مرورگر دیگر هم کاربرد دارد.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">انصراف</Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleSave}
          >
            ذخیره تغییرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
