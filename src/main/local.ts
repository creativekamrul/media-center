import { realpath, readdir, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { LocalRoot, LocalFile, LocalFolder } from '../shared/types'
import type { Store } from './store'

const audio = new Set(['.mp3', '.flac', '.wav', '.wave', '.m4a', '.m4b', '.aac', '.ogg', '.opus', '.aiff', '.aif', '.ape', '.alac', '.wma', '.dsf', '.dff', '.wv', '.mka', '.ac3'])
export function within(root: string, path: string) { const rel = relative(root, path); return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`)) }
export class LocalFiles {
  constructor(private store: Store) {}
  roots(): LocalRoot[] { return this.store.get<LocalRoot[]>('localRoots') ?? [] }
  async add(path: string) { const canonical = await realpath(path); if (!(await stat(canonical)).isDirectory()) throw new Error('Choose a folder.'); const roots = this.roots(), existing = roots.find(r => r.path === canonical); if (existing) return existing; const root = { id: randomUUID(), name: basename(canonical) || canonical, path: canonical }; this.store.set('localRoots', [...roots, root]); return root }
  remove(id: string) { this.store.set('localRoots', this.roots().filter(r => r.id !== id)) }
  async path(rootId: string, file: string, requireAudio = true): Promise<string> {
    const root = this.roots().find(r => r.id === rootId); if (!root) throw new Error('This local folder has been removed.')
    if (isAbsolute(file) || file.includes('\0') || file.includes(':')) throw new Error('Invalid local file path.')
    const rootPath = await realpath(root.path), candidate = resolve(rootPath, file)
    if (!within(rootPath, candidate)) throw new Error('File is outside the selected folder.')
    const path = await realpath(candidate)
    if (!within(rootPath, path)) throw new Error('Folder links outside the selected root are not followed.')
    if (requireAudio && (!audio.has(extname(path).toLowerCase()) || !(await stat(path)).isFile())) throw new Error('Choose a supported audio file.')
    return path
  }
  async metadata(rootId: string, fileId: string): Promise<LocalFile> {
    const path = await this.path(rootId, fileId), info = await stat(path), key = `metadata-v2:${rootId}:${fileId}`
    const cached = this.store.get<LocalFile>(key); if (cached && cached.size === info.size && cached.modified === info.mtimeMs) return cached
    const file: LocalFile = { id: fileId, name: basename(path), title: basename(path, extname(path)), artist: '', album: '', duration: 0, size: info.size, modified: info.mtimeMs, hasCover: false }
    try {
      const { parseFile } = await import('music-metadata')
      const { common, format } = await parseFile(path, { duration: true, skipCovers: true })
      Object.assign(file, { title: common.title || file.title, artist: common.artist || common.artists?.join(', ') || '', album: common.album || '', duration: format.duration || 0, codec: format.codec || format.container, sampleRate: format.sampleRate, bitDepth: format.bitsPerSample, bitRate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined, year: common.year, albumArtist:common.albumartist, genre:common.genre?.join(', '), discNumber:common.disk.no ?? undefined, trackNumber: common.track.no ?? undefined, hasCover: !!common.picture?.length })
    } catch { file.error = 'Tags could not be read. MPV can still try playback.' }
    this.store.set(key, file); return file
  }
  async browse(rootId: string, folder: string): Promise<LocalFolder> {
    const path = await this.path(rootId, folder, false), root = this.roots().find(r => r.id === rootId)!
    const result: LocalFolder = { rootId, folder, folders: [], files: [], warnings: [] }
    const entries = await readdir(path, { withFileTypes: true })
    // Bound concurrent metadata work. No recursive indexing or complete-file buffering.
    for (let i = 0; i < entries.length; i += 6) await Promise.all(entries.slice(i, i + 6).map(async entry => {
      const fileId = relative(root.path, resolve(path, entry.name))
      try {
        if (entry.isDirectory() || entry.isSymbolicLink()) { const target = await this.path(rootId, fileId, false); if ((await stat(target)).isDirectory()) { result.folders.push({ id: fileId, name: entry.name }); return } }
        if (audio.has(extname(entry.name).toLowerCase())) result.files.push(await this.metadata(rootId, fileId))
      } catch { result.warnings.push(`Could not access ${entry.name}.`) }
    }))
    result.folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); result.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); return result
  }
  async cover(rootId: string, fileId: string): Promise<string | null> {
    const { parseFile } = await import('music-metadata'), data = await parseFile(await this.path(rootId, fileId), { duration: false })
    const picture = data.common.picture?.find(p => ['image/jpeg', 'image/png', 'image/webp'].includes(p.format) && p.data.length <= 5 * 1024 * 1024)
    return picture ? `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}` : null
  }
}
