// 数据模型定义

export type Difficulty = '简单' | '中等' | '困难'

export interface CategoryDef {
  id: string
  name: string
  color: string
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'java', name: 'Java 基础', color: '#f97316' },
  { id: 'concurrent', name: '并发编程', color: '#f43f5e' },
  { id: 'jvm', name: 'JVM', color: '#8b5cf6' },
  { id: 'mysql', name: 'MySQL', color: '#06b6d4' },
  { id: 'redis', name: 'Redis', color: '#ef4444' },
  { id: 'spring', name: 'Spring', color: '#22c55e' },
  { id: 'spring-mvc', name: 'Spring MVC', color: '#84cc16' },
  { id: 'spring-cloud', name: 'Spring Cloud', color: '#10b981' },
  { id: 'distributed', name: '分布式', color: '#6366f1' },
  { id: 'mq', name: '消息队列', color: '#eab308' },
  { id: 'rabbitmq', name: 'RabbitMQ', color: '#f59e0b' },
  { id: 'network', name: '计算机网络', color: '#0ea5e9' },
  { id: 'os', name: '操作系统', color: '#a855f7' },
  { id: 'algorithm', name: '算法', color: '#14b8a6' },
  { id: 'design', name: '设计模式', color: '#ca8a04' },
]

export function categoryDef(id: string): CategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? { id, name: id, color: '#94a3b8' }
}

export type ReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered'

export interface ReviewState {
  status: ReviewStatus
  repetitions: number // 连续答对次数
  interval: number // 当前间隔（天）
  ease: number // 难度系数
  dueAt: number // 下次复习时间戳
  lastReviewedAt: number | null
}

export interface Question {
  id: string
  title: string
  answer: string
  category: string
  difficulty: Difficulty
  tags: string[]
  source?: string
  isPreset: boolean
  isFavorite: boolean
  wrong: boolean // 是否在错题本中（复习选「忘了/模糊」自动加入，答对自动移出）
  important: boolean // 是否重点题（面试冲刺模式标记）
  createdAt: number
  updatedAt: number
  review: ReviewState
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewLog {
  id: string
  questionId: string
  rating: Rating
  reviewedAt: number
  interval: number
  dueAt?: number // 该次复习前原到期时间（用于计算复习及时率）
}

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  dailyGoal: number
  api: ApiConfig
  presetLoaded: boolean
  initialized: boolean // 是否完成过首次初始化（防止清空/导入后误触发自动导入）
}

export interface PersistedState {
  questions: Question[]
  reviewLogs: ReviewLog[]
  settings: Settings
}

export function newReviewState(): ReviewState {
  return {
    status: 'new',
    repetitions: 0,
    interval: 0,
    ease: 2.5,
    dueAt: Date.now(),
    lastReviewedAt: null,
  }
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}
