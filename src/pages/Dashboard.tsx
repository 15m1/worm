import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import {
  buildStudyActivity,
  currentStreak,
  categoryDistribution,
  difficultyDistribution,
  dueToday,
  reviewTodayCount,
  masteredCount,
  timelyRate,
  categoryMastery,
} from '../lib/stats'
import { isDue } from '../lib/sm2'
import Heatmap from '../components/Heatmap'
import Donut from '../components/Donut'
import { StatusBadge, DiffBadge } from '../components/badges'
import { categoryDef } from '../types'
import dayjs from 'dayjs'

export default function Dashboard({ go }: { go: (page: string) => void }) {
  const questions = useStore((s) => s.questions)
  const reviewLogs = useStore((s) => s.reviewLogs)
  const settings = useStore((s) => s.settings)
  const setReviewScope = useStore((s) => s.setReviewScope)

  const activity = useMemo(() => buildStudyActivity(questions), [questions])
  const streak = useMemo(() => currentStreak(activity), [activity])
  const dist = useMemo(() => categoryDistribution(questions), [questions])
  const diffDist = useMemo(() => difficultyDistribution(questions), [questions])
  const due = useMemo(() => dueToday(questions), [questions])
  const reviewed = useMemo(() => reviewTodayCount(questions), [questions])
  const mastered = useMemo(() => masteredCount(questions), [questions])
  const wrongCount = useMemo(() => questions.filter((q) => q.wrong).length, [questions])
  const timely = useMemo(() => timelyRate(reviewLogs), [reviewLogs])
  const mastery = useMemo(() => categoryMastery(questions), [questions])
  const important = useMemo(() => {
    const list = questions.filter((q) => q.important)
    return {
      count: list.length,
      mastered: list.filter((q) => q.review.status === 'mastered').length,
      due: list.filter((q) => isDue(q)).length,
    }
  }, [questions])

  const dueList = useMemo(
    () =>
      questions
        .filter((q) => isDue(q))
        .sort((a, b) => a.review.dueAt - b.review.dueAt)
        .slice(0, 5),
    [questions],
  )
  const wrongList = useMemo(
    () =>
      questions
        .filter((q) => q.wrong)
        .sort((a, b) => (a.review.lastReviewedAt ?? 0) - (b.review.lastReviewedAt ?? 0))
        .slice(0, 5),
    [questions],
  )

  const goal = settings.dailyGoal || 5
  const goalProgress = Math.min(100, Math.round((reviewed / goal) * 100))
  const maxDiff = Math.max(1, ...Object.values(diffDist))

  const reviewWrong = () => {
    setReviewScope('wrong')
    go('review')
  }
  const reviewImportant = () => {
    setReviewScope('important')
    go('review')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">学习看板</div>
          <div className="page-desc">今天 {dayjs().format('M月D日 dddd')} · 目标 {goal} 题</div>
        </div>
        <button className="btn btn-primary" onClick={() => go('review')}>
          开始复习
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">题库总数</div>
          <div className="stat-value">{questions.length}</div>
          <div className="stat-sub">已掌握 {mastered} 题</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">待复习</div>
          <div className="stat-value danger">{due}</div>
          <div className="stat-sub">今日到期</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">今日已复习</div>
          <div className="stat-value ok">{reviewed}</div>
          <div className="stat-sub">
            目标进度 {goalProgress}%
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">连续学习</div>
          <div className="stat-value accent">{streak}</div>
          <div className="stat-sub">天（按复习记录）</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">错题本</div>
          <div className="stat-value danger">{wrongCount}</div>
          <div className="stat-sub">答错自动收集</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">复习及时率</div>
          <div className="stat-value">{timely.total > 0 ? `${timely.rate}%` : '—'}</div>
          <div className="stat-sub">近 30 天 · 到期 24h 内完成</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card panel wide">
          <div className="panel-title">🚩 面试冲刺</div>
          {important.count === 0 ? (
            <div className="empty">
              <div className="empty-title">还没有重点题</div>
              <div>在题库里给高频题打上「🚩 重点」标记，集中冲刺</div>
              <button className="btn btn-ghost btn-sm" onClick={() => go('questions')}>
                去标记重点题
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="review-progress">
                <span style={{ whiteSpace: 'nowrap' }}>
                  重点题掌握 {important.mastered}/{important.count}
                </span>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.round((important.mastered / important.count) * 100)}%` }}
                  />
                </div>
                <span style={{ whiteSpace: 'nowrap' }} className="q-meta-text">
                  {important.due} 题待复习
                </span>
              </div>
              <button className="btn btn-primary" onClick={reviewImportant}>
                复习重点题（{important.due} 题待复习）
              </button>
            </div>
          )}
        </div>

        <div className="card panel wide">
          <div className="panel-title">学习热力图（近 20 周）</div>
          <Heatmap activity={activity} />
        </div>

        <div className="card panel">
          <div className="panel-title">分类分布</div>
          <Donut data={dist} />
        </div>

        <div className="card panel">
          <div className="panel-title">分类掌握度</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            {mastery.map((m) => (
              <div key={m.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    marginBottom: 5,
                    gap: 8,
                  }}
                >
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="legend-dot" style={{ background: m.color, borderRadius: 3 }} />
                    {m.name}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {m.progress}%
                    <span style={{ color: 'var(--text-faint)', fontWeight: 500, marginLeft: 6 }}>
                      {m.mastered}/{m.total}
                      {m.due > 0 && <span style={{ color: 'var(--danger)' }}> · {m.due} 到期</span>}
                    </span>
                  </span>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${m.progress}%`, background: m.color, opacity: 0.85 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card panel">
          <div className="panel-title">难度分布</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
            {(['简单', '中等', '困难'] as const).map((d) => (
              <div key={d}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{d}</span>
                  <span style={{ fontWeight: 700 }}>{diffDist[d] ?? 0}</span>
                </div>
                <div className="progress-track" style={{ height: 10 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${((diffDist[d] ?? 0) / maxDiff) * 100}%`,
                      background:
                        d === '简单'
                          ? 'var(--ok)'
                          : d === '中等'
                            ? 'var(--warn)'
                            : 'var(--danger)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card panel wide">
          <div className="panel-title">
            今日复习队列
            <button className="btn btn-ghost btn-sm" onClick={() => go('review')}>
              全部去复习 →
            </button>
          </div>
          {dueList.length === 0 ? (
            <div className="empty">
              <div className="empty-title">今日复习已完成，好样的！</div>
              <div>可以学新题，或去设置导入预设题库</div>
            </div>
          ) : (
            <div className="due-list">
              {dueList.map((q) => (
                <div className="card card-hover due-item" key={q.id}>
                  <span
                    className="due-cat"
                    style={{ background: categoryDef(q.category).color }}
                  />
                  <div className="due-main">
                    <div className="due-title">{q.title}</div>
                    <div className="q-meta">
                      <span
                        className="tag"
                        style={{ background: `${categoryDef(q.category).color}22` }}
                      >
                        {categoryDef(q.category).name}
                      </span>
                      <DiffBadge d={q.difficulty} />
                      <StatusBadge q={q} />
                      <span className="q-meta-text">
                        逾期 {dayjs().diff(q.review.dueAt, 'day')} 天
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card panel wide">
          <div className="panel-title">
            ❌ 错题本
            <button className="btn btn-ghost btn-sm" onClick={reviewWrong}>
              复习错题 →
            </button>
          </div>
          {wrongList.length === 0 ? (
            <div className="empty">
              <div className="empty-title">错题本是空的</div>
              <div>复习时选「忘了 / 模糊」的题会自动收集到这里</div>
            </div>
          ) : (
            <div className="due-list">
              {wrongList.map((q) => (
                <div className="card card-hover due-item" key={q.id}>
                  <span
                    className="due-cat"
                    style={{ background: categoryDef(q.category).color }}
                  />
                  <div className="due-main">
                    <div className="due-title">{q.title}</div>
                    <div className="q-meta">
                      <span
                        className="tag"
                        style={{ background: `${categoryDef(q.category).color}22` }}
                      >
                        {categoryDef(q.category).name}
                      </span>
                      <DiffBadge d={q.difficulty} />
                      <span className="q-meta-text">答对后自动移出错题本</span>
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
