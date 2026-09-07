import { DatabaseSync } from 'node:sqlite'
import { safeStorage } from 'electron'
import { randomUUID } from 'node:crypto'
import { defaultPreferences, type Preferences, type Connection, type ConnectionInput, type Settings, type ListenLater, type QueueItem, type HistoryItem } from '../shared/types'

export class Store {
  private db: DatabaseSync
  constructor(path: string) {
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, config TEXT NOT NULL, secret BLOB NOT NULL)')
    if (!this.get('deviceId')) this.set('deviceId', randomUUID())
  }
  get<T>(key: string): T | undefined { const row = this.db.prepare('SELECT value FROM kv WHERE key = ?').get(key); return row ? JSON.parse(row.value as string) as T : undefined }
  set(key: string, value: unknown) { this.db.prepare('INSERT INTO kv VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value)) }
  preferences(): Preferences { return { ...defaultPreferences, ...this.get<Preferences>('preferences') } }
  laterList(): ListenLater[] { return (this.get<ListenLater[]>('listenLater') ?? []).sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due)) }
  laterSave(input: { item: QueueItem; due: string; note: string; id?: string; done?: boolean }): ListenLater {
    const all = this.laterList(), existing = all.find(x => x.id === input.id)
    const value: ListenLater = { ...input, id: existing?.id ?? randomUUID(), done: input.done ?? existing?.done ?? false, createdAt: existing?.createdAt ?? Date.now() }
    this.set('listenLater', [...all.filter(x => x.id !== value.id), value]); return value
  }
  laterDelete(id: string) { this.set('listenLater', this.laterList().filter(x => x.id !== id)) }
  history(): HistoryItem[] { return this.get<HistoryItem[]>('history') ?? [] }
  record(item: QueueItem, position: number, duration: number) {
    const id = JSON.stringify(item.target)
    this.set('history', [{ id, item, position, duration, playedAt: Date.now() }, ...this.history().filter(x => x.id !== id)].slice(0, 500))
  }
  connections(): Connection[] { return this.db.prepare('SELECT config FROM servers ORDER BY rowid').all().map(row => JSON.parse(row.config as string) as Connection) }
  connection(id: string): { config: Connection; secret: string } {
    const row = this.db.prepare('SELECT config, secret FROM servers WHERE id = ?').get(id)
    if (!row) throw new Error('Server connection was removed. Choose another server.')
    return { config: JSON.parse(row.config as string), secret: safeStorage.decryptString(Buffer.from(row.secret as Uint8Array)) }
  }
  saveConnection(input: ConnectionInput, id: string): Connection {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS credential encryption is unavailable. Credentials have not been saved.')
    const { secret, ...fields } = input; const config: Connection = { ...fields, id }
    this.db.prepare('INSERT INTO servers VALUES (?, ?, ?)').run(id, JSON.stringify(config), safeStorage.encryptString(secret))
    return config
  }
  removeConnection(id: string) { this.db.prepare('DELETE FROM servers WHERE id = ?').run(id) }
  settings(): Settings { return { mpvPath: this.get('mpvPath') ?? '', exclusive: this.get('exclusive') ?? false, audioDevice: this.get('audioDevice') ?? 'auto', connections: this.connections() } }
  close() { this.db.close() }
}
