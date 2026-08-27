import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { CATEGORIES, categoryDef, type Difficulty } from '../types'
import { extractFolderBatched, extractQuestionsBatched, generateQuestions, type AiQuestion } from '../lib/ai'
import { IconSpark, IconCheck, IconDownload, IconFolder } from '../components/icons'
import { useToast } from '../components/Toast'

const COUNTS = [3, 5, 8, 10]

export default function AiGenerate({ go }: { go: (page: string) => void }) {
  const settings = useStore((s) => s.settings)
  const questions = useStore((s) => s.questions)
  const addQuestions = useStore((s) => s.addQuestions)
  const toast = useToast().toast

  const [category, setCategory] = useState('jvm')
  const [difficulty, setDifficulty] = useState<Difficulty | '全部'>('全部')
  const [count, setCount] = useState(5)
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<AiQuestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sourceLabel, setSourceLabel] = useState('AI 生成')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

  const hasApi = !!settings.api.apiKey.trim()
  // 是否为 MD / 文件夹导入（区别于 AI 直接生成）
  const isMdImport = sourceLabel.startsWith('MD 导入') || sourceLabel.startsWith('文件夹导入')

  const doGenerate = async () => {
    if (!hasApi) {
      toast('请先在「设置」中配置 API Key', 'err')
      return
    }
    setError('')
    setLoading(true)
    setResults([])
    setSelected(new Set())
    setSourceLabel('AI 生成')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const items = await generateQuestions(settings.api, {
        category,
        count,
        difficulty,
        keywords,
        signal: controller.signal,
      })
      setResults(items)
      setSelected(new Set(items.map((_, i) => i)))
      toast(`生成成功，共 ${items.length} 题`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '生成失败'
      if (msg !== 'The user aborted a request.') setError(msg)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  // 从 Markdown 文件导入：分批发给 AI 识别文档内容并提取问答
  const doImportMd = async (file: File) => {
    if (!hasApi) {
      toast('请先在「设置」中配置 API Key', 'err')
      return
    }
    const text = await file.text()
    if (!text.trim()) {
      toast('文件内容为空', 'err')
      return
    }
    setError('')
    setLoading(true)
    setResults([])
    setSelected(new Set())
    setProgress(null)
    setSourceLabel(`MD 导入 · ${file.name}`)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const items = await extractQuestionsBatched(settings.api, text, {
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      setResults(items)
      setSelected(new Set(items.map((_, i) => i)))
      toast(`识别完成，共提取 ${items.length} 题，请校对后保存`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '识别失败'
      if (msg !== 'The user aborted a request.') setError(msg)
    } finally {
      setLoading(false)
      setProgress(null)
      abortRef.current = null
    }
  }

  // 从文件夹导入：读取其中的 MD/文本 + 本地图片，文本走文本识别、图片走视觉识别，合并入库
  const doImportFolder = async (files: FileList) => {
    if (!hasApi) {
      toast('请先在「设置」中配置 API Key', 'err')
      return
    }
    if (files.length === 0) return
    setError('')
    setLoading(true)
    setResults([])
    setSelected(new Set())
    setProgress(null)
    setSourceLabel('文件夹导入')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const items = await extractFolderBatched(settings.api, Array.from(files), {
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      setResults(items)
      setSelected(new Set(items.map((_, i) => i)))
      toast(`识别完成，共提取 ${items.length} 题，请校对后保存`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '识别失败'
      if (msg !== 'The user aborted a request.') setError(msg)
    } finally {
      setLoading(false)
      setProgress(null)
      abortRef.current = null
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  const save = () => {
    let picked = results.filter((_, i) => selected.has(i))
    if (picked.length === 0) {
      toast('请先选择要保存的题目', 'err')
      return
    }
    // 逻辑：与题库现有题目按标题去重，避免重复入库
    const existing = new Set(questions.map((q) => q.title))
    picked = picked.filter((p) => !existing.has(p.title))
    if (picked.length === 0) {
      toast('所选题目已存在于题库中', 'err')
      return
    }
    // 分类：AI 返回的可能是分类 id 或中文名，都做匹配；都不匹配则用当前表单选的分类
    addQuestions(
      picked.map((p) => ({
        id: crypto.randomUUID(),
        title: p.title,
        answer: p.answer,
        category:
          CATEGORIES.find((c) => c.id === p.category || c.name === p.category)?.id ?? category,
        difficulty: p.difficulty,
        tags: p.tags,
        source: sourceLabel,
        isPreset: false,
        isFavorite: false,
        wrong: false,
        important: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        review: {
          status: 'new' as const,
          repetitions: 0,
          interval: 0,
          ease: 2.5,
          dueAt: Date.now(),
          lastReviewedAt: null,
        },
      })),
    )
    setResults([])
    toast(`已保存 ${picked.length} 题到题库`)
  }

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">AI 生成题库</div>
          <div className="page-desc">用 AI 批量生成 Java 后端面试高频知识点，预览后一键入库</div>
        </div>
      </div>

      {!hasApi && (
        <div className="card panel" style={{ borderColor: 'var(--warn)', marginBottom: 16 }}>
          <div className="panel-title" style={{ color: 'var(--warn)' }}>
            尚未配置 AI 接口
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>
            需要你自己的 API Key（支持 DeepSeek / OpenAI / MiMo 等兼容接口）。Key 只存在本地浏览器，不会上传云端；
            仅在点击「生成」时才将题目需求发送给你配置的接口。
          </div>
          <button className="btn btn-primary" onClick={() => go('settings')}>
            去设置 API
          </button>
        </div>
      )}

      <div className="ai-layout">
        <div className="card ai-form">
          <div className="field">
            <label>分类</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>难度</label>
            <select
              className="select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty | '全部')}
            >
              <option>全部</option>
              <option>简单</option>
              <option>中等</option>
              <option>困难</option>
            </select>
          </div>
          <div className="field">
            <label>生成数量</label>
            <div className="seg">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  className={count === n ? 'active' : ''}
                  onClick={() => setCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>附加要求（可选）</label>
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="如：围绕高频面试、结合实际项目场景"
            />
          </div>
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={loading ? cancel : doGenerate}
            style={{ width: '100%' }}
          >
            <IconSpark size={16} />
            {loading ? '生成中…（点击取消）' : `生成 ${count} 题`}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>或</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <button
            className="btn btn-ghost"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
            style={{ width: '100%' }}
          >
            <IconDownload size={16} /> 从 Markdown 文件导入（AI 识别）
          </button>
          <button
            className="btn btn-ghost"
            disabled={loading}
            onClick={() => folderRef.current?.click()}
            style={{ width: '100%' }}
          >
            <IconFolder size={16} /> 从文件夹导入（含图片识别）
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImportMd(f)
              e.target.value = ''
            }}
          />
          <input
            ref={folderRef}
            type="file"
            style={{ display: 'none' }}
            {...({ webkitdirectory: '', multiple: true } as object)}
            onChange={(e) => {
              const fs = e.target.files
              if (fs && fs.length) doImportFolder(fs)
              e.target.value = ''
            }}
          />
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.6 }}>
            模型：{settings.api.model || 'deepseek-chat'}。生成内容建议人工校对后使用。
            {settings.api.baseUrl.includes('deepseek') && (
              <>
                <br />
                图片识别需要支持视觉的模型（如 mimo-v2.5 / gpt-4o），DeepSeek 仅能识别文本。
              </>
            )}
          </div>
        </div>

        <div className="ai-result">
          {loading && (
            <div className="card panel" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>🤖</div>
              <div style={{ fontWeight: 700 }}>
                {isMdImport
                  ? progress
                    ? `正在识别文档（第 ${progress.done} / ${progress.total} 批）…`
                    : '正在识别文档内容…'
                  : `正在生成 ${categoryDef(category).name} 面试题…`}
              </div>
              <div style={{ color: 'var(--text-faint)', fontSize: 12.5, marginTop: 6 }}>
                {isMdImport
                  ? '长文档已分批处理，每批识别完成后会更新进度'
                  : 'AI 正在回忆高频考点，请稍候'}
              </div>
              {progress && (
                <div className="progress-track" style={{ height: 6, maxWidth: 240, margin: '14px auto 0' }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="card panel" style={{ borderColor: 'var(--danger)' }}>
              <div className="panel-title" style={{ color: 'var(--danger)' }}>
                生成失败
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 10 }}>{error}</div>
              <button
                className="btn btn-ghost btn-sm"
                // MD/文件夹导入失败时重新选择文件，生成失败时重新生成
                onClick={() => (isMdImport ? folderRef.current?.click() : doGenerate())}
              >
                重试
              </button>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              {results.map((q, i) => {
                const on = selected.has(i)
                return (
                  <div
                    className="card ai-card"
                    key={i}
                    style={{
                      borderLeftColor: on ? categoryDef(q.category).color : 'var(--border)',
                      opacity: on ? 1 : 0.55,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggle(i)}
                  >
                    <div className="q-meta" style={{ marginBottom: 6 }}>
                      <button
                        className="btn-icon"
                        style={{
                          background: on ? 'var(--ok-soft)' : 'var(--panel-2)',
                          color: on ? 'var(--ok)' : 'var(--text-faint)',
                          borderRadius: 6,
                          padding: 4,
                        }}
                      >
                        <IconCheck size={15} />
                      </button>
                      <span className="tag" style={{ background: `${categoryDef(q.category).color}22` }}>
                        {categoryDef(q.category).name}
                      </span>
                      <span className={`diff diff-${q.difficulty}`}>{q.difficulty}</span>
                    </div>
                    <div className="ai-q">{i + 1}. {q.title}</div>
                    <div className="ai-a">{q.answer}</div>
                  </div>
                )
              })}
              <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}>
                <IconCheck size={16} /> 保存选中 {selected.size} 题到题库
              </button>
            </>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="card empty">
              <div className="empty-icon">✨</div>
              <div className="empty-title">还没开始</div>
              <div>
                选择分类和数量，点击「生成」，AI 会给出可校对的高频面试题
                <br />
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                  {hasApi ? '你的 API 已配置，可以开冲了' : '先去设置页配置 API Key'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
