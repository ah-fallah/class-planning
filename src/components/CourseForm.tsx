import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/NumberInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import JalaliDatePicker from '@/components/JalaliDatePicker'
import TimePicker from '@/components/TimePicker'
import type { Course, DayIndex, ExamSlot, Group, Priority, Session } from '@/types'
import { DAY_NAMES } from '@/lib/time'
import { PRIORITIES, PRIORITY_LABELS } from '@/lib/priority'
import { genId } from '@/lib/id'
import { Trash2 } from 'lucide-react'

interface Props {
  initial?: Course
  onSave: (c: Course) => void
  onCancel: () => void
}

export default function CourseForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [units, setUnits] = useState(initial?.units ?? 3)
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium')
  const [groups, setGroups] = useState<Group[]>(
    initial?.groups.length
      ? initial.groups
      : [
          {
            id: genId('group'),
            number: '۱',
            instructor: '',
            sessions: [{ day: 0 as DayIndex, startMin: 480, endMin: 570 }],
          },
        ],
  )

  function updateGroup(gid: string, patch: Partial<Group>) {
    setGroups((gs) => gs.map((g) => (g.id === gid ? { ...g, ...patch } : g)))
  }

  function updateSession(gid: string, sid: number, patch: Partial<Session>) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid
          ? { ...g, sessions: g.sessions.map((s, i) => (i === sid ? { ...s, ...patch } : s)) }
          : g,
      ),
    )
  }

  function addGroup() {
    setGroups((gs) => [
      ...gs,
      {
        id: genId('group'),
        number: String(gs.length + 1),
        instructor: '',
        sessions: [{ day: 0 as DayIndex, startMin: 480, endMin: 570 }],
      },
    ])
  }

  function addSession(gid: string) {
    updateGroup(gid, {
      sessions: [
        ...(groups.find((g) => g.id === gid)?.sessions ?? []),
        { day: 0 as DayIndex, startMin: 480, endMin: 570 },
      ],
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const cleanGroups: Group[] = groups.map((g) => {
      const sessions = g.sessions.filter((s) => s.endMin > s.startMin)
      const exam = g.exam && g.exam.dateISO ? g.exam : undefined
      return { ...g, number: g.number.trim() || '?', instructor: g.instructor?.trim(), sessions, exam }
    })
    onSave({
      id: initial?.id ?? genId('course'),
      name: name.trim(),
      units: Math.max(0, units),
      priority,
      groups: cleanGroups,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex min-w-52 flex-1 flex-col gap-1.5">
          <Label htmlFor="course-name">نام درس *</Label>
          <Input id="course-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="flex w-32 flex-col gap-1.5">
          <Label htmlFor="course-units">تعداد واحد</Label>
          <NumberInput
            id="course-units"
            min={0}
            max={10}
            value={units}
            onChange={setUnits}
            className="h-9 shadow-[2px_2px_0_var(--brutal-ink)]"
          />
        </div>
        <div className="flex w-24 flex-col gap-1.5">
          <Label htmlFor="course-priority">اولویت</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger id="course-priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {groups.map((g, gi) => (
        <div className="mb-3 rounded-xl border border-dashed border-border p-4" key={g.id}>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <strong className="pb-2 text-sm">گروه {gi + 1}</strong>
            <div className="flex w-24 flex-col gap-1.5">
              <Label htmlFor={`gnum-${g.id}`}>شماره گروه</Label>
              <Input id={`gnum-${g.id}`} value={g.number} onChange={(e) => updateGroup(g.id, { number: e.target.value })} />
            </div>
            <div className="flex min-w-44 flex-1 flex-col gap-1.5">
              <Label htmlFor={`ginstr-${g.id}`}>استاد</Label>
              <Input id={`ginstr-${g.id}`} value={g.instructor ?? ''} onChange={(e) => updateGroup(g.id, { instructor: e.target.value })} />
            </div>
            {groups.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-none border-2 border-brutal-ink bg-destructive/10 text-destructive-foreground shadow-[1px_1px_0_var(--brutal-ink)] transition-all hover:-translate-y-[1px] hover:bg-destructive hover:text-white hover:shadow-[2px_2px_0_var(--brutal-ink)] active:translate-y-[1px] active:shadow-none"
                onClick={() => setGroups((gs) => gs.filter((x) => x.id !== g.id))}
                aria-label="حذف گروه"
              >
                <Trash2 size={15} />
              </Button>
            )}
          </div>

          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">جلسات کلاس:</p>
          {g.sessions.map((s, si) => (
            <div className="mb-2 flex flex-wrap items-center gap-2" key={si}>
              <Select
                value={String(s.day)}
                onValueChange={(v) => updateSession(g.id, si, { day: +v as DayIndex })}
              >
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, di) => (
                    <SelectItem key={di} value={String(di)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TimePicker
                id={`start-${g.id}-${si}`}
                value={s.startMin}
                onChange={(min) => updateSession(g.id, si, { startMin: min })}
              />
              <span className="text-xs text-muted-foreground">تا</span>
              <TimePicker
                id={`end-${g.id}-${si}`}
                value={s.endMin}
                onChange={(min) => updateSession(g.id, si, { endMin: min })}
              />
              {g.sessions.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-none border-2 border-brutal-ink bg-destructive/10 text-destructive-foreground shadow-[1px_1px_0_var(--brutal-ink)] transition-all hover:-translate-y-[1px] hover:bg-destructive hover:text-white hover:shadow-[2px_2px_0_var(--brutal-ink)] active:translate-y-[1px] active:shadow-none"
                  aria-label="حذف جلسه"
                  onClick={() => updateGroup(g.id, { sessions: g.sessions.filter((_, i) => i !== si) })}
                >
                  <X strokeWidth={2.5} size={14} />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="xs" onClick={() => addSession(g.id)}>
            <Plus /> افزودن جلسه
          </Button>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`exam-${g.id}`}>تاریخ امتحان (اختیاری)</Label>
              <JalaliDatePicker
                id={`exam-${g.id}`}
                value={g.exam?.dateISO ?? ''}
                onChange={(dateISO) => {
                  updateGroup(g.id, {
                    exam: dateISO
                      ? ({ dateISO, startMin: g.exam?.startMin ?? 480, endMin: g.exam?.endMin ?? 600 } as ExamSlot)
                      : undefined,
                  })
                }}
              />
            </div>
            {g.exam?.dateISO && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`exam-start-${g.id}`}>ساعت شروع امتحان</Label>
                  <TimePicker
                    id={`exam-start-${g.id}`}
                    value={g.exam.startMin}
                    onChange={(min) => {
                      if (g.exam) updateGroup(g.id, { exam: { ...g.exam, startMin: min } })
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`exam-end-${g.id}`}>ساعت پایان امتحان</Label>
                  <TimePicker
                    id={`exam-end-${g.id}`}
                    value={g.exam.endMin}
                    onChange={(min) => {
                      if (g.exam) updateGroup(g.id, { exam: { ...g.exam, endMin: min } })
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={addGroup}>
          <Plus /> افزودن گروه جدید
        </Button>
        <span className="flex-1" />
        <Button type="button" variant="outline" onClick={onCancel}>
          انصراف
        </Button>
        <Button type="submit">ذخیره</Button>
      </div>
    </form>
  )
}
