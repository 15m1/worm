import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { IconDownload, IconUpload } from '../components/icons'
import { useToast } from '../components/Toast'

const PRESETS = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { id: 'mimo', name: 'MiMo（小米）', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5-pro' },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'custom', name: '自定义', baseUrl: '', model: '' },
] as const

function detectProvider(url: string): string {
  const u = url.trim()
  if (u.includes('xiaomimimo.com')) return 'mimo'
  if (u.includes('deepseek.com')) return 'deepseek'
  if (u.includes('openai.com')) return 'openai'
  return 'custom'
}

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const importPreset = useStore((s) => s.importPreset)
  const presetLoaded = useStore((s) => s.settings.presetLoaded)
  const toast = useToast().toast

  const fileRef = useRef<HTMLInputElement>(null)
  const [apiKey, setApiKey] = useState(settings.api.apiKey)
  const [baseUrl, setBaseUrl] = useState(settings.api.baseUrl)
  const [model, setModel] = useState(settings.api.model)
  const [provider, setProvider] = useState(() => detectProvider(settings.api.baseUrl))

  const applyProvider = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    setProvider(id)
    if (id !== 'custom') {
      setBaseUrl(p.baseUrl)
      setModel(p.model)
    }
  }

  const saveApi = () => {
    updateSettings({
      api: { baseUrl: baseUrl.trim() || 'https://api.deepseek.com', apiKey: apiKey.trim(), model: model.trim() || 'deepseek-chat' },
    })
    toast('API 配置已保存')
  }

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `java-interview-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('已导出备份文件')
  }

  const doImport = async (file: File) => {
    const text = await file.text()
    if (importData(text)) toast('数据导入成功')
    else toast('导入失败：文件格式不正确', 'err')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">设置</div>
          <div className="page-desc">外观、复习目标、AI 接口与数据管理</div>
        </div>
      </div>

      <div className="card set-group">
        <div className="set-title">外观</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">主题模式</div>
            <div className="set-desc">跟随系统或手动切换暗色 / 亮色</div>
          </div>
          <div className="seg">
            {(
              [
                ['light', '亮色'],
                ['dark', '暗色'],
                ['system', '跟随系统'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                className={settings.theme === v ? 'active' : ''}
                onClick={() => updateSettings({ theme: v })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">每日复习目标</div>
            <div className="set-desc">看板上的目标进度依据此数值</div>
          </div>
          <input
            type="number"
            className="input"
            min={1}
            max={50}
            style={{ width: 110 }}
            value={settings.dailyGoal}
            onChange={(e) => updateSettings({ dailyGoal: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
          />
        </div>
      </div>

      <div className="card set-group">
        <div className="set-title">AI 接口</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">服务商</div>
            <div className="set-desc">选择后自动填入接口地址与模型（兼容 OpenAI 协议）</div>
          </div>
          <div className="seg">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={provider === p.id ? 'active' : ''}
                onClick={() => applyProvider(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">Base URL</div>
            <div className="set-desc">OpenAI 兼容接口地址</div>
          </div>
          <input
            className="input"
            style={{ width: 260 }}
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value)
              setProvider(detectProvider(e.target.value))
            }}
            placeholder="https://api.xiaomimimo.com/v1"
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">API Key</div>
            <div className="set-desc">仅存本地浏览器，不会上传到任何云端</div>
          </div>
          <input
            className="input"
            type="password"
            style={{ width: 260 }}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">模型</div>
            <div className="set-desc">如 deepseek-chat / mimo-v2.5-pro / gpt-4o-mini</div>
          </div>
          <input
            className="input"
            style={{ width: 200 }}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="deepseek-chat"
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={saveApi}>
            保存 API 配置
          </button>
          {!settings.api.apiKey && (
            <span style={{ fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center' }}>
              尚未配置 Key，AI 生成功能不可用
            </span>
          )}
        </div>
      </div>

      <div className="card set-group">
        <div className="set-title">题库与数据</div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">预设高频题库</div>
            <div className="set-desc">
              {presetLoaded
                ? '内置 50 道高频题，可重复导入以补全新增题目（按标题去重）'
                : '一键导入内置的 Java 后端高频面试题'}
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const n = importPreset()
              toast(n > 0 ? `已新增 ${n} 道预设题` : '题库已是最新，无新增')
            }}
          >
            <IconDownload size={16} /> {presetLoaded ? '更新预设题库' : '导入预设题库'}
          </button>
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">导出备份</div>
            <div className="set-desc">导出全部数据为 JSON 文件，可跨设备迁移（安全起见不含 API Key）</div>
          </div>
          <button className="btn btn-ghost" onClick={doExport}>
            <IconDownload size={16} /> 导出 JSON
          </button>
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">导入备份</div>
            <div className="set-desc">从 JSON 文件恢复数据（会覆盖当前数据）</div>
          </div>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <IconUpload size={16} /> 导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImport(f)
              e.target.value = ''
            }}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <div className="set-label">清空所有数据</div>
            <div className="set-desc">删除本地全部题目、复习记录与设置，不可恢复</div>
          </div>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('确定清空所有数据？此操作不可恢复！')) {
                resetAll()
                toast('已清空所有数据')
              }
            }}
          >
            清空数据
          </button>
        </div>
      </div>

      <div className="card set-group">
        <div className="set-title">关于</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8 }}>
          <div>Java 后端面试冲刺复习工具 · 纯前端 PWA</div>
          <div>
            所有数据均存储在本地（IndexedDB），不经过任何服务器。可安装到桌面/手机，离线使用。
          </div>
          <div>
            智能复习采用 SM-2 间隔重复算法（Anki 同款思路），根据你的「记住了 / 模糊 / 忘了」自动调整复习间隔。
          </div>
        </div>
      </div>
    </div>
  )
}
