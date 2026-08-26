import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/store/useStore'

export default function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const clearAll = useStore((s) => s.clearAll)
  const [minUnits, setMinUnits] = useState(String(settings.minUnits))
  const [maxUnits, setMaxUnits] = useState(String(settings.maxUnits))

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>محدودیت واحدها</CardTitle>
          <CardDescription>این محدوده در بررسی انتخاب‌ها و پیشنهاد ترکیب‌ها استفاده می‌شود.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex w-32 flex-col gap-1.5">
              <Label htmlFor="min-units">حداقل واحد مجاز</Label>
              <Input id="min-units" type="number" min={0} max={24} value={minUnits} onChange={(e) => setMinUnits(e.target.value)} />
            </div>
            <div className="flex w-32 flex-col gap-1.5">
              <Label htmlFor="max-units">حداکثر واحد مجاز</Label>
              <Input id="max-units" type="number" min={1} max={30} value={maxUnits} onChange={(e) => setMaxUnits(e.target.value)} />
            </div>
            <Button
              onClick={() => {
                const min = Math.max(0, parseInt(minUnits, 10) || 0)
                const max = Math.max(min + 1, parseInt(maxUnits, 10) || min + 1)
                setSettings({ minUnits: min, maxUnits: max })
                setMinUnits(String(min))
                setMaxUnits(String(max))
              }}
            >
              ذخیره
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">پاک کردن داده‌ها</CardTitle>
          <CardDescription>
            همه دروس، انتخاب‌ها و تنظیمات از مرورگر حذف می‌شوند. این عمل قابل بازگشت نیست.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('همه داده‌ها پاک شوند؟ این عمل قابل بازگشت نیست.')) clearAll()
            }}
          >
            پاک کردن همه داده‌ها
          </Button>
        </CardContent>
      </Card>

      <Separator className="opacity-0" />
    </div>
  )
}
