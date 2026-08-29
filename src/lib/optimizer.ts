import type { Course, Session, Settings, SuggestionCombo } from '../types'
import { sessionsOverlap, examOverlap } from './time'
import { PRIORITY_WEIGHT } from './priority'

const MAX_NODES = 300_000

/**
 * پیدا کردن بهترین K ترکیب بدون تداخل از بین دروس
 * @returns [combos, hitNodeCap] — اگر hitNodeCap=true یعنی جستجو ناقص بود
 */
export function findBestCombos(
  courses: Course[],
  settings: Settings,
  topK = 5,
): [SuggestionCombo[], boolean] {
  // مرتب‌سازی: اولویت (بیش‌ترین وزن) نزولی، تعداد گروه صعودی (fail-first)
  const sorted = [...courses].sort((a, b) => {
    const wa = PRIORITY_WEIGHT[a.priority]
    const wb = PRIORITY_WEIGHT[b.priority]
    if (wb !== wa) return wb - wa
    return a.groups.length - b.groups.length
  })

  // precompute حداکثر اولویت باقیمانده
  const maxRemaining: number[] = new Array(sorted.length + 1).fill(0)
  for (let i = sorted.length - 1; i >= 0; i--) {
    maxRemaining[i] = maxRemaining[i + 1] + PRIORITY_WEIGHT[sorted[i].priority]
  }

  const results: SuggestionCombo[] = []
  let nodeCount = 0
  let hitCap = false

  /** جلسات انتخاب‌شده فعلی */
  const chosenSessions: { session: Session; courseIdx: number }[] = []
  /** امتحان‌های انتخاب‌شده */
  const chosenExams: { dateISO: string; startMin: number; endMin: number; courseIdx: number }[] = []

  function worstScore(): number {
    if (results.length < topK) return -1
    return results[results.length - 1].score
  }

  function insertResult(combo: SuggestionCombo) {
    // ادغام مرتب
    let pos = 0
    while (pos < results.length && results[pos].score > combo.score) pos++
    while (
      pos < results.length &&
      results[pos].score === combo.score &&
      results[pos].totalUnits > combo.totalUnits
    )
      pos++
    results.splice(pos, 0, combo)
    if (results.length > topK) results.length = topK
  }

  function dfs(idx: number, picks: Record<string, string>, currentUnits: number, currentScore: number) {
    if (hitCap) return
    nodeCount++
    if (nodeCount > MAX_NODES) {
      hitCap = true
      return
    }

    if (idx === sorted.length) {
      if (currentUnits >= settings.minUnits) {
        insertResult({ picks: { ...picks }, totalUnits: currentUnits, score: currentScore })
      }
      return
    }

    // pruning: آیا ممکنه از بهترین نتیجه فعلی بهتر باشیم؟
    if (currentScore + maxRemaining[idx] <= worstScore()) return

    const course = sorted[idx]

    // شاخه «رد کردن» این درس
    dfs(idx + 1, picks, currentUnits, currentScore)

    // شاخه‌های هر گروه
    for (const group of course.groups) {
      const newUnits = currentUnits + course.units
      if (newUnits > settings.maxUnits) continue

      // چک تداخل جلسات
      let hasConflict = false
      for (const s of group.sessions) {
        for (const cs of chosenSessions) {
          if (sessionsOverlap(s, cs.session)) {
            hasConflict = true
            break
          }
        }
        if (hasConflict) break
      }
      if (hasConflict) continue

      // چک تداخل امتحان
      if (group.exam) {
        for (const ce of chosenExams) {
          if (
            examOverlap(
              group.exam.dateISO,
              group.exam.startMin,
              group.exam.endMin,
              ce.dateISO,
              ce.startMin,
              ce.endMin,
            )
          ) {
            hasConflict = true
            break
          }
        }
        if (hasConflict) continue
      }

      // انتخاب این گروه
      const addedSessions = group.sessions.map((s) => ({ session: s, courseIdx: idx }))
      chosenSessions.push(...addedSessions)
      let addedExam: typeof chosenExams[number] | null = null
      if (group.exam) {
        addedExam = { ...group.exam, courseIdx: idx }
        chosenExams.push(addedExam)
      }

      picks[course.id] = group.id
      dfs(idx + 1, picks, newUnits, currentScore + PRIORITY_WEIGHT[course.priority])

      // بازگشت
      delete picks[course.id]
      chosenSessions.length -= addedSessions.length
      if (addedExam) chosenExams.pop()
    }
  }

  dfs(0, {}, 0, 0)

  return [results, hitCap]
}
