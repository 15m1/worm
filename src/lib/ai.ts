import type { ApiConfig, Difficulty } from '../types'
import { categoryDef, CATEGORIES } from '../types'

export interface AiQuestion {
  title: string
  answer: string
  category: string
  difficulty: Difficulty
  tags: string[]
}

export interface GenerateOptions {
  category: string
  count: number
  difficulty: Difficulty | '全部'
  keywords: string
  signal?: AbortSignal
}

function stripCodeFence(text: string): string {
  const t = text.trim()
  const fenceMatch = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fenceMatch) return fenceMatch[1].trim()
  return t
}

function parseQuestions(text: string, fallbackCategory: string): AiQuestion[] {
  const cleaned = stripCodeFence(text)
  // 尝试直接解析
  try {
    const arr = JSON.parse(cleaned)
    if (Array.isArray(arr)) return normalize(arr, fallbackCategory)
  } catch {
    // fall through
  }
  // 尝试截取第一个 [ 到最后一个 ]
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start >= 0 && end > start) {
    try {
      const arr = JSON.parse(cleaned.slice(start, end + 1))
      if (Array.isArray(arr)) return normalize(arr, fallbackCategory)
    } catch {
      // ignore
    }
  }
  throw new Error('AI 返回格式无法解析，请重试')
}

function normalize(arr: unknown[], fallbackCategory: string): AiQuestion[] {
  const out: AiQuestion[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const title = String(o.title ?? o.question ?? '').trim()
    const answer = String(o.answer ?? '').trim()
    if (!title || !answer) continue
    let difficulty: Difficulty = '中等'
    const d = String(o.difficulty ?? '')
    if (d.includes('简')) difficulty = '简单'
    else if (d.includes('难')) difficulty = '困难'
    out.push({
      title,
      answer,
      category: String(o.category ?? fallbackCategory),
      difficulty,
      tags: Array.isArray(o.tags) ? o.tags.map(String).slice(0, 5) : [],
    })
  }
  return out
}

export async function generateQuestions(
  config: ApiConfig,
  opts: GenerateOptions,
): Promise<AiQuestion[]> {
  const baseUrl = (config.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')
  const catName = categoryDef(opts.category).name
  const difficultyText = opts.difficulty === '全部' ? '不限难度' : `难度为「${opts.difficulty}」`
  const keywordText = opts.keywords.trim() ? `，并且尽量结合这些关键词/场景：${opts.keywords.trim()}` : ''

  const systemPrompt = `你是一名资深的 Java 后端面试官，精通 Java 面试八股文知识点。
严格只输出一个 JSON 数组，不要输出任何其他文字或 markdown 代码块标记。
数组每个元素格式为：{"title": "问题标题", "answer": "参考答案（要点化、清晰，可用 markdown）", "difficulty": "简单|中等|困难", "tags": ["标签1","标签2"]}`

  const userPrompt = `请生成 ${opts.count} 道分类为「${catName}」的 Java 后端面试高频知识点问答，${difficultyText}${keywordText}。
问题要贴近真实面试、常见且高频，答案要准确、要点化、适合复习背诵，不要重复、不要编造明显错误的内容。`

  let resp: Response
  try {
    resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        stream: false,
      }),
      signal: opts.signal,
    })
  } catch (e) {
    if (opts.signal?.aborted) throw e
    throw new Error(
      '网络请求失败。若提示跨域(CORS)，说明该接口不允许浏览器直连，请改用支持浏览器调用的服务，或通过本地代理转发',
    )
  }

  if (!resp.ok) {
    let msg = `请求失败（HTTP ${resp.status}）`
    try {
      const err = await resp.json()
      msg = err?.error?.message ?? msg
    } catch {
      // ignore
    }
    throw new Error(msg)
  }

  const data = await resp.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ''
  if (!content) throw new Error('AI 没有返回内容')
  const parsed = parseQuestions(content, opts.category)
  if (parsed.length === 0) throw new Error('没有解析到有效题目')
  return parsed
}

