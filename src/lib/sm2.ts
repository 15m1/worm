import type { Question, Rating, ReviewState } from '../types'

// SM-2 间隔重复算法（Anki 风格）的轻量实现
// rating: again(忘了) / hard(模糊) / good(记住了) / easy(很熟)

const RATING_QUALITY: Record<Rating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
}

export interface Sm2Result {
  state: ReviewState
  interval: number
}

export function applyRating(q: Question, rating: Rating, now = Date.now()): Sm2Result {
  const r = q.review
  const quality = RATING_QUALITY[rating]
  const day = 86400000

  let repetitions = r.repetitions
  let ease = r.ease
  let interval: number
  let status: ReviewState['status']

  // 更新难度系数（SM-2 公式）
  ease = Math.max(
    1.3,
    ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  )

  if (quality < 3) {
    // 忘了/模糊：重置连续答对次数，重新学习
    repetitions = 0
    interval = rating === 'again' ? 0 : 1 // 忘了当天重来，模糊明天再看
    status = 'learning'
  } else {
    repetitions += 1
    if (repetitions === 1) interval = 1
    else if (repetitions === 2) interval = 6
    else interval = Math.round(r.interval * ease)
    status = repetitions >= 7 && interval >= 30 ? 'mastered' : 'reviewing'
  }

  const state: ReviewState = {
    status,
    repetitions,
    interval,
    ease,
    dueAt: now + interval * day,
    lastReviewedAt: now,
  }
  return { state, interval }
}

export function isDue(q: Question, now = Date.now()): boolean {
  return q.review.dueAt <= now
}

export function dueCount(questions: Question[], now = Date.now()): number {
  return questions.filter((q) => isDue(q, now)).length
}
