import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Course, DayIndex, Group, Priority, Session, Settings, SelectionMap } from '../types'
import { genId } from '../lib/id'

const DEFAULT_SETTINGS: Settings = { minUnits: 12, maxUnits: 20 }

interface AppState {
  courses: Course[]
  selection: SelectionMap
  settings: Settings
  addCourse: (c: Omit<Course, 'id'>) => void
  updateCourse: (id: string, c: Course) => void
  deleteCourse: (id: string) => void
  setSelection: (courseId: string, groupId: string | null) => void
  applyPicks: (picks: Record<string, string>) => void
  clearSelection: () => void
  setSettings: (s: Partial<Settings>) => void
  replaceCourses: (courses: Course[]) => void
  clearAll: () => void
}

/* ------------------------------------------------------------------ */
/* پاکسازی دیتای ذخیره‌شده از نسخه‌های قدیمی (migrate دفاعی)            */
/* ------------------------------------------------------------------ */

function sanitizeSessions(raw: unknown): Session[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      day: (typeof s.day === 'number' && s.day >= 0 && s.day <= 6 ? Math.floor(s.day) : 0) as DayIndex,
      startMin: typeof s.startMin === 'number' ? s.startMin : 480,
      endMin: typeof s.endMin === 'number' ? s.endMin : 570,
    }))
    .filter((s) => s.endMin > s.startMin)
}

function sanitizeGroups(raw: unknown): Group[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((g, i): Group[] => {
    if (!g || typeof g !== 'object') return []
    const gr = g as Record<string, unknown>
    const group: Group = {
      id: typeof gr.id === 'string' && gr.id ? gr.id : genId('group'),
      number: typeof gr.number === 'string' && gr.number ? gr.number : String(i + 1),
      sessions: sanitizeSessions(gr.sessions),
    }
    if (typeof gr.instructor === 'string' && gr.instructor) group.instructor = gr.instructor
    if (gr.exam && typeof gr.exam === 'object') {
      const e = gr.exam as Record<string, unknown>
      if (typeof e.dateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.dateISO)) {
        group.exam = {
          dateISO: e.dateISO,
          startMin: typeof e.startMin === 'number' ? e.startMin : 480,
          endMin: typeof e.endMin === 'number' ? e.endMin : 600,
        }
      }
    }
    return [group]
  })
}

/** تبدیل اولویت ذخیره‌شده (عدد ۱..۵ از نسخه قدیمی یا رشته) به سه سطح کم/متوسط/زیاد */
function sanitizePriority(raw: unknown): Priority {
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw
  if (typeof raw === 'number' && raw >= 1 && raw <= 5) {
    if (raw <= 2) return 'low'
    if (raw >= 4) return 'high'
    return 'medium'
  }
  return 'medium'
}

function sanitizeCourses(raw: unknown): Course[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((c): Course[] => {
    if (!c || typeof c !== 'object') return []
    const co = c as Record<string, unknown>
    if (typeof co.name !== 'string' || !co.name.trim()) return []
    return [
      {
        id: typeof co.id === 'string' && co.id ? co.id : genId('course'),
        name: co.name,
        units: typeof co.units === 'number' && co.units >= 0 ? co.units : 0,
        priority: sanitizePriority(co.priority),
        groups: sanitizeGroups(co.groups),
      },
    ]
  })
}

function sanitizeSelection(raw: unknown): SelectionMap {
  if (!raw || typeof raw !== 'object') return {}
  const out: SelectionMap = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || typeof v === 'string') out[k] = v
  }
  return out
}

function sanitizeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const min =
    typeof s.minUnits === 'number' && s.minUnits >= 0 ? Math.floor(s.minUnits) : DEFAULT_SETTINGS.minUnits
  const max =
    typeof s.maxUnits === 'number' && s.maxUnits >= 1 ? Math.floor(s.maxUnits) : DEFAULT_SETTINGS.maxUnits
  return { minUnits: min, maxUnits: Math.max(min, max) }
}

/** هر نسخه‌ای از دیتای ذخیره‌شده را به شکل معتبر فعلی تبدیل می‌کند */
function migrateState(persisted: unknown): Pick<AppState, 'courses' | 'selection' | 'settings'> {
  const raw = (persisted && typeof persisted === 'object' ? persisted : {}) as Record<string, unknown>
  return {
    courses: sanitizeCourses(raw.courses),
    selection: sanitizeSelection(raw.selection),
    settings: sanitizeSettings(raw.settings),
  }
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      courses: [],
      selection: {},
      settings: DEFAULT_SETTINGS,

      addCourse: (c) =>
        set((st) => ({ courses: [...st.courses, { ...c, id: genId('course') }] })),

      updateCourse: (id, c) =>
        set((st) => ({
          courses: st.courses.map((x) => (x.id === id ? c : x)),
          selection: Object.fromEntries(
            Object.entries(st.selection).filter(([cid]) => cid !== id || c.groups.some((g) => g.id === st.selection[cid])),
          ),
        })),

      deleteCourse: (id) =>
        set((st) => {
          const { [id]: _removed, ...rest } = st.selection
          return { courses: st.courses.filter((c) => c.id !== id), selection: rest }
        }),

      setSelection: (courseId, groupId) =>
        set((st) => ({ selection: { ...st.selection, [courseId]: groupId } })),

      applyPicks: (picks) =>
        set((st) => {
          const sel: SelectionMap = {}
          for (const c of st.courses) {
            sel[c.id] = picks[c.id] ?? null
          }
          return { selection: sel }
        }),

      clearSelection: () => set({ selection: {} }),

      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

      replaceCourses: (courses) => set({ courses }),

      clearAll: () => set({ courses: [], selection: {}, settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'class-planning-v1',
      // از این پس هر تغییر ساختار داده = افزایش version + هندل در migrateState
      version: 2,
      migrate: (persisted) => migrateState(persisted),
    },
  ),
)

export function selectedGroups(state: { courses: Course[]; selection: SelectionMap }): Group[] {
  const byGroup = new Map<string, { group: Group; course: Course }>()
  for (const c of state.courses) {
    for (const g of c.groups) byGroup.set(g.id, { group: g, course: c })
  }
  const out: Group[] = []
  for (const gid of Object.values(state.selection)) {
    if (!gid) continue
    const found = byGroup.get(gid)
    if (found) out.push(found.group)
  }
  return out
}

export function totalUnits(state: { courses: Course[]; selection: SelectionMap }): number {
  let sum = 0
  for (const [cid, gid] of Object.entries(state.selection)) {
    if (!gid) continue
    const course = state.courses.find((c) => c.id === cid)
    if (course?.groups.some((g) => g.id === gid)) sum += course.units
  }
  return sum
}
