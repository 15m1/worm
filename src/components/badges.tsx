import type { Question, ReviewStatus } from '../types'
import { isDue } from '../lib/sm2'

const STATUS_TEXT: Record<ReviewStatus, string> = {
  new: '待学习',
  learning: '学习中',
  reviewing: '复习中',
  mastered: '已掌握',
}

export function StatusBadge({ q }: { q: Question }) {
  const due = isDue(q) && q.review.status !== 'mastered' && q.review.lastReviewedAt !== null
  if (due) return <span className="badge badge-due">待复习</span>
  return <span className={`badge badge-${q.review.status}`}>{STATUS_TEXT[q.review.status]}</span>
}

export function DiffBadge({ d }: { d: Question['difficulty'] }) {
  return <span className={`diff diff-${d}`}>{d}</span>
}
