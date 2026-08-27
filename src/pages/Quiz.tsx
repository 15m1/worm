import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { CATEGORIES, categoryDef, type Question } from '../types'
import Markdown from '../components/Markdown'
import { DiffBadge } from '../components/badges'
import { IconTarget, IconCheck, IconClose } from '../components/icons'

type QuizScope = 'all' | 'important' | 'wrong'
type QuizTime = 0 | 30 | 60

const COUNTS = [5, 10, 20]

interface QuizResult {
  total: number
  correct: number
  wrongIds: string[]
  usedSeconds: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Quiz() {
  const questions = useStore((s) => s.questions)
  const quizAnswer = useStore((s) => s.quizAnswer)

  // 配置
  const [scope, setScope] = useState<QuizScope>('all')
  const [cat, setCat] = useState('all')
  const [count, setCount] = useState(10)
  const [timeLimit, setTimeLimit] = useState<QuizTime>(0)

  // 会话
  const [session, setSession] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [timerLeft, setTimerLeft] = useState<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const correctRef = useRef(0)
  const wrongIdsRef = useRef<string[]>([])

  const pool = useMemo(() => {
    let list = questions
    if (scope === 'important') list = list.filter((q) => q.important)
    else if (scope === 'wrong') list = list.filter((q) => q.wrong)
    if (cat !== 'all') list = list.filter((q) => q.category === cat)
    return list
  }, [questions, scope, cat])

  const current = session?.[index]

  // 限时倒计时
  useEffect(() => {
    if (!session || timeLimit === 0 || revealed || !current) return
    setTimerLeft(timeLimit)
    const iv = setInterval(() => {
      setTimerLeft((t) => {
        if (t === null) return t
        if (t <= 1) {
          clearInterval(iv)
          // 超时按答错处理
          answer(false, true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, index, revealed, timeLimit])

  const start = () => {
    if (pool.length === 0) return
    const n = Math.min(count, pool.length)
    const list = shuffle(pool).slice(0, n)
    setSession(list)
    setIndex(0)
    setRevealed(false)
    setResult(null)
    correctRef.current = 0
    wrongIdsRef.current = []
    startTimeRef.current = Date.now()
  }

  const answer = (correct: boolean, timeout = false) => {
    if (!session) return
    if (!timeout) quizAnswer(session[index].id, correct)
    else {
      // 超时：计入答错并进错题本
      quizAnswer(session[index].id, false)
    }
    if (correct) correctRef.current += 1
    else wrongIdsRef.current.push(session[index].id)

    if (index + 1 >= session.length) {
      setResult({
        total: session.length,
        correct: correctRef.current,
        wrongIds: wrongIdsRef.current,
        usedSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      })
      setSession(null)
      return
    }
    setIndex((i) => i + 1)
    setRevealed(false)
  }

  // 答题进行中
  if (session && current) {
    const wrong = result ? 0 : wrongIdsRef.current.length
    return (
      <div className="page">
        <div className="review-shell">
          <div className="review-progress">
            <span>
              {index + 1} / {session.length}
            </span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${((index + (revealed ? 0.6 : 0)) / session.length) * 100}%` }} />
            </div>
            {timeLimit > 0 && (
              <span style={{ color: timerLeft !== null && timerLeft <= 5 ? 'var(--danger)' : 'var(--text-dim)', fontWeight: 700 }}>
                {timerLeft}s
              </span>
            )}
            <button className="btn-icon" title="退出测验" onClick={() => setSession(null)}>
              <IconClose />
            </button>
          </div>

          <div className="card review-card">
            <div className="review-label">
              {categoryDef(current.category).name} · {current.difficulty}
              {wrong > 0 && ` · 已错 ${wrong}`}
            </div>
            <div className="review-question">{current.title}</div>

            {revealed ? (
              <>
                <div className="review-answer">
                  <Markdown content={current.answer} />
                </div>
                <div className="review-rate" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <button
                    className="rate-btn"
                    data-rate="again"
                    onClick={() => answer(false)}
                    style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'transparent' }}
                  >
                    答错了 <IconClose size={14} />
                  </button>
                  <button
                    className="rate-btn"
                    data-rate="easy"
                    onClick={() => answer(true)}
                    style={{ background: 'var(--ok-soft)', color: 'var(--ok)', borderColor: 'transparent' }}
                  >
                    答对了 <IconCheck size={14} />
                  </button>
                </div>
              </>
            ) : (
              <button className="btn btn-primary reveal-btn" onClick={() => setRevealed(true)}>
                显示答案（自评）
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 结果页
  if (result) {
    const score = result.total ? Math.round((result.correct / result.total) * 100) : 0
    const wrongQs = questions.filter((q) => result.wrongIds.includes(q.id))
    return (
      <div className="page">
        <div className="review-shell">
          <div className="card review-done">
            <div className="big">{score >= 80 ? '🏆' : score >= 60 ? '💪' : '📖'}</div>
            <h2>自测完成</h2>
            <p>
              答对 {result.correct} / {result.total} · 正确率 {score}% · 用时{' '}
              {Math.floor(result.usedSeconds / 60)} 分 {result.usedSeconds % 60} 秒
            </p>
            <div className="review-rate" style={{ width: '100%', maxWidth: 420 }}>
              <button className="btn btn-ghost" onClick={start}>
                再测一次
              </button>
              <button className="btn btn-primary" onClick={() => setResult(null)}>
                换个设置
              </button>
            </div>
            {wrongQs.length > 0 && (
              <div className="due-list" style={{ width: '100%', textAlign: 'left', marginTop: 8 }}>
                <div className="panel-title" style={{ marginBottom: 8 }}>错题回顾（已自动进错题本）</div>
                {wrongQs.map((q) => (
                  <div className="card due-item" key={q.id}>
                    <span className="due-cat" style={{ background: categoryDef(q.category).color }} />
                    <div className="due-main">
                      <div className="due-title">{q.title}</div>
                      <div className="q-meta-text">
                        {categoryDef(q.category).name} · <DiffBadge d={q.difficulty} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 配置页
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">自测</div>
          <div className="page-desc">随机抽题自测，不干扰记忆曲线；答错的题自动进错题本</div>
        </div>
      </div>

      <div className="card ai-form" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="field">
          <label>题目范围</label>
          <div className="seg">
            <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
              全部（{questions.length}）
            </button>
            <button className={scope === 'important' ? 'active' : ''} onClick={() => setScope('important')}>
              🚩 重点题（{questions.filter((q) => q.important).length}）
            </button>
            <button className={scope === 'wrong' ? 'active' : ''} onClick={() => setScope('wrong')}>
              ❌ 错题本（{questions.filter((q) => q.wrong).length}）
            </button>
          </div>
        </div>

        <div className="field">
          <label>分类（可选）</label>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">全部分类</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>题量</label>
          <div className="seg">
            {COUNTS.map((n) => (
              <button key={n} className={count === n ? 'active' : ''} onClick={() => setCount(n)}>
                {n} 题
              </button>
            ))}
            <button className={count === 50 ? 'active' : ''} onClick={() => setCount(50)}>
              全部
            </button>
          </div>
        </div>

        <div className="field">
          <label>每题限时</label>
          <div className="seg">
            <button className={timeLimit === 0 ? 'active' : ''} onClick={() => setTimeLimit(0)}>
              不限时
            </button>
            <button className={timeLimit === 30 ? 'active' : ''} onClick={() => setTimeLimit(30)}>
              30 秒
            </button>
            <button className={timeLimit === 60 ? 'active' : ''} onClick={() => setTimeLimit(60)}>
              60 秒
            </button>
          </div>
        </div>

        {pool.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: '8px 0' }}>
            当前范围没有可测的题目，换个范围或先去题库加题
          </div>
        ) : (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={start}>
            <IconTarget size={16} /> 开始自测 {Math.min(count, pool.length)} 题
          </button>
        )}
        <div style={{ fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'center' }}>
          自测结果只更新错题标记，不影响 SM-2 复习排期
        </div>
      </div>
    </div>
  )
}
