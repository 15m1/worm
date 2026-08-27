import type { Question, ReviewLog } from '../types'
import { isDue } from './sm2'
import dayjs from 'dayjs'

export interface DailyActivity {
  [date: string]: number // 'YYYY-MM-DD' -> 复习次数
}

export function buildActivity(reviewLogs: ReviewLog[]): DailyActivity {
  const map: DailyActivity = {}
  for (const log of reviewLogs) {
    const d = dayjs(log.reviewedAt).format('YYYY-MM-DD')
    map[d] = (map[d] ?? 0) + 1
  }
  return map
}

export function buildStudyActivity(questions: Question[]): DailyActivity {
  const map: DailyActivity = {}
  for (const q of questions) {
    if (!q.review.lastReviewedAt) continue
    const d = dayjs(q.review.lastReviewedAt).format('YYYY-MM-DD')
    map[d] = (map[d] ?? 0) + 1
  }
  return map
}

export function currentStreak(activity: DailyActivity, now = dayjs()): number {
  let streak = 0
  let cursor = now
  // 今天还没记录则从昨天开始算
  if (!activity[cursor.format('YYYY-MM-DD')]) {
    cursor = cursor.subtract(1, 'day')
  }
  while (activity[cursor.format('YYYY-MM-DD')]) {
    streak += 1
    cursor = cursor.subtract(1, 'day')
  }
  return streak
}

export function categoryDistribution(questions: Question[]): { name: string; value: number; color: string }[] {
  const map = new Map<string, number>()
  for (const q of questions) map.set(q.category, (map.get(q.category) ?? 0) + 1)
  return Array.from(map.entries()).map(([id, value]) => ({
    name: categoryDef(id).name, // 显示中文分类名
    value,
    color: getCategoryColor(id),
  }))
}

export function difficultyDistribution(questions: Question[]): Record<string, number> {
  const out: Record<string, number> = { 简单: 0, 中等: 0, 困难: 0 }
  for (const q of questions) out[q.difficulty] = (out[q.difficulty] ?? 0) + 1
  return out
}

import { categoryDef } from '../types'

export function getCategoryColor(id: string): string {
  return categoryDef(id).color
}

// 复习及时率：过去 windowDays 天内，到期后 24h 内完成复习的比例
export function timelyRate(reviewLogs: ReviewLog[], windowDays = 30): { rate: number; timely: number; total: number } {
  const cutoff = Date.now() - windowDays * 86400000
  const logs = reviewLogs.filter((l) => typeof l.dueAt === 'number' && l.reviewedAt >= cutoff)
  if (logs.length === 0) return { rate: 0, timely: 0, total: 0 }
  const timely = logs.filter((l) => (l.reviewedAt - (l.dueAt ?? 0)) <= 86400000).length
  return { rate: Math.round((timely / logs.length) * 100), timely, total: logs.length }
}

export interface CategoryMastery {
  id: string
  name: string
  color: string
  total: number
  mastered: number
  due: number
  progress: number // 掌握百分比 0-100
}

export function categoryMastery(questions: Question[]): CategoryMastery[] {
  const map = new Map<string, CategoryMastery>()
  for (const q of questions) {
    let m = map.get(q.category)
    if (!m) {
      const def = categoryDef(q.category)
      m = { id: q.category, name: def.name, color: def.color, total: 0, mastered: 0, due: 0, progress: 0 }
      map.set(q.category, m)
    }
    m.total++
    if (q.review.status === 'mastered') m.mastered++
    if (isDue(q)) m.due++
  }
  const out = Array.from(map.values())
  for (const m of out) m.progress = m.total ? Math.round((m.mastered / m.total) * 100) : 0
  return out.sort((a, b) => b.total - a.total)
}

export function masteredCount(questions: Question[]): number {
  return questions.filter((q) => q.review.status === 'mastered').length
}

export function dueToday(questions: Question[]): number {
  return questions.filter((q) => isDue(q)).length
}

export function reviewTodayCount(questions: Question[]): number {
  const today = dayjs().format('YYYY-MM-DD')
  return questions.filter((q) => {
    if (!q.review.lastReviewedAt) return false
    return dayjs(q.review.lastReviewedAt).format('YYYY-MM-DD') === today
  }).length
}

// 过去 N 周（含本周）的周一到周日，用于热力图
export function heatmapWeeks(activity: DailyActivity, weeks = 20): { week: string; days: { date: string; count: number }[] }[] {
  const end = dayjs().endOf('week') // 周日
  const start = end.subtract(weeks * 7 - 1, 'day').startOf('week')
  const out: { week: string; days: { date: string; count: number }[] }[] = []
  let cursor = start
  while (cursor.isBefore(end.add(1, 'day'))) {
    const days: { date: string; count: number }[] = []
    for (let i = 0; i < 7; i++) {
      const d = cursor.add(i, 'day')
      const key = d.format('YYYY-MM-DD')
      days.push({ date: key, count: activity[key] ?? 0 })
    }
    out.push({ week: cursor.format('YYYY-MM-DD'), days })
    cursor = cursor.add(7, 'day')
  }
  return out
}
