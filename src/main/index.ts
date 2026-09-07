import { app, BrowserWindow, dialog, globalShortcut, ipcMain, session, Tray, Menu, nativeImage } from 'electron'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { Store } from './store'
import { Mpv } from './mpv'
import { Player } from './player'
import { Audiobookshelf } from './providers/audiobookshelf'
import { Navidrome } from './providers/navidrome'
import { serverUrl } from './providers/http'
import { LocalFiles } from './local'
import { registerFeatures, queueItemSchema } from './features'
import { autoUpdater } from 'electron-updater'
import { Updates } from './updates'
import { APP_VERSION } from '../shared/version'

let window: BrowserWindow | undefined
let store: Store
let player: Player
let quitting = false
let tray: Tray | undefined
const id = z.string().min(1).max(512)
const connectionSchema = z.object({ provider: z.enum(['navidrome', 'audiobookshelf']), name: z.string().trim().min(1).max(100), url: z.string().trim().url().max(2048), username: z.string().max(256), secret: z.string().min(1).max(8192) }).strict()
const librarySchema = z.object({ id, serverId: id, name: z.string(), kind: z.enum(['music', 'audiobooks', 'podcasts']) }).strict()
const commandSchema = z.union([
  z.object({ action: z.enum(['toggle', 'next', 'previous', 'stop', 'shuffle']) }).strict(),
  z.object({ action: z.literal('seek'), value: z.number().finite().min(0) }).strict(),
  z.object({ action: z.literal('speed'), value: z.number().finite().min(0.5).max(3) }).strict(),
  z.object({ action: z.literal('volume'), value: z.number().finite().min(0).max(100) }).strict(),
  z.object({ action: z.literal('sleep'), value: z.number().finite().min(0).max(240) }).strict(),
  z.object({ action: z.literal('repeat'), value: z.enum(['off', 'all', 'one']) }).strict()
])
function provider(id: string) { const { config, secret } = store.connection(id); return config.provider === 'navidrome' ? new Navidrome(config, secret) : new Audiobookshelf(config, secret) }
function handle<T extends z.ZodTypeAny>(channel: string, schema: T, action: (input: z.infer<T>) => unknown) {
  ipcMain.handle(channel, async (event, raw) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Untrusted desktop request.')
    const parsed = schema.safeParse(raw)
    if (!parsed.success) throw new Error('Invalid desktop request. Please check the entered values.')
    try { return await action(parsed.data) }
    catch (error) {
      if (error instanceof z.ZodError) throw new Error('The server response does not match the supported API format. Check the server version and selected library.')
      throw error instanceof Error ? error : new Error('The operation failed.')
    }
  })
}
function createWindow() {
  window = new BrowserWindow({ width: 1440, height: 940, minWidth: 1024, minHeight: 720, backgroundColor: '#121416', title: 'Media Center', show: process.env.MEDIA_CENTER_SMOKE !== '1', autoHideMenuBar: true, webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', event => event.preventDefault())
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
  window.on('closed', () => { window = undefined })
  window.on('close', event => { if (!quitting && store.preferences().closeToTray && tray) { event.preventDefault(); window?.hide() } })
}
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { if (window?.isMinimized()) window.restore(); window?.show(); window?.focus() })
  void app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
    session.defaultSession.setPermissionCheckHandler(() => false)
    store = new Store(join(app.getPath('userData'), 'media-center.sqlite'))
    const mpv = new Mpv(), local = new LocalFiles(store); player = new Player(mpv, store, provider, local)
    player.on('state', state => { if (window && !window.isDestroyed()) window.webContents.send('player:state', state) })
    registerFeatures(handle, store, player, local, provider, () => window!)
    const updates = new Updates(autoUpdater, app.isPackaged ? app.getVersion() : APP_VERSION, app.isPackaged && process.platform === 'win32', async () => { await player.command({ action: 'stop' }) })
    updates.on('state', state => { if (window && !window.isDestroyed()) window.webContents.send('updates:state', state) })
    handle('updates:get', z.undefined(), () => updates.state)
    handle('updates:check', z.undefined(), () => updates.check())
    handle('updates:download', z.undefined(), () => updates.download())
    handle('updates:install', z.undefined(), () => updates.install())
    handle('settings:get', z.undefined(), () => store.settings())
    handle('connections:save', connectionSchema, async input => {
      serverUrl(input.url, '')
      if (input.provider === 'navidrome' && !input.username.trim()) throw new Error('Enter your Navidrome username.')
      const config = { ...input, id: randomUUID() }
      const p = input.provider === 'navidrome' ? new Navidrome(config, input.secret) : new Audiobookshelf(config, input.secret)
      await p.test()
      return store.saveConnection(input, config.id)
    })
    handle('connections:remove', id, async id => { if (player.state.queue.some(q => q.target.serverId === id)) await player.command({ action: 'stop' }); store.removeConnection(id) })
    handle('settings:mpv', z.undefined(), async () => {
      const result = await dialog.showOpenDialog(window!, { title: 'Choose your MPV executable', properties: ['openFile'], filters: process.platform === 'win32' ? [{ name: 'MPV executable', extensions: ['exe'] }] : [] })
      if (result.canceled || !result.filePaths[0]) return null
      const path = result.filePaths[0]
      if (process.platform === 'win32' && extname(path).toLowerCase() !== '.exe') throw new Error('Choose an .exe file.')
      await player.command({ action: 'stop' }); await mpv.start(path); store.set('mpvPath', path); return path
    })
    handle('settings:audio', z.object({ exclusive: z.boolean(), audioDevice: z.string().min(1).max(1024) }).strict(), input => { store.set('exclusive', input.exclusive); store.set('audioDevice', input.audioDevice) })
    handle('audio:devices', z.undefined(), async () => { await mpv.start(store.settings().mpvPath); return z.array(z.object({ name: z.string(), description: z.string() })).parse(await mpv.command(['get_property', 'audio-device-list'])) })
    handle('libraries:list', z.undefined(), async () => {
      const connections = store.connections()
      const results = await Promise.allSettled(connections.map(c => provider(c.id).libraries()))
      return { libraries: results.flatMap(r => r.status === 'fulfilled' ? r.value : []), errors: results.flatMap((r, i) => r.status === 'rejected' ? [`${connections[i].name}: Could not load libraries. Check the server connection and permissions.`] : []) }
    })
    handle('library:browse', z.object({ library: librarySchema, page: z.number().int().min(0).max(100000), search: z.string().max(500) }).strict(), input => provider(input.library.serverId).browse(input.library, input.page, input.search))
    handle('item:detail', z.object({ serverId: id, itemId: id }).strict(), async input => {
      const p = provider(input.serverId)
      if (p instanceof Navidrome) return p.detail(input.itemId)
      const item = await p.detail(input.itemId); return item.kind === 'audiobook' ? { kind: 'audiobook', item } : { kind: 'podcast-show', item }
    })
    handle('item:cover', z.object({ serverId: id, itemId: id }).strict(), input => provider(input.serverId).cover(input.itemId))
    handle('player:play', z.object({ queue: z.array(queueItemSchema).min(1).max(5000), index: z.number().int().min(0), position: z.number().finite().min(0).optional() }).strict(), async input => { if (input.index >= input.queue.length) throw new Error('Queue position is out of bounds.'); await player.play(input.queue, input.index, input.position) })
    handle('player:command', commandSchema, input => player.command(input))
    handle('player:get', z.undefined(), () => player.state)
    for (const [key, action] of [['MediaPlayPause', 'toggle'], ['MediaNextTrack', 'next'], ['MediaPreviousTrack', 'previous'], ['MediaStop', 'stop']] as const) globalShortcut.register(key, () => { void player.command({ action }).catch(() => {}) })
    createWindow()
    const icon = nativeImage.createFromPath(app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(app.getAppPath(), 'build/icon.ico'))
    if (!icon.isEmpty()) {
      tray = new Tray(icon); tray.setToolTip('Media Center')
      const show = () => { if (!window) createWindow(); window?.show(); window?.focus() }
      tray.on('double-click', show)
      tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open Media Center', click: show }, { label: 'Play / pause', click: () => { void player.command({ action: 'toggle' }).catch(() => {}) } }, { label: 'Next', click: () => { void player.command({ action: 'next' }).catch(() => {}) } }, { type: 'separator' }, { label: 'Quit', click: () => app.quit() }]))
    }
    app.on('activate', () => { if (!window) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
  app.on('before-quit', event => {
    if (quitting || !player) return
    event.preventDefault(); quitting = true; globalShortcut.unregisterAll(); tray?.destroy(); tray = undefined
    void player.shutdown().catch(() => {}).finally(() => { store.close(); app.quit() })
  })
}
