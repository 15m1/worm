import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  type: 'info' | 'err'
}

interface ToastCtx {
  toast: (message: string, type?: 'info' | 'err') => void
}

const Ctx = createContext<ToastCtx>({ toast: () => {} })

export const useToast = () => useContext(Ctx)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: 'info' | 'err' = 'info') => {
    const id = ++seq
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.type === 'err' ? ' err' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
