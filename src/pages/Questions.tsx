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
  IconFlag,
  IconCheck,
} from '../components/icons'
import { useToast } from '../components/Toast'
import dayjs from 'dayjs'

type StatusFilter = 'all' | 'due' | 'favorite' | 'wrong' | 'important' | ReviewFilter
type ReviewFilter = Question['review']['status']

export default function Questions() {
  const questions = useStore((s) => s.questions)
  const deleteQuestion = useStore((s) => s.deleteQuestion)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const toggleImportant = useStore((s) => s.toggleImportant)
  const batchDelete = useStore((s) => s.batchDelete)
  const batchSet = useStore((s) => s.batchSet)
  const importPreset = useStore((s) => s.importPreset)
  const presetLoaded = useStore((s) => s.settings.presetLoaded)
  const toast = useToast().toast

  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [tag, setTag] = useState('')
  const [source, setSource] = useState('')
  const [sortBy, setSortBy] = useState<'due' | 'new' | 'cat'>('due')
  const [editing, setEditing] = useState<Question | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState<Question | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allTags = useMemo(() => {
    const map = new Map<string, number>()
    for (const q of questions) for (const t of q.tags) map.set(t, (map.get(t) ?? 0) + 1)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [questions])

  const allSources = useMemo(() => {
    const set = new Set(questions.map((q) => q.source).filter(Boolean))
    return Array.from(set) as string[]
  }, [questions])

  const filtered = useMemo(() => {
    let list = questions
    if (cat !== 'all') list = list.filter((q) => q.category === cat)
    if (status === 'due') list = list.filter((q) => isDue(q))
    else if (status === 'favorite') list = list.filter((q) => q.isFavorite)
    else if (status === 'wrong') list = list.filter((q) => q.wrong)
    else if (status === 'important') list = list.filter((q) => q.important)
    else if (status !== 'all') list = list.filter((q) => q.review.status === status)
    if (tag) list = list.filter((q) => q.tags.includes(tag))
    if (source) list = list.filter((q) => q.source === source)
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
  }, [questions, cat, status, tag, source, search, sortBy])

  const doDelete = (q: Question) => {
    if (confirm(`确定删除「${q.title}」？此操作不可恢复。`)) {
      deleteQuestion(q.id)
      toast('已删除')
      if (detail?.id === q.id) setDetail(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((q) => q.id)),
    )
  }

  const doBatch = (fn: () => void, msg: string) => {
    if (selected.size === 0) {
      toast('请先选择题目', 'err')
      return
    }
    fn()
    toast(msg)
    setSelected(new Set())
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">题库</div>
          <div className="page-desc">共 {questions.length} 题，管理你的 Java 后端面试知识库</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setSelectMode(!selectMode)
              setSelected(new Set())
            }}
          >
            {selectMode ? `完成（已选 ${selected.size}）` : '批量操作'}
          </button>
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
        {allSources.length > 0 && (
          <select
            className="select"
            style={{ width: 120 }}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">全部来源</option>
            {allSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
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
            ['important', `🚩 重点题（${questions.filter((q) => q.important).length}）`],
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

      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center' }}>标签：</span>
          <button className={`chip ${!tag ? 'active' : ''}`} onClick={() => setTag('')}>
            全部
          </button>
          {allTags.map(([t, n]) => (
            <button
              key={t}
              className={`chip ${tag === t ? 'active' : ''}`}
              onClick={() => setTag(tag === t ? '' : t)}
            >
              #{t}（{n}）
            </button>
          ))}
        </div>
      )}

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
            <div
              className={`card card-hover q-item${selectMode && selected.has(q.id) ? ' q-item-selected' : ''}`}
              key={q.id}
              onClick={() => (selectMode ? toggleSelect(q.id) : setDetail(q))}
            >
              {selectMode && (
                <span
                  className={`q-check${selected.has(q.id) ? ' on' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSelect(q.id)
                  }}
                >
                  {selected.has(q.id) && <IconCheck size={14} />}
                </span>
              )}
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
                <div className="q-title">
                  {q.important && <span className="q-important">🚩</span>} {q.title}
                </div>
                <div className="q-meta">
                  <span className="tag" style={{ background: `${categoryDef(q.category).color}22` }}>
                    {categoryDef(q.category).name}
                  </span>
                  <DiffBadge d={q.difficulty} />
                  <StatusBadge q={q} />
                  {q.wrong && <span className="badge badge-due">错题</span>}
                  {q.important && <span className="badge badge-important">重点</span>}
                  {q.review.lastReviewedAt && (
                    <span className="q-meta-text">
                      上次 {dayjs(q.review.lastReviewedAt).format('M/D')}
                    </span>
                  )}
                </div>
              </div>
              {!selectMode && (
                <div className="q-actions">
                  <button
                    className={`btn-icon ${q.important ? 'q-important-active' : ''}`}
                    title={q.important ? '取消重点' : '标记重点'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleImportant(q.id)
                    }}
                  >
                    <IconFlag size={17} />
                  </button>
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
              )}
            </div>
          ))}
        </div>
      )}

      {/* 批量操作栏 */}
      {selectMode && (
        <div className="batch-bar">
          <button className="btn btn-ghost btn-sm" onClick={toggleSelectAll}>
            {selected.size === filtered.length ? '取消全选' : '全选'}
          </button>
          <span className="q-meta-text">{selected.size} 项</span>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => doBatch(() => batchSet(Array.from(selected), { isFavorite: true }), `已收藏 ${selected.size} 题`)}
          >
            收藏
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => doBatch(() => batchSet(Array.from(selected), { important: true }), `已标记 ${selected.size} 题为重点`)}
          >
            🚩 标记重点
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => doBatch(() => batchSet(Array.from(selected), { wrong: true }), `已加入错题本 ${selected.size} 题`)}
          >
            加入错题本
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() =>
              doBatch(() => {
                if (confirm(`确定删除选中的 ${selected.size} 道题？此操作不可恢复。`)) batchDelete(Array.from(selected))
              }, `已删除 ${selected.size} 题`)
            }
          >
            <IconTrash size={15} /> 删除
          </button>
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
                {detail.important && <span className="badge badge-important">重点</span>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className={`btn-icon ${detail.important ? 'q-important-active' : ''}`}
                  title={detail.important ? '取消重点' : '标记重点'}
                  onClick={() => toggleImportant(detail.id)}
                >
                  <IconFlag size={17} />
                </button>
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
