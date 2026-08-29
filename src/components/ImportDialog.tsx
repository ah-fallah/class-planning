import { useRef, useState } from 'react'
import { CheckCircle2, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { parseWorkbook } from '@/lib/excel'
import type { ImportResult } from '@/lib/excel'
import { useStore } from '@/store/useStore'

interface Props {
  onClose: () => void
}

export default function ImportDialog({ onClose }: Props) {
  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setParsing(true)
    setResult(null)
    setStatus(null)
    setFileName(file.name)
    try {
      setResult(await parseWorkbook(file))
    } catch {
      setStatus('خواندن فایل ناموفق بود. فرمت فایل (xlsx، xls یا csv) را بررسی کنید.')
      setFileName(null)
    } finally {
      setParsing(false)
    }
  }

  function handleImport() {
    if (!result) return
    const existing = useStore.getState().courses
    const names = new Set(existing.map((c) => c.name))
    const fresh = result.courses.filter((c) => !names.has(c.name))
    useStore.getState().replaceCourses([...existing, ...fresh])
    const skipped = result.courses.length - fresh.length
    setStatus(
      `${fresh.length} درس اضافه شد${skipped > 0 ? ` — ${skipped} درس هم‌نام که از قبل وجود داشت نادیده گرفته شد` : ''}.`,
    )
    setResult(null)
    setFileName(null)
  }

  const errors = result?.rows.filter((r) => r.error) ?? []
  const totalGroups = result?.courses.reduce((n, c) => n + c.groups.length, 0) ?? 0

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader>
          <DialogTitle>ورود دروس از اکسل</DialogTitle>
          <DialogDescription>
            فایل اکسل یا CSV حاوی ستون‌های «نام درس، گروه، واحد، روزها، ساعت شروع، ساعت پایان و
            تاریخ امتحان» را انتخاب کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 p-6">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            disabled={parsing}
            onClick={() => fileRef.current?.click()}
            className="w-full"
          >
            <FileSpreadsheet /> {parsing ? 'در حال خواندن…' : 'انتخاب فایل'}
          </Button>
          {fileName && !result && !status && <p className="text-xs text-muted-foreground text-center">{fileName}</p>}

          {result && (
            <div className="flex flex-col gap-2">
              <div className="border-2 border-foreground bg-background px-3 py-2 text-sm font-bold shadow-[2px_2px_0_var(--color-foreground)]">
                {result.courses.length} درس و {totalGroups} گروه شناسایی شد
                {errors.length > 0 && (
                  <span className="text-warning"> — {errors.length} ردیف دارای خطا</span>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto border-2 border-foreground/30 bg-background/50 px-3 py-2">
                <ul className="flex flex-col gap-1 text-xs font-bold">
                  {result.courses.map((c) => (
                    <li key={c.id}>
                      {c.name} — {c.units} واحد — {c.groups.length} گروه
                    </li>
                  ))}
                  {errors.map((r, i) => (
                    <li key={`e${i}`} className="flex items-start gap-1 text-destructive">
                      <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                      ردیف {r.rowNumber}: {r.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {status && (
            <p className="flex items-start gap-1.5 text-xs font-bold">
              {status.startsWith('خواندن') ? (
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
              )}
              {status}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            بستن
          </Button>
          <Button disabled={!result || result.courses.length === 0} onClick={handleImport} className="w-full sm:w-auto">
            <Upload /> افزودن به دروس
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}