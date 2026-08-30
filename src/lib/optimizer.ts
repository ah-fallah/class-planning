import type { Course, Session, Settings, SuggestionCombo } from '../types'
import { sessionsOverlap, examOverlap } from './time'
import { PRIORITY_WEIGHT } from './priority'
import { FREE_DAYS_BONUS, TIME_PENALTY, WEEKDAYS_COUNT } from './prefs'

const MAX_NODES = 300_000

/**
 * پیدا کردن بهترین K ترکیب بدون تداخل از بین دروس
 * @param lockedPicks نقشه courseId -> groupId؛ این گروه‌ها در همه ترکیب‌ها ثابت می‌مانند
 * @returns [combos, hitNodeCap] — اگر hitNodeCap=true یعنی جستجو ناقص بود
 */
export function findBestCombos(
  courses: Course[],
  settings: Settings,
  topK = 5,
  lockedPicks: Record<string, string> = {},
): [SuggestionCombo[], boolean] {
  const byId = new Map(courses.map((c) => [c.id, c]))

  // ---- اعمال قفل‌ها: نقطه شروع ثابت جستجو ----
  const picks: Record<string, string> = {}
  const chosenSessions: { session: Session }[] = []
  const chosenExams: { dateISO: string; startMin: number; endMin: number }[] = []
  let baseUnits = 0
  let baseScore = 0
  let lockedCount = 0
  for (const [cid, gid] of Object.entries(lockedPicks)) {
    const course = byId.get(cid)
    const group = course?.groups.find((g) => g.id === gid)
    if (!course || !group) continue
    picks[cid] = gid
    lockedCount++
    baseUnits += course.units
    baseScore += PRIORITY_WEIGHT[course.priority]
    for (const s of group.sessions) chosenSessions.push({ session: s })
    if (group.exam) {
      chosenExams.push({
        dateISO: group.exam.dateISO,
        startMin: group.exam.startMin,
        endMin: group.exam.endMin,
      })
    }
  }

  // قفل‌ها از سقف واحدها عبور کرده‌اند یا با هم تداخل دارند → هیچ ترکیبی معتبر نیست
  if (baseUnits > settings.maxUnits) return [[], false]
  for (let i = 0; i < chosenSessions.length; i++) {
    for (let j = i + 1; j < chosenSessions.length; j++) {
      if (sessionsOverlap(chosenSessions[i].session, chosenSessions[j].session)) return [[], false]
    }
  }
  for (let i = 0; i < chosenExams.length; i++) {
    for (let j = i + 1; j < chosenExams.length; j++) {
      if (
        examOverlap(
          chosenExams[i].dateISO,
          chosenExams[i].startMin,
          chosenExams[i].endMin,
          chosenExams[j].dateISO,
          chosenExams[j].startMin,
          chosenExams[j].endMin,
        )
      )
        return [[], false]
    }
  }

  // مرتب‌سازی: اولویت (بیش‌ترین وزن) نزولی، تعداد گروه صعودی (fail-first) — دروس قفل‌شده حذف می‌شوند
  const sorted = courses
    .filter((c) => !(c.id in picks))
    .sort((a, b) => {
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

  // سقف خوش‌بینانه امتیاز روزهای آزاد برای هرس (جریمه زمان فقط امتیاز را کم می‌کند؛ نادیده گرفته می‌شود)
  const maxFreeDaysBonus = FREE_DAYS_BONUS[settings.freeDays] * WEEKDAYS_COUNT

  const results: SuggestionCombo[] = []
  let nodeCount = 0
  let hitCap = false

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
        // امتیاز ترجیحات: روزهای آزاد (شنبه تا پنجشنبه) و جریمه جلسات خارج از بازه مطلوب
        const freeDaysBonus = FREE_DAYS_BONUS[settings.freeDays]
        const timePenaltyWeight = TIME_PENALTY[settings.timeWeight]
        let freeDays = 0
        let timePenalty = 0
        if (freeDaysBonus > 0 || timePenaltyWeight > 0) {
          const usedDays = new Set<number>()
          const tf = settings.timeFrom
          const tt = settings.timeTo
          for (const cs of chosenSessions) {
            if (cs.session.day < WEEKDAYS_COUNT) usedDays.add(cs.session.day)
            if (timePenaltyWeight > 0 && tf !== null && tt !== null) {
              const outside = Math.max(0, tf - cs.session.startMin) + Math.max(0, cs.session.endMin - tt)
              if (outside > 0) timePenalty += Math.ceil(outside / 30) * timePenaltyWeight
            }
          }
          freeDays = WEEKDAYS_COUNT - usedDays.size
        }
        insertResult({
          picks: { ...picks },
          totalUnits: currentUnits,
          score: currentScore + freeDays * freeDaysBonus - timePenalty,
          freeDays,
          lockedCount,
        })
      }
      return
    }

    // pruning: آیا ممکنه از بهترین نتیجه فعلی بهتر باشیم؟ (خوش‌بینانه: با سقف امتیاز روزهای آزاد)
    if (currentScore + maxRemaining[idx] + maxFreeDaysBonus <= worstScore()) return

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
      const addedSessions = group.sessions.map((s) => ({ session: s }))
      chosenSessions.push(...addedSessions)
      let addedExam: typeof chosenExams[number] | null = null
      if (group.exam) {
        addedExam = { ...group.exam }
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

  dfs(0, picks, baseUnits, baseScore)

  return [results, hitCap]
}
