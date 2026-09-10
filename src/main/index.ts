import {registerPodcastDiscovery} from './podcast-discovery'
import {registerStudio} from './studio'
import {outputSchema} from './studio-preferences'
import {UndoJournal} from './undo'
import {WindowsMedia} from './windows-media'
import {PodcastAutomation} from './podcast-automation'
import {registerExperience} from './experience'
import {LocalWatcher} from './local-watch'
import {experienceSchema} from '../shared/experience'
import { readThemeCss } from './custom-css'
import { LyricsClient } from './lyrics'
import { progressKey } from '../shared/timeline'
import type { LyricsResult } from '../shared/lyrics'
import { app, BrowserWindow, dialog, globalShortcut, ipcMain, session, Tray, Menu, nativeImage, shell } from 'electron'
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
import { registerFeatures, queueItemSchema, preferenceSchema } from './features'
import { autoUpdater } from 'electron-updater'
import { Updates } from './updates'
import { APP_VERSION } from '../shared/version'
import { Downloads } from './downloads'
import { registerDaily } from './daily'
import { DiscordPresence, registerDiscord } from './discord'

let window: BrowserWindow | undefined
let miniWindow: BrowserWindow | undefined
let downloads: Downloads
let discord: DiscordPresence
let store: Store
let player: Player
let windowsMedia:WindowsMedia|undefined,podcastAutomation:PodcastAutomation|undefined
let localWatcher:LocalWatcher|undefined
let resetting=false
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
    const owner = [window, miniWindow].find(w => w && !w.isDestroyed() && event.sender === w.webContents && event.senderFrame === w.webContents.mainFrame)
    if (!owner || (owner === miniWindow && !['player:get','player:command','player:seek','item:cover','local:cover','preferences:get','experience:get','mini:command','mini:get'].includes(channel))) throw new Error('Untrusted desktop request.')
    if(resetting)throw Error('The application is resetting.')
    const parsed = schema.safeParse(raw)
    if (!parsed.success) throw new Error('Invalid desktop request. Please check the entered values.')
    try { const result=await action(parsed.data);if(channel==='backup:restore'){localWatcher?.refresh();for(const w of [window,miniWindow])if(w&&!w.isDestroyed())w.webContents.send('experience:state',experienceSchema.parse(store.get('experience')??{}))}if(channel==='preferences:save'||channel==='backup:restore')for(const w of [window,miniWindow])if(w&&!w.isDestroyed())w.webContents.send('theme:state',store.preferences());return result }
    catch (error) {
      if (error instanceof z.ZodError) throw new Error('The server response does not match the supported API format. Check the server version and selected library.')
      throw error instanceof Error ? error : new Error('The operation failed.')
    }
  })
}
function createWindow() {
  window = new BrowserWindow({ width: 1440, height: 940, minWidth: 1024, minHeight: 720, frame: false, backgroundColor: '#121416', title: 'Media Center', show: process.env.MEDIA_CENTER_SMOKE !== '1', autoHideMenuBar: true, webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } })
  window.removeMenu()
  // On Windows, fullscreen events fire before Electron updates isFullScreen().
  const publishWindowState=()=>setImmediate(()=>{if(window&&!window.isDestroyed())window.webContents.send('window:state',windowState())})
  window.on('maximize',publishWindowState).on('unmaximize',publishWindowState).on('enter-full-screen',publishWindowState).on('leave-full-screen',publishWindowState).on('focus',publishWindowState).on('blur',publishWindowState)
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return
    if (input.key === 'F11') { event.preventDefault(); window?.setFullScreen(!window.isFullScreen()) }
    if (input.key === 'Escape' && window?.isFullScreen()) { event.preventDefault(); window.setFullScreen(false) }
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', event => event.preventDefault())
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
  window.on('closed', () => { window = undefined })
  window.on('close', event => { if (!quitting && store.preferences().closeToTray && tray) { event.preventDefault(); window?.hide() } })
}
function windowState() {
  return {maximized:window?.isMaximized()??false,fullscreen:window?.isFullScreen()??false,focused:window?.isFocused()??false}
}
function createMini() {
  if (miniWindow && !miniWindow.isDestroyed()) { miniWindow.show();return }
  miniWindow = new BrowserWindow({width:440,height:200,minWidth:360,minHeight:190,maxHeight:260,frame:false,alwaysOnTop:true,backgroundColor:'#121416',title:'Media Center mini player',autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'../preload/index.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}})
  // Explicit Windows level avoids the floating level's taskbar repositioning clearing topmost.
  miniWindow.setAlwaysOnTop(store.get<boolean>('miniPinned')??true,process.platform==='win32'?'normal':'floating')
  miniWindow.on('always-on-top-changed',()=>{if(miniWindow&&!miniWindow.isDestroyed())miniWindow.webContents.send('mini:state',{pinned:miniWindow.isAlwaysOnTop()})})
  miniWindow.on('show',()=>miniWindow?.setAlwaysOnTop(store.get<boolean>('miniPinned')??true,process.platform==='win32'?'normal':'floating'))
  miniWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));miniWindow.webContents.on('will-navigate',e=>e.preventDefault());miniWindow.on('closed',()=>{miniWindow=undefined})
  if(!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {const url=new URL(process.env.ELECTRON_RENDERER_URL);url.searchParams.set('mini','1');void miniWindow.loadURL(url.href)} else void miniWindow.loadFile(join(__dirname,'../renderer/index.html'),{query:{mini:'1'}})
}
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { void app.whenReady().then(()=>{if(!window)createWindow();if (window?.isMinimized()) window.restore(); window?.show(); window?.focus()}) })
  void app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
    session.defaultSession.setPermissionCheckHandler(() => false)
    store = new Store(join(app.getPath('userData'), 'media-center.sqlite'))
    const mpv = new Mpv(), local = new LocalFiles(store); downloads = new Downloads(join(app.getPath('userData'),'downloads'),store,provider); player = new Player(mpv, store, provider, local, downloads)
    player.on('state', state => { for(const w of [window,miniWindow]) if(w && !w.isDestroyed()) w.webContents.send('player:state',state) })
    downloads.on('state',state=>{if(window && !window.isDestroyed()) window.webContents.send('downloads:state',state)})
    const lyrics=new LyricsClient(store)
    const lyricTarget=(key:string)=>{
      const target=player.state.queue[player.state.queueIndex]?.target
      if(!target||!['music-track','local-file'].includes(target.kind)||progressKey(target)!==key)throw new Error('The playing track changed. Open lyrics for the current song.')
    }
    const lyricKey=z.string().min(1).max(10000)
    handle('lyrics:search',z.object({key:lyricKey,query:z.string().trim().min(2).max(300)}).strict(),async i=>{lyricTarget(i.key);const results=await lyrics.search(i.query);lyricTarget(i.key);return results})
    handle('lyrics:bind',z.object({key:lyricKey,id:z.number().int().positive().safe()}).strict(),async i=>{lyricTarget(i.key);const record=await lyrics.get(i.id);lyricTarget(i.key);if(record.status==='missing')throw new Error('This result contains no lyrics. Choose another result.');lyrics.save(i.key,record)})
    handle('lyrics:clear',z.object({key:lyricKey}).strict(),i=>{lyricTarget(i.key);lyrics.clear(i.key)})
    handle('lyrics:get',z.object({refresh:z.boolean().optional()}).strict(),async i=>{
      const item=player.state.queue[player.state.queueIndex],target=item?.target
      const key=target?progressKey(target):'',base={key,title:item?.title??'',artist:item?.subtitle??'',plain:'',lines:[]}
      if(!target||!['music-track','local-file'].includes(target.kind))return {...base,status:'unsupported'} satisfies LyricsResult
      const binding=lyrics.saved(key)
      if(binding)return {...binding,key,saved:true,recordId:binding.id} satisfies LyricsResult
      let signature
      if(target.kind==='music-track'){
        const p=provider(target.serverId);if(!(p instanceof Navidrome))throw new Error('Choose a music source.')
        const metadataKey='lyrics-metadata:'+key
        try{const track=await p.track(target.trackId);signature={title:track.title,artist:track.artist,album:track.album,duration:track.duration};store.cacheSet(metadataKey,signature)}catch(e){const saved=store.cache<import('../shared/lyrics').LyricsSignature>(metadataKey);if(!saved)throw e;signature=saved.value}
      }else if(target.kind==='local-file'){
        const file=await local.metadata(target.rootId,target.fileId);signature={title:file.title,artist:file.artist,album:file.album,duration:file.duration}
      }else return {...base,status:'unsupported'} satisfies LyricsResult
      if(!signature.title.trim()||!signature.artist.trim())throw new Error('Track title and artist tags are needed to find lyrics.')
      lyricTarget(key)
      const content=await lyrics.lookup(signature,!!i.refresh);lyricTarget(key)
      const saved=lyrics.saved(key)
      return saved?{...saved,key,saved:true,recordId:saved.id}:{...base,title:signature.title,artist:signature.artist,...content} satisfies LyricsResult
    })
    handle('lyrics:seek',z.object({key:z.string().max(10000),time:z.number().finite().nonnegative()}).strict(),async i=>{
      const target=player.state.queue[player.state.queueIndex]?.target
      if(!target||!['music-track','local-file'].includes(target.kind)||progressKey(target)!==i.key)throw new Error('The playing track changed.')
      if(i.time>player.state.duration||!['playing','paused'].includes(player.state.status))throw new Error('This lyric position is not available for playback.')
      await player.command({action:'seek',value:i.time})
    })
    const undo=new UndoJournal(state=>{if(window&&!window.isDestroyed())window.webContents.send('undo:state',state)})
    handle('undo:get',z.undefined(),()=>undo.snapshot());handle('undo:apply',z.undefined(),()=>undo.undo())
    const localIndex=registerFeatures(handle, store, player, local, provider, () => window!,undo)
    const daily=registerDaily(handle,store,player,downloads,provider,()=>window!,undo)
    const experienceChanged=()=>{localWatcher?.refresh();for(const w of [window,miniWindow])if(w&&!w.isDestroyed())w.webContents.send('experience:state',experienceSchema.parse(store.get('experience')??{}))}
    registerExperience(handle,store,player,downloads,local,localIndex,provider,()=>window!,()=>daily.inbox(),experienceChanged,async()=>{
      undo.clear();resetting=true;try{podcastAutomation?.stop();await player.command({action:'stop'});await player.edit({action:'clear'});const result=await downloads.batch(downloads.snapshot().entries.map(e=>e.id),'remove');if(result.failed.length)throw Error('Some downloads are in use. Close other players and try again.');localWatcher?.stop();windowsMedia?.stop();discord.stop();await downloads.stop();await player.shutdown();await session.defaultSession.clearCache();await session.defaultSession.clearStorageData();store.resetData('all');setTimeout(()=>{app.relaunch();app.exit(0)},150)}catch(e){resetting=false;throw e}
    },undo)
    registerPodcastDiscovery(handle,store,provider,()=>window!)
    registerStudio(handle,store,player,local,localIndex,lyrics,provider,()=>window!,()=>{for(const w of [window,miniWindow])if(w&&!w.isDestroyed()){w.webContents.send('theme:state',store.preferences());w.webContents.send('studio:changed')}},()=>downloads.snapshot().entries.length)
    localWatcher=new LocalWatcher(local,localIndex,store,experienceChanged)
    podcastAutomation=new PodcastAutomation(store,downloads,player,()=>daily.inbox(true))
    discord=new DiscordPresence(store,player,provider,local);registerDiscord(handle,discord)
    handle('mini:get',z.undefined(),()=>({pinned:miniWindow?.isAlwaysOnTop()??false}))
    handle('mini:command',z.object({action:z.enum(['open','close','main','pin']),pinned:z.boolean().optional()}).strict(),i=>{
      if(i.action==='open')createMini()
      else if(i.action==='close')miniWindow?.close()
      else if(i.action==='pin'){
        if(!miniWindow||miniWindow.isDestroyed())throw new Error('Open the mini player first.')
        const pinned=i.pinned??true
        miniWindow.setAlwaysOnTop(pinned,process.platform==='win32'?'normal':'floating')
        if(miniWindow.isAlwaysOnTop()!==pinned)throw new Error('Windows could not change the pin state. Try again.')
        store.set('miniPinned',pinned)
      }else {if(!window)createWindow();window?.show();window?.focus()}
      return {pinned:miniWindow?.isAlwaysOnTop()??false}
    })
    const updates = new Updates(autoUpdater, app.isPackaged ? app.getVersion() : APP_VERSION, app.isPackaged && process.platform === 'win32', async () => { await player.command({ action: 'stop' }) })
    updates.on('state', state => { if (window && !window.isDestroyed()) window.webContents.send('updates:state', state) })
    handle('release:news',z.enum(['get','seen','changelog']),async action=>{if(action==='seen')store.set('release-seen',app.getVersion());if(action==='changelog')await shell.openExternal('https://github.com/creativekamrul/media-center/blob/main/CHANGELOG.md');return {version:app.getVersion(),unread:store.get('release-seen')!==app.getVersion()}})
    handle('updates:get', z.undefined(), () => updates.state)
    handle('updates:check', z.undefined(), () => updates.check())
    handle('updates:download', z.undefined(), () => updates.download())
    handle('updates:install', z.undefined(), () => updates.install())
    handle('window:fullscreen', z.enum(['toggle','exit']), action => { if(window && !window.isDestroyed()) window.setFullScreen(action === 'toggle' ? !window.isFullScreen() : false) })
    handle('window:controls',z.enum(['get','minimize','maximize','close']),action=>{
      if(window&&!window.isDestroyed()){
        if(action==='minimize')window.minimize()
        if(action==='maximize'&&!window.isFullScreen()){if(window.isMaximized())window.unmaximize();else window.maximize()}
        if(action==='close')window.close()
      }
      return windowState()
    })
    handle('theme:preview', preferenceSchema.nullable(), prefs => { if(miniWindow && !miniWindow.isDestroyed()) miniWindow.webContents.send('theme:state', prefs ?? store.preferences()) })
    handle('theme:import-css', z.undefined(), async () => {
      const result = await dialog.showOpenDialog(window!, {title:'Import custom theme CSS', filters:[{name:'CSS theme', extensions:['css']}], properties:['openFile']})
      return result.canceled || !result.filePaths[0] ? null : readThemeCss(result.filePaths[0])
    })
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
    handle('settings:audio', z.object({ exclusive: z.boolean(), audioDevice: z.string().min(1).max(1024) }).strict(), async input => {const oldDevice=store.settings().audioDevice;if(store.get('output-profile:'+oldDevice))store.set('output-profile:'+oldDevice,{volume:player.state.volume,equalizer:store.preferences().equalizer});store.set('exclusive', input.exclusive); store.set('audioDevice', input.audioDevice);const saved=outputSchema.nullish().parse(store.get('output-profile:'+input.audioDevice));if(saved){store.set('preferences',{...store.preferences(),equalizer:saved.equalizer});await player.command({action:'volume',value:saved.volume});for(const w of [window,miniWindow])if(w&&!w.isDestroyed())w.webContents.send('theme:state',store.preferences())} })
    handle('audio:devices', z.undefined(), async () => { await mpv.start(store.settings().mpvPath); return z.array(z.object({ name: z.string(), description: z.string() })).parse(await mpv.command(['get_property', 'audio-device-list'])) })
    handle('libraries:list', z.undefined(), async () => {
      store.cacheClear('music:')
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
    handle('item:cover', z.object({ serverId: id, itemId: id }).strict(), input => downloads.cover(input.serverId,input.itemId) ?? provider(input.serverId).cover(input.itemId))
    handle('player:play', z.object({ queue: z.array(queueItemSchema).min(1).max(5000), index: z.number().int().min(0), position: z.number().finite().min(0).optional() }).strict(), async input => { if (input.index >= input.queue.length) throw new Error('Queue position is out of bounds.'); await player.play(input.queue, input.index, input.position) })
    handle('player:command', commandSchema, input => player.command(input))
    handle('player:seek',z.object({key:z.string().max(10000),queueIndex:z.number().int().min(0).max(4999),time:z.number().finite().nonnegative()}).strict(), i=>player.seekTo(i))
    handle('player:get', z.undefined(), () => player.state)
    const mediaKeys=[['MediaPlayPause','toggle'],['MediaNextTrack','next'],['MediaPreviousTrack','previous'],['MediaStop','stop']] as const
    const mediaAvailable=(ready:boolean)=>{for(const [key,action]of mediaKeys){globalShortcut.unregister(key);if(!ready)globalShortcut.register(key,()=>{void player.command({action}).catch(()=>{})})}}
    mediaAvailable(false)
    windowsMedia=new WindowsMedia(player,async item=>{const t=item.target;if(t.kind==='local-file')return local.cover(t.rootId,t.fileId);const id=item.cover??(t.kind==='music-track'?t.trackId:t.kind==='audiobook'?t.bookId:t.kind==='podcast-episode'?t.showId:'');return id?downloads.cover(t.serverId,id)??await provider(t.serverId).cover(id):null},mediaAvailable)
    createWindow()
    const icon = nativeImage.createFromPath(app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(__dirname, '../../build/icon.ico'))
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
    event.preventDefault(); quitting = true; windowsMedia?.stop();podcastAutomation?.stop();localWatcher?.stop(); discord?.stop(); globalShortcut.unregisterAll(); tray?.destroy(); tray = undefined
    void Promise.allSettled([player.shutdown(),downloads.stop()]).finally(() => { store.close(); app.quit() })
  })
}
