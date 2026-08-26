import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Course, Group, Settings, SelectionMap } from '../types'
import { genId } from '../lib/id'

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

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      courses: [],
      selection: {},
      settings: { minUnits: 12, maxUnits: 20 },

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

      clearAll: () => set({ courses: [], selection: {}, settings: { minUnits: 12, maxUnits: 20 } }),
    }),
    { name: 'class-planning-v1' },
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
