import { create } from 'zustand'
import type {
  PersistedState,
  Question,
  Rating,
  ReviewLog,
  Settings,
} from '../types'
import { newReviewState, uid } from '../types'
import { loadState, saveState, clearState } from '../db'
import { applyRating } from '../lib/sm2'
import { buildPresetQuestions } from '../lib/preset'

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  dailyGoal: 5,
  api: {
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-chat',
  },
  presetLoaded: false,
  initialized: false,
}

export interface QuestionDraft {
  title: string
  answer: string
  category: string
  difficulty: Question['difficulty']
  tags: string[]
  source?: string
}

interface StoreState extends PersistedState {
  hydrated: boolean
  reviewScope: 'all' | 'wrong' | 'important' // 复习页初始范围（看板「复习错题/重点题」跳转用）
  // actions
  hydrate: () => Promise<void>
  setReviewScope: (s: 'all' | 'wrong' | 'important') => void
  addQuestion: (draft: QuestionDraft) => string
  addQuestions: (questions: Question[]) => void
  updateQuestion: (id: string, patch: Partial<Question>) => void
  deleteQuestion: (id: string) => void
  toggleFavorite: (id: string) => void
  toggleImportant: (id: string) => void
  reviewQuestion: (id: string, rating: Rating) => void
  quizAnswer: (id: string, correct: boolean) => void
  batchDelete: (ids: string[]) => void
  batchSet: (ids: string[], patch: Partial<Pick<Question, 'isFavorite' | 'wrong' | 'important'>>) => void
  importPreset: () => number
  updateSettings: (patch: Partial<Settings>) => void
  exportData: () => string
  importData: (json: string) => boolean
  resetAll: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useStore = create<StoreState>((set, get) => {
  const persist = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const { questions, reviewLogs, settings } = get()
      saveState({ questions, reviewLogs, settings })
    }, 150)
  }

  return {
    questions: [],
    reviewLogs: [],
    settings: DEFAULT_SETTINGS,
    hydrated: false,
    reviewScope: 'all',

    setReviewScope: (s) => set({ reviewScope: s }),

    hydrate: async () => {
      const saved = await loadState()
      if (saved) {
        set({
          questions: (saved.questions ?? []).map((q) => ({
            ...q,
            wrong: q.wrong ?? false, // 兼容旧数据
            important: q.important ?? false, // 兼容旧数据
            review: { ...newReviewState(), ...(q.review ?? {}) },
          })),
          reviewLogs: saved.reviewLogs ?? [],
          settings: { ...DEFAULT_SETTINGS, ...saved.settings },
          hydrated: true,
        })
      } else {
        set({ hydrated: true })
      }
      applyTheme(get().settings.theme)
    },

    addQuestion: (draft) => {
      const now = Date.now()
      const q: Question = {
        id: uid(),
        ...draft,
        isPreset: false,
        isFavorite: false,
        wrong: false,
        important: false,
        createdAt: now,
        updatedAt: now,
        review: newReviewState(),
      }
      set((s) => ({ questions: [q, ...s.questions] }))
      persist()
      return q.id
    },

    addQuestions: (questions) => {
      set((s) => ({ questions: [...questions, ...s.questions] }))
      persist()
    },

    updateQuestion: (id, patch) => {
      set((s) => ({
        questions: s.questions.map((q) =>
          q.id === id ? { ...q, ...patch, updatedAt: Date.now() } : q,
        ),
      }))
      persist()
    },

    deleteQuestion: (id) => {
      set((s) => ({
        questions: s.questions.filter((q) => q.id !== id),
        reviewLogs: s.reviewLogs.filter((l) => l.questionId !== id),
      }))
      persist()
    },

    toggleFavorite: (id) => {
      set((s) => ({
        questions: s.questions.map((q) =>
          q.id === id ? { ...q, isFavorite: !q.isFavorite } : q,
        ),
      }))
      persist()
    },

    reviewQuestion: (id, rating) => {
      const q = get().questions.find((x) => x.id === id)
      if (!q) return
      const prevDueAt = q.review.dueAt // 记录到期时间，用于计算复习及时率
      const { state, interval } = applyRating(q, rating)
      const log: ReviewLog = {
        id: uid(),
        questionId: id,
        rating,
        reviewedAt: Date.now(),
        interval,
        dueAt: prevDueAt,
      }
      // 选「忘了/模糊」自动进错题本，答对（记住了/很熟）自动移出错题本
      const wrong = rating === 'again' || rating === 'hard'
      set((s) => ({
        questions: s.questions.map((x) =>
          x.id === id
            ? { ...x, review: state, wrong, updatedAt: Date.now() }
            : x,
        ),
        reviewLogs: [log, ...s.reviewLogs],
      }))
      persist()
    },

    quizAnswer: (id, correct) => {
      // 测验/自测模式：只更新错题标记，不干扰 SM-2 复习曲线
      set((s) => ({
        questions: s.questions.map((x) =>
          x.id === id ? { ...x, wrong: !correct, updatedAt: Date.now() } : x,
        ),
      }))
      persist()
    },

    toggleImportant: (id) => {
      set((s) => ({
        questions: s.questions.map((q) =>
          q.id === id ? { ...q, important: !q.important, updatedAt: Date.now() } : q,
        ),
      }))
      persist()
    },

    batchDelete: (ids) => {
      const idSet = new Set(ids)
      set((s) => ({
        questions: s.questions.filter((q) => !idSet.has(q.id)),
        reviewLogs: s.reviewLogs.filter((l) => !idSet.has(l.questionId)),
      }))
      persist()
    },

    batchSet: (ids, patch) => {
      const idSet = new Set(ids)
      set((s) => ({
        questions: s.questions.map((q) =>
          idSet.has(q.id) ? { ...q, ...patch, updatedAt: Date.now() } : q,
        ),
      }))
      persist()
    },

    importPreset: () => {
      // 按标题去重：只新增预设题库里当前没有的题目，支持重复导入以更新/补全
      const existing = new Set(get().questions.map((q) => q.title))
      const presets = buildPresetQuestions().filter((p) => !existing.has(p.title))
      if (presets.length > 0) {
        set((s) => ({
          questions: [...presets, ...s.questions],
          settings: { ...s.settings, presetLoaded: true },
        }))
        persist()
      }
      return presets.length
    },

    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }))
      if (patch.theme) applyTheme(patch.theme)
      persist()
    },

    exportData: () => {
      const { questions, reviewLogs, settings } = get()
      // 安全：备份文件不包含 API Key，避免分享时泄露
      const safeSettings = {
        ...settings,
        api: { ...settings.api, apiKey: '' },
      }
      return JSON.stringify({ questions, reviewLogs, settings: safeSettings, exportedAt: Date.now() }, null, 2)
    },

    importData: (json) => {
      try {
        const data = JSON.parse(json)
        if (!Array.isArray(data.questions)) return false
        // 去重 id，避免重复 key 导致渲染异常
        const seen = new Set<string>()
        const questions = data.questions
          .filter((q: Question) => {
            if (seen.has(q.id)) return false
            seen.add(q.id)
            return true
          })
          .map((q: Question) => ({
            ...q,
            wrong: q.wrong ?? false,
            important: q.important ?? false,
            review: { ...newReviewState(), ...(q.review ?? {}) },
          }))
        const importedSettings = (data.settings ?? {}) as Partial<Settings>
        set({
          questions,
          reviewLogs: Array.isArray(data.reviewLogs) ? data.reviewLogs : [],
          settings: {
            ...DEFAULT_SETTINGS,
            ...importedSettings,
            api: {
              ...DEFAULT_SETTINGS.api,
              ...(importedSettings.api ?? {}),
              apiKey: get().settings.api.apiKey, // 保留当前 Key，不从备份恢复
            },
            initialized: true, // 导入视为已初始化，避免自动重新导入预设
          },
        })
        applyTheme(importedSettings.theme ?? get().settings.theme)
        persist()
        return true
      } catch {
        return false
      }
    },

    resetAll: async () => {
      await clearState()
      set({
        questions: [],
        reviewLogs: [],
        // initialized 保持 true：清空后不自动重导预设，需要时手动「导入预设题库」
        settings: { ...DEFAULT_SETTINGS, presetLoaded: false, initialized: true },
      })
      applyTheme(DEFAULT_SETTINGS.theme)
    },
  }
})

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
}
