import { recapInsights, recapRangeSchema, type ListeningRecap, type RecapRange } from '../shared/recap'
import { listeningDays } from '../shared/listening-days'
import { DatabaseSync } from 'node:sqlite'
import { safeStorage } from 'electron'
import { randomUUID } from 'node:crypto'
import type { ListeningStats } from '../shared/daily'
import { defaultPreferences, type Preferences, type Connection, type ConnectionInput, type Settings, type ListenLater, type QueueItem, type HistoryItem } from '../shared/types'

export class Store {
  private db: DatabaseSync
  private resetComplete=false
  constructor(path: string) {
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, config TEXT NOT NULL, secret BLOB NOT NULL)')
    if (!this.get('deviceId')) this.set('deviceId', randomUUID())
    this.db.exec('CREATE TABLE IF NOT EXISTS listening (day TEXT NOT NULL, target TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, subtitle TEXT NOT NULL, seconds REAL NOT NULL DEFAULT 0, finished INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,target)); CREATE TABLE IF NOT EXISTS catalog_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated INTEGER NOT NULL)')
  }
  get<T>(key: string): T | undefined { const row = this.db.prepare('SELECT value FROM kv WHERE key = ?').get(key); return row ? JSON.parse(row.value as string) as T : undefined }
  set(key: string, value: unknown) { if(this.resetComplete)return;this.db.prepare('INSERT INTO kv VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value)) }
  setSecret(key: string, value: string) { if (!safeStorage.isEncryptionAvailable()) throw new Error('OS credential encryption is unavailable.'); this.set(`secret:${key}`, safeStorage.encryptString(value).toString('base64')) }
  secret(key: string) { const value = this.get<string>(`secret:${key}`); return value ? safeStorage.decryptString(Buffer.from(value, 'base64')) : '' }
  cache<T>(key: string): { value: T; updated: number } | undefined { const row = this.db.prepare('SELECT value,updated FROM catalog_cache WHERE key=?').get(key); return row ? { value: JSON.parse(row.value as string), updated: Number(row.updated) } : undefined }
  cacheSet(key: string, value: unknown) { if(this.resetComplete)return;this.db.prepare('INSERT INTO catalog_cache VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated').run(key, JSON.stringify(value), Date.now()); this.db.exec('DELETE FROM catalog_cache WHERE key IN (SELECT key FROM catalog_cache ORDER BY updated DESC LIMIT -1 OFFSET 1000)') }
  cacheClear(prefix = '') { this.db.prepare("DELETE FROM catalog_cache WHERE key LIKE ? AND key NOT LIKE 'lastfm:%'").run(prefix + '%') }
  listeningRows(){return this.db.prepare('SELECT * FROM listening ORDER BY day,target').all().map(r=>({...r,target:JSON.parse(String(r.target))}))}
  restorePersonal(values: Record<string,unknown>,stats?:{day:string;target:unknown;kind:string;title:string;subtitle:string;seconds:number;finished:number}[]) { if(this.resetComplete)throw Error('The application has been reset.');this.db.exec('BEGIN'); try { if(stats){this.db.exec("DELETE FROM listening; DELETE FROM kv WHERE key LIKE 'local-favorites:%' OR key LIKE 'local-playlists:%' OR key LIKE 'playlist-art:%' OR key LIKE 'lyrics-binding:%' OR key LIKE 'lyrics-identity:%' OR key LIKE 'lyric-offset:%'");for(const r of stats)this.db.prepare('INSERT INTO listening VALUES (?,?,?,?,?,?,?)').run(r.day,JSON.stringify(r.target),r.kind,r.title,r.subtitle,r.seconds,r.finished)}for (const [key,value] of Object.entries(values)) this.set(key,value); this.db.exec('COMMIT') } catch(error) { this.db.exec('ROLLBACK'); throw error } }
  entries(prefix:string):{key:string;value:unknown}[]{return this.db.prepare('SELECT key,value FROM kv WHERE key LIKE ?').all(prefix+'%').map(r=>({key:String(r.key),value:JSON.parse(String(r.value))}))}
  resetData(scope:'cache'|'personal'|'all'){
    this.db.exec('BEGIN');try{
      if(scope==='cache'||scope==='all')this.db.exec('DELETE FROM catalog_cache')
      if(scope==='all')this.db.exec('DELETE FROM kv; DELETE FROM servers; DELETE FROM listening')
      else if(scope==='cache')this.db.exec("DELETE FROM kv WHERE key LIKE 'metadata-v%:%' OR key LIKE 'local-index:%'")
      else {this.db.exec("DELETE FROM listening; DELETE FROM kv WHERE key IN ('history','queue','savedQueues','notes','listenLater','smartPlaylists') OR key LIKE 'lyrics-binding:%' OR key LIKE 'lyrics-identity:%' OR key LIKE 'lyric-offset:%' OR key LIKE 'local-favorites:%' OR key LIKE 'local-playlists:%' OR key LIKE 'playlist-art:%'")}
      this.db.exec('COMMIT');if(scope==='all')this.resetComplete=true
    }catch(e){this.db.exec('ROLLBACK');throw e}
  }
  recordListening(item: QueueItem, seconds: number, finished = false) {
    if(this.resetComplete)return
    const now = new Date(), day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    this.db.prepare('INSERT INTO listening VALUES (?,?,?,?,?,?,?) ON CONFLICT(day,target) DO UPDATE SET seconds=seconds+excluded.seconds,finished=MAX(finished,excluded.finished),title=excluded.title,subtitle=excluded.subtitle').run(day, JSON.stringify(item.target), item.target.kind, item.title, item.subtitle, Math.max(0, seconds), Number(finished))
  }
  listeningStats(): ListeningStats {
    const rows = this.db.prepare("SELECT day,SUM(seconds) seconds,SUM(CASE WHEN kind='music-track' THEN seconds ELSE 0 END) music,SUM(CASE WHEN kind='audiobook' THEN seconds ELSE 0 END) books,SUM(CASE WHEN kind='podcast-episode' THEN seconds ELSE 0 END) podcasts,SUM(CASE WHEN kind='local-file' THEN seconds ELSE 0 END) local FROM listening WHERE day >= date('now','localtime','-29 days') GROUP BY day ORDER BY day").all() as unknown as ListeningStats['days']
    const counts = this.db.prepare("SELECT COUNT(DISTINCT CASE WHEN kind='audiobook' AND finished=1 THEN target END) books,COUNT(DISTINCT CASE WHEN kind='podcast-episode' AND finished=1 THEN target END) episodes FROM listening").get()!
    const top = this.db.prepare('SELECT target,title,subtitle,SUM(seconds) seconds FROM listening GROUP BY target ORDER BY seconds DESC LIMIT 12').all() as unknown as (ListeningStats['top'][number]&{target:string})[]
    return { days: listeningDays(rows), totalSeconds: rows.reduce((n,r) => n+r.seconds,0), finishedBooks: Number(counts.books), finishedEpisodes: Number(counts.episodes), top:top.map(({target,...row})=>({...row,item:this.history().find(h=>JSON.stringify(h.item.target)===target)?.item??{target:JSON.parse(target),title:row.title,subtitle:row.subtitle}})) }
  }
  listeningRecap(input: RecapRange): ListeningRecap {
    const {start,end}=recapRangeSchema.parse(input), params=[start,end]
    const totals=this.db.prepare("SELECT COALESCE(SUM(seconds),0) seconds,COUNT(DISTINCT CASE WHEN seconds>0 THEN day END) days,COUNT(DISTINCT CASE WHEN seconds>0 THEN target END) items,COUNT(DISTINCT CASE WHEN kind='audiobook' AND finished=1 THEN target END) books,COUNT(DISTINCT CASE WHEN kind='podcast-episode' AND finished=1 THEN target END) episodes FROM listening WHERE day BETWEEN ? AND ?").get(...params)!
    const kinds=this.db.prepare('SELECT kind,SUM(seconds) seconds FROM listening WHERE day BETWEEN ? AND ? GROUP BY kind HAVING SUM(seconds)>0 ORDER BY seconds DESC,kind').all(...params) as unknown as ListeningRecap['kinds']
    const top=this.db.prepare('SELECT title,subtitle,kind,SUM(seconds) seconds FROM listening WHERE day BETWEEN ? AND ? GROUP BY target HAVING SUM(seconds)>0 ORDER BY seconds DESC,target LIMIT 5').all(...params) as unknown as ListeningRecap['top']
    const days=this.db.prepare('SELECT day,SUM(seconds) seconds FROM listening WHERE day BETWEEN ? AND ? GROUP BY day HAVING SUM(seconds)>0 ORDER BY day').all(...params) as unknown as ListeningRecap['days']
    const insights=recapInsights(start,end,days)
    const artistsFor=(a:string,b:string)=>this.db.prepare("SELECT subtitle name,SUM(seconds) seconds FROM listening WHERE day BETWEEN ? AND ? AND kind IN ('music-track','local-file') AND TRIM(subtitle)<>'' GROUP BY subtitle HAVING SUM(seconds)>0 ORDER BY seconds DESC,subtitle LIMIT 10").all(a,b) as unknown as ListeningRecap['artists']
    const prior=Number(this.db.prepare('SELECT COALESCE(SUM(seconds),0) seconds FROM listening WHERE day BETWEEN ? AND ?').get(insights.priorStart,insights.priorEnd)!.seconds)
    return {calendarDays:insights.calendarDays,longestStreak:insights.longestStreak,peakDay:insights.peakDay,averageSeconds:Number(totals.seconds)/insights.calendarDays,artists:artistsFor(start,end),comparison:{start:insights.priorStart,end:insights.priorEnd,totalSeconds:prior,changePercent:prior>0?(Number(totals.seconds)-prior)/prior*100:null,artists:artistsFor(insights.priorStart,insights.priorEnd)},start,end,totalSeconds:Number(totals.seconds),activeDays:Number(totals.days),uniqueItems:Number(totals.items),finishedBooks:Number(totals.books),finishedEpisodes:Number(totals.episodes),kinds,top,days}
  }
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
    if(this.resetComplete)throw Error('The application has been reset.')
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS credential encryption is unavailable. Credentials have not been saved.')
    const { secret, ...fields } = input; const config: Connection = { ...fields, id }
    this.db.prepare('INSERT INTO servers VALUES (?, ?, ?)').run(id, JSON.stringify(config), safeStorage.encryptString(secret))
    return config
  }
  removeConnection(id: string) { this.db.prepare('DELETE FROM servers WHERE id = ?').run(id) }
  settings(): Settings { return { mpvPath: this.get('mpvPath') ?? '', exclusive: this.get('exclusive') ?? false, audioDevice: this.get('audioDevice') ?? 'auto', connections: this.connections() } }
  close() { this.db.close() }
}
