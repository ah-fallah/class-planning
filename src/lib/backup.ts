import type { Course, SelectionMap, Settings } from '@/types'

/** داده‌ی خام بازیابی‌شده از فایل بکاپ — هنوز اعتبارسنجی عمیق نشده */
export interface BackupRestoreData {
  courses: unknown
  selection: unknown
  settings: unknown
  locked: unknown
}

/** داده‌ای که هنگام دانلود در فایل بکاپ ذخیره می‌شود */
export interface BackupFile {
  app: 'class-planning-backup'
  version: 1
  exportedAt: string
  data: {
    courses: Course[]
    selection: SelectionMap
    locked: Record<string, boolean>
    settings: Settings
  }
}

export function createBackupFile(data: BackupFile['data']): BackupFile {
  return { app: 'class-planning-backup', version: 1, exportedAt: new Date().toISOString(), data }
}

/** ساخت و دانلود فایل بکاپ JSON */
export function downloadBackup(data: BackupFile['data']): void {
  const json = JSON.stringify(createBackupFile(data), null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `class-planning-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type BackupParseResult =
  | { ok: true; data: BackupRestoreData; stats: { courses: number; locked: number } }
  | { ok: false; error: string }

/**
 * خواندن و اعتبارسنجی سطحی فایل بکاپ.
 * اعتبارسنجی عمیق (شکل درس‌ها/گروه‌ها/تنظیمات) هنگام restore در store با
 * migrateState (پاک‌سازی دفاعی) انجام می‌شود.
 */
export function parseBackupFile(text: string): BackupParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'فایل، JSON معتبر نیست.' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'ساختار فایل بکاپ نامعتبر است.' }
  }
  const obj = parsed as Record<string, unknown>
  if (obj.app !== 'class-planning-backup') {
    return { ok: false, error: 'این فایل بکاپِ این برنامه نیست.' }
  }
  if (typeof obj.version !== 'number' || obj.version > 1) {
    return { ok: false, error: 'نسخه‌ی فایل بکاپ با این برنامه سازگار نیست.' }
  }
  const d = obj.data
  if (!d || typeof d !== 'object' || Array.isArray(d) || !Array.isArray((d as Record<string, unknown>).courses)) {
    return { ok: false, error: 'داده‌های بکاپ نامعتبر است (لیست درس‌ها پیدا نشد).' }
  }
  const data = d as BackupRestoreData
  const locked = data.locked
  const lockedCount = locked && typeof locked === 'object' ? Object.values(locked).filter(Boolean).length : 0
  return {
    ok: true,
    data,
    stats: { courses: (data.courses as unknown[]).length, locked: lockedCount },
  }
}
