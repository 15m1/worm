import dayjs from 'dayjs'
import type { DailyActivity } from '../lib/stats'
import { heatmapWeeks } from '../lib/stats'

const WEEK_LABELS = ['', '一', '', '三', '', '五', '']

export default function Heatmap({ activity }: { activity: DailyActivity }) {
  const weeks = heatmapWeeks(activity, 20)
  const today = dayjs().format('YYYY-MM-DD')

  return (
    <div>
      <div className="heatmap">
        <div className="heat-col" style={{ justifyContent: 'space-between' }}>
          {WEEK_LABELS.map((w, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: 'var(--text-faint)',
                height: 13,
                lineHeight: '13px',
              }}
            >
              {w}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div className="heat-col" key={week.week}>
            {week.days.map((d) => {
              let level = 0
              if (d.count > 0) level = d.count >= 6 ? 4 : d.count >= 4 ? 3 : d.count >= 2 ? 2 : 1
              return (
                <div
                  key={d.date}
                  className="heat-cell"
                  data-level={level}
                  data-today={d.date === today ? '1' : undefined}
                  style={
                    d.date === today
                      ? { outline: '2px solid var(--accent)', outlineOffset: 1 }
                      : undefined
                  }
                  title={`${d.date}：${d.count} 次`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="heat-legend">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="heat-cell" data-level={i} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
