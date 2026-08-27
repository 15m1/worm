import type { ApiConfig, Difficulty } from '../types'
import { categoryDef } from '../types'

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
