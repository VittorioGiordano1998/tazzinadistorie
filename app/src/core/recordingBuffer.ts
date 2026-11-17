/**
 * Crash-safe buffer for a recording in progress.
 *
 * Every chunk the recorder emits is also written to IndexedDB. If the phone locks,
 * the tab is killed or the upload fails, the audio is still on the device and can be
 * recovered the next time the recording screen opens. A session is deleted only
 * after the story has been saved.
 */

const DB_NAME = 'tazzina-recording-buffer'
const DB_VERSION = 1
const SESSIONS = 'sessions'
const CHUNKS = 'chunks'

export interface BufferedSession {
  id: string
  /** Full recorder mime type, e.g. `audio/webm;codecs=opus`. */
  mime: string
  /** ISO timestamp of when the recording started. */
  startedAt: string
}

interface ChunkRecord {
  sessionId: string
  index: number
  data: Blob
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB: richiesta fallita.'))
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB: transazione fallita.'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB: transazione annullata.'))
  })
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponibile.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore(SESSIONS, { keyPath: 'id' })
      db.createObjectStore(CHUNKS, { keyPath: ['sessionId', 'index'] })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB: apertura fallita.'))
  })
}

/** Registers a new recording session. */
export async function startBufferedSession(session: BufferedSession): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(SESSIONS, 'readwrite')
    tx.objectStore(SESSIONS).put(session)
    await transactionDone(tx)
  } finally {
    db.close()
  }
}

/** Appends one recorder chunk (chunks are numbered in arrival order). */
export async function appendBufferedChunk(sessionId: string, index: number, data: Blob): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(CHUNKS, 'readwrite')
    const record: ChunkRecord = { sessionId, index, data }
    tx.objectStore(CHUNKS).put(record)
    await transactionDone(tx)
  } finally {
    db.close()
  }
}

/** Sessions still on the device, oldest first. */
export async function listBufferedSessions(): Promise<BufferedSession[]> {
  const db = await openDb()
  try {
    const tx = db.transaction(SESSIONS, 'readonly')
    const all = await requestToPromise(tx.objectStore(SESSIONS).getAll() as IDBRequest<BufferedSession[]>)
    return all.sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  } finally {
    db.close()
  }
}

/** Rebuilds a session's audio from its chunks; `null` when nothing was stored. */
export async function readBufferedAudio(session: BufferedSession): Promise<Blob | null> {
  const db = await openDb()
  try {
    const tx = db.transaction(CHUNKS, 'readonly')
    const range = IDBKeyRange.bound([session.id, 0], [session.id, Number.MAX_SAFE_INTEGER])
    const records = await requestToPromise(tx.objectStore(CHUNKS).getAll(range) as IDBRequest<ChunkRecord[]>)
    if (records.length === 0) return null
    records.sort((a, b) => a.index - b.index)
    return new Blob(
      records.map((record) => record.data),
      { type: session.mime },
    )
  } finally {
    db.close()
  }
}

/** Forgets a session and all its chunks (after a successful save or a discard). */
export async function deleteBufferedSession(sessionId: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction([SESSIONS, CHUNKS], 'readwrite')
    tx.objectStore(SESSIONS).delete(sessionId)
    tx.objectStore(CHUNKS).delete(IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER]))
    await transactionDone(tx)
  } finally {
    db.close()
  }
}
