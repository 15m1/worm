import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { CATEGORIES, categoryDef, type Question } from '../types'
import { isDue } from '../lib/sm2'
import QuestionForm from '../components/QuestionForm'
import Markdown from '../components/Markdown'
import { StatusBadge, DiffBadge } from '../components/badges'
import {
  IconPlus,
  IconSearch,
  IconStar,
  IconEdit,
  IconTrash,
  IconClose,
  IconDownload,
} from '../components/icons'
import { useToast } from '../components/Toast'
import dayjs from 'dayjs'

type StatusFilter = 'all' | 'due' | 'favorite' | 'wrong' | ReviewFilter
type ReviewFilter = Question['review']['status']

export default function Questions() {
  const questions = useStore((s) => s.questions)
  const deleteQuestion = useStore((s) => s.deleteQuestion)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const importPreset = useStore((s) => s.importPreset)
  const presetLoaded = useStore((s) => s.settings.presetLoaded)
  const toast = useToast().toast

  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<'due' | 'new' | 'cat'>('due')
  const [editing, setEditing] = useState<Question | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState<Question | null>(null)

  const filtered = useMemo(() => {
    let list = questions
    if (cat !== 'all') list = list.filter((q) => q.category === cat)
    if (status === 'due') list = list.filter((q) => isDue(q))
    else if (status === 'favorite') list = list.filter((q) => q.isFavorite)
    else if (status === 'wrong') list = list.filter((q) => q.wrong)
    else if (status !== 'all') list = list.filter((q) => q.review.status === status)
    if (search.trim()) {
      const kw = search.trim().toLowerCase()
      list = list.filter(
        (q) =>
          q.title.toLowerCase().includes(kw) ||
          q.answer.toLowerCase().includes(kw) ||
          q.tags.some((t) => t.toLowerCase().includes(kw)),
      )
    }
    const arr = [...list]
    if (sortBy === 'due') {
      arr.sort((a, b) => {
        const ad = isDue(a) ? 0 : 1
        const bd = isDue(b) ? 0 : 1
        if (ad !== bd) return ad - bd
        return a.review.dueAt - b.review.dueAt
      })
    } else if (sortBy === 'new') {
      arr.sort((a, b) => b.createdAt - a.createdAt)
    } else {
      arr.sort((a, b) => a.category.localeCompare(b.category))
    }
    return arr
  }, [questions, cat, status, search, sortBy])

  const doDelete = (q: Question) => {
    if (confirm(`确定删除「${q.title}」？此操作不可恢复。`)) {
      deleteQuestion(q.id)
      toast('已删除')
      if (detail?.id === q.id) setDetail(null)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">题库</div>
          <div className="page-desc">共 {questions.length} 题，管理你的 Java 后端面试知识库</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const n = importPreset()
              toast(n > 0 ? `已新增 ${n} 道预设题` : '题库已是最新，无新增')
            }}
          >
            <IconDownload size={16} /> {presetLoaded ? '更新预设题库' : '导入预设题库'}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            <IconPlus size={16} /> 新增题目
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <IconSearch />
          <input
            className="input"
            placeholder="搜索题目 / 答案 / 标签……"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 130 }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="due">按复习优先</option>
          <option value="new">按最新</option>
          <option value="cat">按分类</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button className={`chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
          全部
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`chip ${cat === c.id ? 'active' : ''}`}
            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
          >
            <span className="dot" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(
          [
            ['all', '全部状态'],
            ['due', '待复习'],
            ['wrong', `❌ 错题本（${questions.filter((q) => q.wrong).length}）`],
            ['new', '待学习'],
            ['learning', '学习中'],
            ['reviewing', '复习中'],
            ['mastered', '已掌握'],
            ['favorite', '⭐ 收藏'],
          ] as [StatusFilter, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            className={`chip ${status === v ? 'active' : ''}`}
            onClick={() => setStatus(status === v ? 'all' : v)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📚</div>
          <div className="empty-title">{questions.length === 0 ? '题库还是空的' : '没有匹配的题目'}</div>
          <div>
            {questions.length === 0
              ? '点击右上角「导入预设题库」或「新增题目」开始积累'
              : '换个关键词或筛选条件试试'}
          </div>
        </div>
      ) : (
        <div className="q-list">
          {filtered.map((q) => (
            <div className="card card-hover q-item" key={q.id} onClick={() => setDetail(q)}>
              <span
                style={{
                  width: 4,
                  alignSelf: 'stretch',
                  borderRadius: 4,
                  background: categoryDef(q.category).color,
                  flexShrink: 0,
                }}
              />
              <div className="q-main">
                <div className="q-title">{q.title}</div>
                <div className="q-meta">
                  <span className="tag" style={{ background: `${categoryDef(q.category).color}22` }}>
                    {categoryDef(q.category).name}
                  </span>
                  <DiffBadge d={q.difficulty} />
                  <StatusBadge q={q} />
                  {q.wrong && <span className="badge badge-due">错题</span>}
                  {q.review.lastReviewedAt && (
                    <span className="q-meta-text">
                      上次 {dayjs(q.review.lastReviewedAt).format('M/D')}
                    </span>
                  )}
                </div>
              </div>
              <div className="q-actions">
                <button
                  className={`btn-icon ${q.isFavorite ? 'q-fav' : ''}`}
                  title={q.isFavorite ? '取消收藏' : '收藏'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(q.id)
                  }}
                >
                  <IconStar size={17} />
                </button>
                <button
                  className="btn-icon"
                  title="编辑"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(q)
                    setShowForm(true)
                  }}
                >
                  <IconEdit size={17} />
                </button>
                <button
                  className="btn-icon"
                  title="删除"
                  onClick={(e) => {
                    e.stopPropagation()
                    doDelete(q)
                  }}
                >
                  <IconTrash size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <QuestionForm
          initial={editing}
          defaultCategory={cat !== 'all' ? cat : undefined}
          onClose={() => setShowForm(false)}
        />
      )}

      {detail && (
        <div
          className="modal-mask"
          onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}
        >
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-head">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  className="tag"
                  style={{ background: `${categoryDef(detail.category).color}22` }}
                >
                  {categoryDef(detail.category).name}
                </span>
                <DiffBadge d={detail.difficulty} />
                <StatusBadge q={detail} />
                {detail.wrong && <span className="badge badge-due">错题</span>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className={`btn-icon ${detail.isFavorite ? 'q-fav' : ''}`}
                  onClick={() => toggleFavorite(detail.id)}
                >
                  <IconStar size={17} />
                </button>
                <button className="btn-icon" onClick={() => setDetail(null)}>
                  <IconClose />
                </button>
              </div>
            </div>
            <div className="modal-body">
              <h3 style={{ fontSize: 17 }}>{detail.title}</h3>
              <Markdown content={detail.answer} />
              <div className="q-meta" style={{ marginTop: 8 }}>
                {detail.tags.map((t) => (
                  <span className="tag" key={t}>
                    #{t}
                  </span>
                ))}
                {detail.source && <span className="q-meta-text">来源：{detail.source}</span>}
                <span className="q-meta-text">创建于 {dayjs(detail.createdAt).format('YYYY-MM-DD')}</span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-danger" onClick={() => doDelete(detail)}>
                <IconTrash size={15} /> 删除
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(detail)
                  setShowForm(true)
                }}
              >
                <IconEdit size={15} /> 编辑
              </button>
              <button className="btn btn-primary" onClick={() => setDetail(null)}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
