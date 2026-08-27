interface DonutSegment {
  name: string
  value: number
  color: string
}

export default function Donut({ data }: { data: DonutSegment[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const size = 172
  const stroke = 24
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  let acc = 0
  const segments = data.map((d) => {
    const frac = total > 0 ? d.value / total : 0
    const dash = frac * circumference
    const offset = -acc * circumference
    acc += frac
    return { ...d, dash, offset }
  })

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--heat-0)"
          strokeWidth={stroke}
        />
        {total === 0 ? null : (
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {segments.map((s) => (
              <circle
                key={s.name}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(s.dash - 2, 0)} ${circumference}`}
                strokeDashoffset={s.offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.4s ease' }}
              />
            ))}
          </g>
        )}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          style={{ fontSize: 22, fontWeight: 800, fill: 'var(--text)' }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          style={{ fontSize: 11, fill: 'var(--text-faint)' }}
        >
          题目总数
        </text>
      </svg>
      {total > 0 && (
        <div className="donut-legend">
          {segments
            .filter((s) => s.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((s) => (
              <div className="legend-row" key={s.name}>
                <span className="legend-dot" style={{ background: s.color }} />
                <span className="legend-name">{s.name}</span>
                <span className="legend-val">
                  {s.value}
                  <span style={{ color: 'var(--text-faint)', fontWeight: 600, marginLeft: 4 }}>
                    {Math.round((s.value / total) * 100)}%
                  </span>
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
