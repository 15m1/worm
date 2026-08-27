import { openDB, type IDBPDatabase } from 'idb'
import type { PersistedState } from './types'

const DB_NAME = 'java-review-db'
const STORE = 'kv'
const KEY = 'state'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const db = await getDb()
    const tx = db.transaction(STORE, 'readonly')
    return (await tx.store.get(KEY)) ?? null
  } catch {
    return null
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    const db = await getDb()
    const tx = db.transaction(STORE, 'readwrite')
    await tx.store.put(state, KEY)
    await tx.done
  } catch {
    // 存储失败静默处理（如隐私模式），不阻断使用
  }
}

export async function clearState(): Promise<void> {
  try {
    const db = await getDb()
    const tx = db.transaction(STORE, 'readwrite')
    await tx.store.delete(KEY)
    await tx.done
  } catch {
    // ignore
  }
}
