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

export interface Course {
  id: string
  name: string
  units: number
  priority: number // 1..5 — بالاتر یعنی مهم‌تر
  groups: Group[]
}

export interface Settings {
  minUnits: number
  maxUnits: number
}

/** courseId -> selected groupId (null = درس حذف شده از انتخاب) */
export type SelectionMap = Record<string, string | null>

export interface SuggestionCombo {
  picks: Record<string, string> // courseId -> groupId
  totalUnits: number
  score: number
}