/** 从 Markdown 文档/笔记中提取问答，整理为题库格式（由 AI 识别内容） */
export async function extractQuestions(
  config: ApiConfig,
  markdown: string,
  opts: { signal?: AbortSignal } = {},
): Promise<AiQuestion[]> {
  const baseUrl = (config.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')
  // 防止超长文档撑爆上下文、减少等待时间，截断到约 2 万字符
  const MAX = 20000
  const truncated = markdown.length > MAX
  const content = truncated ? markdown.slice(0, MAX) : markdown

  const categoryList = CATEGORIES.map((c) => `${c.id}（${c.name}）`).join(' / ')

  const systemPrompt = `你是一名资深的 Java 后端面试官。用户会提供一份 Markdown 格式的笔记/文档/题面内容。
请仔细阅读内容，从中提取出所有可以作为面试题的问答知识点，整理为题库条目。
严格只输出一个 JSON 数组，不要输出任何其他文字或 markdown 代码块标记。
数组每个元素格式为：{"title": "问题标题", "answer": "参考答案（要点化、清晰，可用 markdown）", "category": "分类id", "difficulty": "简单|中等|困难", "tags": ["标签1","标签2"]}
category 必须从以下分类 id 中选择最匹配的一个：${categoryList}
要求：
- 只提取文档中确实有对应答案/知识点的内容，不要自己编造新题目
- 若文档中的知识点缺少答案描述，可基于文档上下文简要补全，但不得引入文档外的内容
- 同一知识点只保留一条，去重合并`

  const userPrompt = `请从以下 Markdown 内容中提取面试题问答：\n\n${content}${truncated ? '\n\n（注：内容过长已截断，仅提取以上部分）' : ''}`

  let resp: Response
  try {
    resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        stream: false,
      }),
      signal: opts.signal,
    })
  } catch (e) {
    if (opts.signal?.aborted) throw e
    throw new Error(
      '网络请求失败。若提示跨域(CORS)，说明该接口不允许浏览器直连，请改用支持浏览器调用的服务，或通过本地代理转发',
    )
  }

  if (!resp.ok) {
    let msg = `请求失败（HTTP ${resp.status}）`
    try {
      const err = await resp.json()
      msg = err?.error?.message ?? msg
    } catch {
      // ignore
    }
    throw new Error(msg)
  }

  const data = await resp.json()
  const text: string = data?.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('AI 没有返回内容')
  const parsed = parseQuestions(text, 'java')
  if (parsed.length === 0) throw new Error('没有从文档中识别到有效的问答内容')
  return parsed
}

/** 按标题边界把 Markdown 切成块（每块不超过 maxChars），返回块数组 */
export function splitMarkdown(markdown: string, maxChars = 15000): string[] {
  if (markdown.length <= maxChars) return [markdown]
  const lines = markdown.split('\n')
  const blocks: string[] = []
  let current: string[] = []
  let currentLen = 0
  // 遇到一级/二级标题且当前块已较长时切块
  for (const line of lines) {
    const isHeading = /^#{1,2}\s/.test(line)
    if (isHeading && currentLen > maxChars * 0.6) {
      if (currentLen > 0) blocks.push(current.join('\n'))
      current = []
      currentLen = 0
    }
    current.push(line)
    currentLen += line.length + 1
    // 无标题的长文档：按硬长度切
    if (currentLen >= maxChars) {
      blocks.push(current.join('\n'))
      current = []
      currentLen = 0
    }
  }
  if (current.length > 0) blocks.push(current.join('\n'))
  return blocks.filter((b) => b.trim().length > 0)
}

