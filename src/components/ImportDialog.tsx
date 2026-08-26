import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { parseWorkbook, type ImportResult } from '@/lib/excel'
import { useStore } from '@/store/useStore'

interface Props {
  onClose: () => void
}

export default function ImportDialog({ onClose }: Props) {
  const replaceCourses = useStore((s) => s.replaceCourses)
  const courses = useStore((s) => s.courses)
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'append' | 'replace'>('replace')
  const [busy, setBusy] = useState(false)

  async function handleFile(f: File | undefined) {
    if (!f) return
    setBusy(true)
    setError('')
    try {
      const res = await parseWorkbook(f)
      setParsed(res)
    } catch {
      setError('خواندن فایل ناموفق بود. مطمئن شوید فایل اکسل معتبر است.')
    }
    setBusy(false)
  }

  const okCount = parsed?.courses.length ?? 0
  const errCount = parsed?.rows.filter((r) => r.error).length ?? 0

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>وارد کردن دروس از فایل اکسل</DialogTitle>
          <DialogDescription>
            ستون‌های قابل قبول: نام درس، شماره گروه، استاد، واحد، روزها، ساعت شروع، ساعت پایان،
            تاریخ امتحان (شمسی مثل ۱۴۰۵/۱۰/۲۹ یا میلادی). هر سطر یک جلسه کلاس است؛ سطرهای با
            نام و گروه یکسان ادغام می‌شوند.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload /> {busy ? 'در حال خواندن...' : 'انتخاب فایل...'}
        </Button>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {parsed && (
          <>
            <h3 className="text-sm font-bold">
              پیش‌نمایش: {okCount} درس شناسایی شد{errCount ? ` — ${errCount} سطر خطا دارد` : ''}
            </h3>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">سطر</TableHead>
                    <TableHead>نام درس</TableHead>
                    <TableHead className="w-16 text-center">واحد</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.rows.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell>{r.course?.name ?? '—'}</TableCell>
                      <TableCell className="text-center">{r.course?.units ?? '—'}</TableCell>
                      <TableCell>
                        {r.error ? (
                          <Badge variant="destructive">{r.error}</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-success/15 text-foreground">
                            معتبر
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'append' | 'replace')} className="gap-2.5">
              <Label className="flex cursor-pointer items-center gap-2 font-normal">
                <RadioGroupItem value="replace" />
                جایگزینی همه دروس فعلی
              </Label>
              <Label className="flex items-center gap-2 font-normal" aria-disabled={courses.length === 0}>
                <RadioGroupItem value="append" disabled={courses.length === 0} />
                افزودن به دروس فعلی{courses.length === 0 ? ' (درسی موجود نیست)' : ''}
              </Label>
            </RadioGroup>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose}>انصراف</Button>
              <Button
                disabled={okCount === 0}
                onClick={() => {
                  replaceCourses(
                    mode === 'replace' ? parsed.courses : [...courses, ...parsed.courses],
                  )
                  onClose()
                }}
              >
                ثبت {okCount} درس
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
