import type { PrefLevel } from '../types'

export const PREF_LEVELS: PrefLevel[] = ['off', 'low', 'high']

export const PREF_LABELS: Record<PrefLevel, string> = {
  off: 'بی‌تفاوت',
  low: 'کم',
  high: 'زیاد',
}

/** تعداد روزهای قابل کلاس در هفته (شنبه تا پنجشنبه؛ جمعه همیشه آزاد است) */
export const WEEKDAYS_COUNT = 6

/** امتیاز هر روز آزاد (شنبه تا پنجشنبه) در پیشنهاد هوشمند */
export const FREE_DAYS_BONUS: Record<PrefLevel, number> = { off: 0, low: 1, high: 3 }

/** جریمه هر ۳۰ دقیقه حضور خارج از بازه مطلوب، به ازای هر جلسه */
export const TIME_PENALTY: Record<PrefLevel, number> = { off: 0, low: 1, high: 3 }