/** 分批识别长文档：逐块调用 AI 提取问答并合并去重，onProgress 汇报进度（第 x 批 / 共 y 批） */
export async function extractQuestionsBatched(
  config: ApiConfig,
  markdown: string,
  opts: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<AiQuestion[]> {
  const blocks = splitMarkdown(markdown)
  const all: AiQuestion[] = []
  const seen = new Set<string>()
  for (let i = 0; i < blocks.length; i++) {
    opts.onProgress?.(i + 1, blocks.length)
    let batch: AiQuestion[]
    try {
      batch = await extractQuestions(config, blocks[i], { signal: opts.signal })
    } catch (e) {
      // 中间某批失败不终止整体，跳过该批继续
      if (opts.signal?.aborted) throw e
      if (i === blocks.length - 1 && all.length === 0) throw e
      continue
    }
    for (const q of batch) {
      const key = q.title.trim()
      if (seen.has(key)) continue
      seen.add(key)
      all.push(q)
    }
  }
  if (all.length === 0) throw new Error('没有从文档中识别到有效的问答内容')
  return all
}

/** 针对单道题目，基于现有答案生成更完整、更适合复习背诵的参考答案（markdown） */
export async function generateAnswer(
  config: ApiConfig,
  q: { title: string; answer: string; category: string },
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = (config.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')

  const systemPrompt = `你是一名资深的 Java 后端面试官，精通 Java 后端面试八股文知识点。
你会收到一道面试题及其现有参考答案，请输出一份更完整、更清晰、更适合复习背诵的参考答案。
要求：
- 使用 markdown 组织，要点化、分点清晰，必要时给出简短的代码示例
- 覆盖关键知识点，补充容易被忽略的考点和常见追问
- 只输出答案内容本身，不要输出题目标题，不要输出任何多余说明`

  const userPrompt = `题目（分类：${q.category}）：${q.title}\n\n现有答案：\n${q.answer || '（暂无）'}\n\n请生成完善后的参考答案：`

  let resp: Response
  try {
    resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        stream: false,
      }),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new Error(
      '网络请求失败。若提示跨域(CORS)，说明该接口不允许浏览器直连，请改用支持浏览器调用的服务，或通过本地代理转发',
    )
  }

  if (!resp.ok) {
    let msg = `请求失败（HTTP ${resp.status}）`
    try {
      const err = await resp.json()
      msg = err?.error?.message ?? msg
    } catch {
      // ignore
    }
    throw new Error(msg)
  }

  const data = await resp.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ''
  if (!content) throw new Error('AI 没有返回内容')
  return content.trim()
}

// ---- 图片识别（视觉模型）----

export interface ImageInput {
  dataUrl?: string // 本地图片转 data URL（data:image/...;base64,...）
  url?: string // 网络图片 URL（模型服务器直接拉取）
  alt?: string
}

export interface MdImageRef {
  raw: string // 引用原文，如 images/a.png
  alt: string
}

// 从 Markdown 中解析图片引用（本地路径 / 网络 URL），跳过内嵌 base64 图片
export function extractImageRefs(markdown: string): MdImageRef[] {
  const refs: MdImageRef[] = []
  const re = /!\[([^\]]*)\]\(([^)\s]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown))) {
    const raw = m[2].trim()
    if (!raw || raw.startsWith('data:')) continue
    refs.push({ raw, alt: m[1]?.trim() ?? '' })
  }
  return refs
}

// 发送给 AI 的文本块中，把图片引用替换成占位说明，避免纯路径干扰识别
export function replaceImageRefs(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string) =>
    alt?.trim() ? `[图片：${alt.trim()}]` : '[图片]',
  )
}

