import { useEffect, useState } from 'react'
import type { Difficulty, Question } from '../types'
import { CATEGORIES } from '../types'
import { useStore } from '../store/useStore'
import { useToast } from './Toast'
import { IconClose } from './icons'

export default function QuestionForm({
  initial,
  defaultCategory,
  onClose,
}: {
  initial: Question | null
  defaultCategory?: string
  onClose: () => void
}) {
  const addQuestion = useStore((s) => s.addQuestion)
  const updateQuestion = useStore((s) => s.updateQuestion)
  const toast = useToast().toast

  const [title, setTitle] = useState(initial?.title ?? '')
  const [answer, setAnswer] = useState(initial?.answer ?? '')
  const [category, setCategory] = useState(initial?.category ?? defaultCategory ?? 'java')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? '中等')
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [source, setSource] = useState(initial?.source ?? '')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    if (!title.trim()) {
      toast('请输入题目', 'err')
      return
    }
    if (!answer.trim()) {
      toast('请输入参考答案', 'err')
      return
    }
    const draft = {
      title: title.trim(),
      answer: answer.trim(),
      category,
      difficulty,
      tags: tags
        .split(/[,，、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6),
      source: source.trim() || undefined,
    }
    if (initial) {
      updateQuestion(initial.id, draft)
      toast('已保存修改')
    } else {
      addQuestion(draft)
      toast('已添加题目')
    }
    onClose()
  }

  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">{initial ? '编辑题目' : '新增题目'}</div>
          <button className="btn-icon" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>题目</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：HashMap 的底层实现原理？"
              autoFocus
            />
          </div>
          <div className="field">
            <label>参考答案（支持 Markdown）</label>
            <textarea
              className="textarea"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="写下要点化的参考答案……"
              style={{ minHeight: 180 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option>简单</option>
                <option>中等</option>
                <option>困难</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>标签（逗号分隔）</label>
              <input
                className="input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="并发, 锁"
              />
            </div>
            <div className="field">
              <label>来源（可选）</label>
              <input
                className="input"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="如：牛客/某厂面经"
              />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {initial ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}
