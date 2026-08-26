import { BookOpen, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import CourseForm from '@/components/CourseForm'
import ImportDialog from '@/components/ImportDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { dayName, minToTime } from '@/lib/time'
import { useStore } from '@/store/useStore'
import type { Course } from '@/types'

export default function CoursesPage() {
  const courses = useStore((s) => s.courses)
  const addCourse = useStore((s) => s.addCourse)
  const updateCourse = useStore((s) => s.updateCourse)
  const deleteCourse = useStore((s) => s.deleteCourse)
  const [editing, setEditing] = useState<Course | 'new' | null>(null)
  const [importing, setImporting] = useState(false)

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-5 text-lg font-extrabold tracking-tight">
            {editing === 'new' ? 'افزودن درس جدید' : `ویرایش درس: ${editing.name}`}
          </h2>
          <CourseForm
            initial={editing === 'new' ? undefined : editing}
            onSave={(c) => {
              if (editing === 'new') addCourse(c)
              else updateCourse(c.id, c)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => setEditing('new')}>
              <Plus /> درس جدید
            </Button>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <Upload /> وارد کردن از اکسل
            </Button>
          </div>

          {courses.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={36} strokeWidth={1.5} />}
              title="هنوز درسی ثبت نشده"
              hint="با دکمه «درس جدید» شروع کنید یا لیست ترمتان را از اکسل وارد کنید."
            />
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام درس</TableHead>
                    <TableHead className="w-16 text-center">واحد</TableHead>
                    <TableHead className="w-20 text-center">اولویت</TableHead>
                    <TableHead>گروه‌ها</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold">{c.name}</TableCell>
                      <TableCell className="text-center">{c.units}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{c.priority}/۵</Badge>
                      </TableCell>
                      <TableCell className="text-[13px]">
                        {c.groups.map((g) => (
                          <div key={g.id} className="leading-relaxed">
                            گروه {g.number}
                            {g.instructor ? ` — ${g.instructor}` : ''}
                            {g.sessions.map((s, i) => (
                              <span key={i} className="text-muted-foreground">
                                {' · '}
                                {dayName(s.day)} {minToTime(s.startMin)}–{minToTime(s.endMin)}
                              </span>
                            ))}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button variant="ghost" size="icon-sm" aria-label={`ویرایش ${c.name}`} onClick={() => setEditing(c)}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`حذف ${c.name}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`درس «${c.name}» حذف شود؟`)) deleteCourse(c.id)
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="text-muted-foreground/50">{icon}</div>}
      <p className="font-bold">{title}</p>
      {hint && <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}
