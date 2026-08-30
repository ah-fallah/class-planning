export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=شنبه .. 6=جمعه

export interface Session {
  day: DayIndex
  startMin: number
  endMin: number
}

export interface ExamSlot {
  dateISO: string // "2027-01-14"
  startMin: number
  endMin: number
}

export interface Group {
  id: string
  number: string
  instructor?: string
  sessions: Session[]
  exam?: ExamSlot
}

export type Priority = 'low' | 'medium' | 'high'

export interface Course {
  id: string
  name: string
  units: number
  priority: Priority // کم | متوسط | زیاد
  groups: Group[]
}

/** سطح اهمیت ترجیحات در پیشنهاد هوشمند */
export type PrefLevel = 'off' | 'low' | 'high'

/** حالت نمایش برنامه: روشن، تاریک یا هماهنگ با تنظیم سیستم */
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Settings {
  minUnits: number
  maxUnits: number
  /** اهمیت روزهای آزاد (روز کمتر کلاس) در امتیازدهی پیشنهادها */
  freeDays: PrefLevel
  /** شروع بازه زمانی مطلوب کلاس‌ها (دقیقه از نیمه‌شب)؛ null = غیرفعال */
  timeFrom: number | null
  /** پایان بازه زمانی مطلوب کلاس‌ها (دقیقه از نیمه‌شب)؛ null = غیرفعال */
  timeTo: number | null
  /** اهمیت جریمه جلسات بیرون از بازه مطلوب */
  timeWeight: PrefLevel
  /** تم رنگی برنامه — بلافاصله اعمال می‌شود و در فایل بکاپ هم ذخیره می‌شود */
  theme: ThemeMode
}

/** courseId -> selected groupId (null = درس حذف شده از انتخاب) */
export type SelectionMap = Record<string, string | null>

export interface SuggestionCombo {
  picks: Record<string, string> // courseId -> groupId
  totalUnits: number
  score: number
  /** تعداد روزهای آزاد (شنبه تا پنجشنبه) در این ترکیب */
  freeDays: number
  /** تعداد دروس قفل‌شده که در این ترکیب ثابت مانده‌اند */
  lockedCount: number
}