function normalizePath(p: string): string {
  return p
    .split(/[?#]/)[0]
    .replace(/^\.\//, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
}

// 用引用路径在文件夹文件列表中匹配本地图片文件
export function matchLocalImage(ref: MdImageRef, files: File[]): File | undefined {
  const target = normalizePath(ref.raw)
  const name = target.split('/').pop() ?? ''
  return files.find((f) => {
    const fp = normalizePath(f.webkitRelativePath || f.name)
    return fp === target || fp.endsWith('/' + target) || f.name === name
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

/** 用视觉模型识别一批图片并提取问答（OpenAI 兼容多模态格式，需模型支持图像输入） */
export async function extractFromImages(
  config: ApiConfig,
  images: ImageInput[],
  opts: { signal?: AbortSignal } = {},
): Promise<AiQuestion[]> {
  const baseUrl = (config.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')
  const categoryList = CATEGORIES.map((c) => `${c.id}（${c.name}）`).join(' / ')

  const systemPrompt = `你是一名资深的 Java 后端面试官。用户会提供一张或多张图片（可能是笔记截图、代码截图、知识点图、面试题截图）。
请仔细识别图片中的内容（文字、代码、表格等），从中提取出所有可以作为面试题的问答知识点，整理为题库条目。
严格只输出一个 JSON 数组，不要输出任何其他文字或 markdown 代码块标记。
数组每个元素格式为：{"title": "问题标题", "answer": "参考答案（要点化、清晰，可用 markdown）", "category": "分类id", "difficulty": "简单|中等|困难", "tags": ["标签1","标签2"]}
category 必须从以下分类 id 中选择最匹配的一个：${categoryList}
要求：
- 只提取图片中确实有的内容，不要编造
- 同一知识点只保留一条，去重合并`

  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text: '请识别以下图片中的内容，提取出可作为面试题的问答知识点。' },
    ...images.map((img) => ({
      type: 'image_url',
      image_url: { url: img.dataUrl ?? img.url ?? '' },
    })),
  ]

  let resp: Response
  try {
    resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        temperature: 0.3,
        stream: false,
      }),
      signal: opts.signal,
    })
  } catch (e) {
    if (opts.signal?.aborted) throw e
    throw new Error(
      '网络请求失败。若提示跨域(CORS)，说明该接口不允许浏览器直连，请改用支持浏览器调用的服务，或通过本地代理转发',
    )
  }

  if (!resp.ok) {
    let msg = `请求失败（HTTP ${resp.status}）`
    try {
      const err = await resp.json()
      msg = err?.error?.message ?? msg
    } catch {
      // ignore
    }
    throw new Error(msg)
  }

  const data = await resp.json()
  const text: string = data?.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('AI 没有返回内容')
  const parsed = parseQuestions(text, 'java')
  if (parsed.length === 0) throw new Error('没有从图片中识别到有效的问答内容')
  return parsed
}

/** 从文件夹批量导入：MD/文本按标题分批走文本识别，图片按 4 张一批走视觉识别，结果合并去重 */
export async function extractFolderBatched(
  config: ApiConfig,
  files: File[],
  opts: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<AiQuestion[]> {
  const mdFiles = files.filter((f) => /\.(md|markdown|txt)$/i.test(f.name))
  const imageFiles = files.filter((f) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name))

  const textBlocks: string[] = []
  const imageInputs: ImageInput[] = []
  const seenImages = new Set<string>()

  for (const md of mdFiles) {
    const text = await md.text()
    if (!text.trim()) continue
    // 文本块：图片引用替换成占位说明，避免纯路径干扰 AI
    textBlocks.push(...splitMarkdown(replaceImageRefs(text)))
    // 本地图片引用 → data URL；网络图片 URL 直接传给模型（模型服务器会拉取）
    for (const ref of extractImageRefs(text)) {
      if (seenImages.has(ref.raw)) continue
      seenImages.add(ref.raw)
      if (/^https?:\/\//i.test(ref.raw)) {
        imageInputs.push({ url: ref.raw, alt: ref.alt })
      } else {
        const f = matchLocalImage(ref, imageFiles)
        if (!f) continue
        imageInputs.push({ dataUrl: await fileToDataUrl(f), alt: ref.alt })
      }
    }
  }

  // 图片按 4 张一批（多数视觉模型单请求图片数限制）
  const imageBatches: ImageInput[][] = []
  for (let i = 0; i < imageInputs.length; i += 4) {
    imageBatches.push(imageInputs.slice(i, i + 4))
  }

  const total = textBlocks.length + imageBatches.length
  if (total === 0) throw new Error('文件夹里没有可识别的内容')
  let done = 0
  const report = () => opts.onProgress?.(Math.min(done, total), total)

  const all: AiQuestion[] = []
  const seen = new Set<string>()
  const push = (qs: AiQuestion[]) => {
    for (const q of qs) {
      const key = q.title.trim()
      if (seen.has(key)) continue
      seen.add(key)
      all.push(q)
    }
  }

  for (const block of textBlocks) {
    done++
    report()
    try {
      push(await extractQuestions(config, block, { signal: opts.signal }))
    } catch (e) {
      if (opts.signal?.aborted) throw e
      // 单块失败跳过，继续后续批次
    }
  }
  for (const batch of imageBatches) {
    done++
    report()
    try {
      push(await extractFromImages(config, batch, { signal: opts.signal }))
    } catch (e) {
      if (opts.signal?.aborted) throw e
      // 图片批失败：若全文没提取到任何内容，则报错并提示可能是不支持视觉的模型
      if (all.length === 0) {
        const msg = e instanceof Error ? e.message : '图片识别失败'
        throw new Error(`${msg}\n提示：图片识别需要支持视觉的模型（如 mimo-v2.5 / gpt-4o 等）`)
      }
    }
  }
  if (all.length === 0) throw new Error('没有从文档中识别到有效的问答内容')
  return all
}
