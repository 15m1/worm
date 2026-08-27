import { useEffect, useState, type ReactElement } from 'react'
import { useStore, applyTheme } from './store/useStore'
import { ToastProvider } from './components/Toast'
import Dashboard from './pages/Dashboard'
import Questions from './pages/Questions'
import Review from './pages/Review'
import AiGenerate from './pages/AiGenerate'
import Settings from './pages/Settings'
import {
  IconDashboard,
  IconLibrary,
  IconReview,
  IconSpark,
  IconSettings,
  IconSun,
  IconMoon,
} from './components/icons'
import { isDue } from './lib/sm2'

type Page = 'dashboard' | 'questions' | 'review' | 'ai' | 'settings'

const NAV: { id: Page; label: string; icon: (s: number) => ReactElement }[] = [
  { id: 'dashboard', label: '看板', icon: (s) => <IconDashboard size={s} /> },
  { id: 'questions', label: '题库', icon: (s) => <IconLibrary size={s} /> },
  { id: 'review', label: '复习', icon: (s) => <IconReview size={s} /> },
  { id: 'ai', label: 'AI 生成', icon: (s) => <IconSpark size={s} /> },
  { id: 'settings', label: '设置', icon: (s) => <IconSettings size={s} /> },
]

function Shell() {
  const [page, setPage] = useState<Page>('dashboard')
  const hydrate = useStore((s) => s.hydrate)
  const hydrated = useStore((s) => s.hydrated)
  const questions = useStore((s) => s.questions)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const importPreset = useStore((s) => s.importPreset)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // 首次启动自动导入预设题库，开箱即用；仅初始化一次（清空/导入后不再触发）
  useEffect(() => {
    if (hydrated && !settings.initialized) {
      if (!settings.presetLoaded) importPreset()
      updateSettings({ initialized: true })
    }
  }, [hydrated, settings.initialized, settings.presetLoaded, importPreset, updateSettings])

  // 跟随系统模式：系统主题变化时实时同步
  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings.theme])

  const dueCount = questions.filter((q) => isDue(q)).length

  const go = (p: string) => {
    setPage(p as Page)
    document.querySelector('.main')?.scrollTo({ top: 0 })
  }

  const NavItems = ({ compact }: { compact?: boolean }) => (
    <>
      {NAV.map((n) => (
        <button
          key={n.id}
          className={`nav-item${page === n.id ? ' active' : ''}`}
          onClick={() => go(n.id)}
        >
          {n.icon(compact ? 19 : 18)}
          <span>{n.label}</span>
          {n.id === 'review' && dueCount > 0 && (
            <span className="nav-badge">{dueCount > 99 ? '99+' : dueCount}</span>
          )}
        </button>
      ))}
    </>
  )

  const themeBtn = (
    <button
      className="btn-icon"
      title={settings.theme === 'dark' ? '切换到亮色' : '切换到暗色'}
      onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
    >
      {settings.theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  )

  return (
    <div className="app">
      {/* 桌面侧边栏 */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">J</div>
          <div>
            <div className="brand-name">Java 面试冲刺</div>
            <div className="brand-sub">刷题记录 · 间隔复习</div>
          </div>
        </div>
        <NavItems />
        <div className="sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{themeBtn}</div>
          <div style={{ marginTop: 8 }}>数据仅存本地 · 纯前端 PWA</div>
        </div>
      </aside>

      {/* 移动端顶栏 */}
      <div className="topbar">
        <div className="brand-logo">J</div>
        <div className="brand-name">Java 面试冲刺</div>
        <div className="spacer" />
        {themeBtn}
      </div>

      <main className="main">
        {!hydrated ? (
          <div className="page">
            <div className="card empty" style={{ minHeight: 300 }}>
              <div className="empty-icon">⏳</div>
              <div className="empty-title">正在加载本地数据…</div>
            </div>
          </div>
        ) : (
          <>
            {page === 'dashboard' && <Dashboard go={go} />}
            {page === 'questions' && <Questions />}
            {page === 'review' && <Review go={go} />}
            {page === 'ai' && <AiGenerate go={go} />}
            {page === 'settings' && <Settings />}
          </>
        )}
      </main>

      {/* 移动端底部导航 */}
      <nav className="mobile-bottom">
        <NavItems compact />
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  )
}
