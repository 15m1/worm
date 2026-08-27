import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { isDue } from '../lib/sm2'
import { CATEGORIES, categoryDef, type Question, type Rating } from '../types'
import Markdown from '../components/Markdown'
import { IconReview, IconClose } from '../components/icons'
import dayjs from 'dayjs'

export default function Review({ go }: { go: (page: string) => void }) {
  const questions = useStore((s) => s.questions)
  const reviewQuestion = useStore((s) => s.reviewQuestion)
  const reviewScope = useStore((s) => s.reviewScope)
  const setReviewScope = useStore((s) => s.setReviewScope)

  const [scope, setScope] = useState<'all' | 'wrong' | 'important'>(reviewScope)
  const [cat, setCat] = useState('all')
  const [queue, setQueue] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [summary, setSummary] = useState<Record<Rating, number> | null>(null)

  // 看板「复习错题/重点题」跳转时带入对应范围，进入后复位
  useEffect(() => {
    if (reviewScope !== 'all') setScope(reviewScope)
    setReviewScope('all')
  }, [reviewScope, setReviewScope])

  const due = useMemo(
    () =>
      questions
        .filter((q) => isDue(q))
        .sort((a, b) => a.review.dueAt - b.review.dueAt),
    [questions],
  )
  const wrongList = useMemo(
    () =>
      questions
        .filter((q) => q.wrong)
        .sort((a, b) => (a.review.lastReviewedAt ?? 0) - (b.review.lastReviewedAt ?? 0)),
    [questions],
  )
  const importantList = useMemo(
    () =>
      questions
        .filter((q) => q.important)
        .sort((a, b) => a.review.dueAt - b.review.dueAt),
    [questions],
  )
  const base = scope === 'wrong' ? wrongList : scope === 'important' ? importantList : due
  const reviewTarget = useMemo(
    () => (cat === 'all' ? base : base.filter((q) => q.category === cat)),
    [base, cat],
  )

  const start = (list: Question[]) => {
    if (list.length === 0) return
    setQueue(list)
    setIndex(0)
    setRevealed(false)
    setSummary(null)
  }

  const rate = (r: Rating) => {
    if (!queue) return
    reviewQuestion(queue[index].id, r)
    setSummary((prev) => ({ ...(prev ?? { again: 0, hard: 0, good: 0, easy: 0 }), [r]: (prev?.[r] ?? 0) + 1 }))
    if (index + 1 >= queue.length) {
      setQueue(null)
      return
    }
    setIndex((i) => i + 1)
    setRevealed(false)
  }

  const current = queue?.[index]

  // 复习进行中
  if (queue && current) {
    return (
      <div className="page">
        <div className="review-shell">
          <div className="review-progress">
            <span>
              {index + 1} / {queue.length}
            </span>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${((index + (revealed ? 0.6 : 0)) / queue.length) * 100}%` }}
              />
            </div>
            <button
              className="btn-icon"
              title="退出复习"
              onClick={() => setQueue(null)}
            >
              <IconClose />
            </button>
          </div>

          <div className="card review-card">
            <div className="review-label">
              {categoryDef(current.category).name} · {current.difficulty} · 间隔{' '}
              {current.review.interval > 0 ? `${current.review.interval} 天` : '今天'}
            </div>
            <div className="review-question">{current.title}</div>

            {revealed ? (
              <>
                <div className="review-answer">
                  <Markdown content={current.answer} />
                </div>
                <div className="review-rate">
                  <button className="rate-btn" data-rate="again" onClick={() => rate('again')}>
                    忘了
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75, marginTop: 2 }}>
                      明天再看
                    </div>
                  </button>
                  <button className="rate-btn" data-rate="hard" onClick={() => rate('hard')}>
                    模糊
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75, marginTop: 2 }}>
                      1 天后再来
                    </div>
                  </button>
                  <button className="rate-btn" data-rate="good" onClick={() => rate('good')}>
                    记住了
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75, marginTop: 2 }}>
                      按曲线安排
                    </div>
                  </button>
                  <button className="rate-btn" data-rate="easy" onClick={() => rate('easy')}>
                    很熟
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75, marginTop: 2 }}>
                      拉长间隔
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <button className="btn btn-primary reveal-btn" onClick={() => setRevealed(true)}>
                显示答案
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 完成总结
  if (summary) {
    const total = Object.values(summary).reduce((s, n) => s + n, 0)
    return (
      <div className="page">
        <div className="card review-done">
          <div className="big">🎉</div>
          <h2>本轮复习完成</h2>
          <p>
            共 {total} 题 · 记得 {summary.good + summary.easy} · 模糊 {summary.hard} · 忘了{' '}
            {summary.again}
          </p>
          <div className="review-rate" style={{ width: '100%', maxWidth: 420 }}>
            <button className="btn btn-ghost" onClick={() => start(reviewTarget)}>
              继续复习队列
            </button>
            <button className="btn btn-primary" onClick={() => go('dashboard')}>
              回看板
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 队列选择页
  const newCount = questions.filter((q) => q.review.lastReviewedAt === null).length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">复习</div>
          <div className="page-desc">智能间隔重复 · 按记忆曲线安排下次复习</div>
        </div>
      </div>

      <div className="card panel" style={{ marginBottom: 16 }}>
        <div className="panel-title">
          复习范围
          <div className="seg">
            <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
              待复习（{due.length}）
            </button>
            <button className={scope === 'important' ? 'active' : ''} onClick={() => setScope('important')}>
              🚩 重点题（{importantList.length}）
            </button>
            <button className={scope === 'wrong' ? 'active' : ''} onClick={() => setScope('wrong')}>
              ❌ 错题本（{wrongList.length}）
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 12 }}>
          {scope === 'all' &&
            '按记忆曲线到期的题目，答错会自动进入错题本'}
          {scope === 'important' &&
            '已标记 🚩 重点的题目（含未到期），面试前集中复习'}
          {scope === 'wrong' &&
            '复习中选「忘了/模糊」自动收集的错题，答对后自动移出'}
        </div>
        <div className="panel-title" style={{ fontSize: 12.5 }}>按分类筛选</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
            全部（{base.length}）
          </button>
          {CATEGORIES.map((c) => {
            const n = base.filter((q) => q.category === c.id).length
            if (n === 0) return null
            return (
              <button
                key={c.id}
                className={`chip ${cat === c.id ? 'active' : ''}`}
                onClick={() => setCat(cat === c.id ? 'all' : c.id)}
              >
                <span className="dot" style={{ background: c.color }} />
                {c.name}（{n}）
              </button>
            )
          })}
        </div>
      </div>

      {reviewTarget.length > 0 ? (
        <div className="card panel">
          <div className="panel-title">
            {scope === 'wrong' ? '错题本' : scope === 'important' ? '重点题' : '待复习'}{' '}
            {reviewTarget.length} 题
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => start(reviewTarget)}>
            <IconReview size={18} /> 开始复习这 {reviewTarget.length} 题
          </button>
          <div className="due-list" style={{ marginTop: 14 }}>
            {reviewTarget.slice(0, 8).map((q) => (
              <div className="card due-item" key={q.id}>
                <span
                  className="due-cat"
                  style={{ background: categoryDef(q.category).color }}
                />
                <div className="due-main">
                  <div className="due-title">{q.title}</div>
                  <div className="q-meta-text">
                    {categoryDef(q.category).name}
                    {scope === 'all' && q.wrong && ' · 错题'}
                    {scope === 'all' && (
                      <>
                        {' '}
                        · 逾期 {dayjs().diff(q.review.dueAt, 'day')} 天
                      </>
                    )}
                    {scope === 'wrong' && q.review.lastReviewedAt && (
                      <> · 最近答错 {dayjs(q.review.lastReviewedAt).format('M/D')}</>
                    )}
                    {scope === 'important' && q.important && ' · 🚩 重点'}
                  </div>
                </div>
              </div>
            ))}
            {reviewTarget.length > 8 && (
              <div className="q-meta-text" style={{ textAlign: 'center', padding: 6 }}>
                还有 {reviewTarget.length - 8} 题
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card empty">
          <div className="empty-icon">{scope === 'wrong' ? '🎉' : scope === 'important' ? '🚩' : '✅'}</div>
          <div className="empty-title">
            {scope === 'wrong' ? '错题本空了' : scope === 'important' ? '还没有重点题' : '今日复习全部完成！'}
          </div>
          {scope === 'wrong' ? (
            <div>没有错题，继续保持！答错的题会自动出现在这里</div>
          ) : scope === 'important' ? (
            <div>在题库里给高频题打上「🚩 重点」标记，面试前集中冲刺</div>
          ) : (
            <>
              <div>休息一下，或学点新题充实题库</div>
              {newCount > 0 && (
                <button className="btn btn-primary" onClick={() => start(questions.filter((q) => q.review.lastReviewedAt === null).slice(0, 5))}>
                  随机学 5 道新题
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
