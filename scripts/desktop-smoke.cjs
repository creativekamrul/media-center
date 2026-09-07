const { _electron: electron } = require('playwright')
const { mkdirSync, writeFileSync, existsSync } = require('node:fs')
const { resolve } = require('node:path')
const { createServer } = require('node:http')
const assert = require('node:assert/strict')

async function main() {
  const artifacts = resolve('artifacts'); mkdirSync(artifacts, { recursive: true })
  const requests = []
  const audioRequests = []
  const syncRequests = []
  const mpvPath = process.env.MPV_TEST_PATH
  function serveWav(req, res, seconds) {
    // Virtual 24-bit/96 kHz stereo WAV. No full-file allocation, even for 300+ MB files.
    const dataSize = seconds * 96000 * 2 * 3, length = dataSize + 44
    const header = Buffer.alloc(44)
    header.write('RIFF'); header.writeUInt32LE(length - 8, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22); header.writeUInt32LE(96000, 24); header.writeUInt32LE(576000, 28); header.writeUInt16LE(6, 32); header.writeUInt16LE(24, 34); header.write('data', 36); header.writeUInt32LE(dataSize, 40)
    const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '')
    let cursor = range ? Number(range[1]) : 0; const end = Math.min(length - 1, range?.[2] ? Number(range[2]) : length - 1)
    if (cursor >= length || cursor > end) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${length}`); return res.end() }
    audioRequests.push({ path: req.url, range: req.headers.range, length })
    res.statusCode = range ? 206 : 200; res.setHeader('Content-Type', 'audio/wav'); res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Content-Length', end - cursor + 1)
    if (range) res.setHeader('Content-Range', `bytes ${cursor}-${end}/${length}`)
    if (req.method === 'HEAD') return res.end()
    const zeros = Buffer.alloc(65536)
    function pump() {
      while (!res.destroyed && cursor <= end) {
        const chunk = cursor < 44 ? header.subarray(cursor, Math.min(44, end + 1)) : zeros.subarray(0, Math.min(zeros.length, end - cursor + 1))
        cursor += chunk.length
        if (!res.write(chunk)) { res.once('drain', pump); return }
      }
      if (!res.destroyed) res.end()
    }
    pump()
  }
  const book = { id: 'book-one', libraryId: 'books', mediaType: 'book', media: { metadata: { title: 'The Test Book', authors: [{ name: 'Test Author' }], narrators: ['Test Narrator'] }, duration: 1000, tracks: [{ index: 1, title: 'Part One', startOffset: 0, duration: 400 }, { index: 2, title: 'Part Two', startOffset: 400, duration: 600 }], chapters: [{ id: 0, title: 'Opening chapter', start: 0, end: 200 }, { id: 1, title: 'Across the files', start: 200, end: 800 }, { id: 2, title: 'Closing chapter', start: 800, end: 1000 }] } }
  const podcast = { id: 'show-one', libraryId: 'podcasts', mediaType: 'podcast', media: { metadata: { title: 'The Test Podcast', author: 'Test Host' }, numEpisodes: 2, episodes: [{ id: 'episode-one', title: 'First independent episode', publishedAt: 1700000000000, audioFile: { duration: 1200 } }, { id: 'episode-two', title: 'Second independent episode', publishedAt: 1700100000000, audioFile: { duration: 800 } }] } }
  const fixtureSong = { id: 'song', title: 'Original Audio', artist: 'Test Artist', album: 'The Test Album', duration: 600, suffix: 'wav', samplingRate: 96000, bitDepth: 24 }
  let playlists = [], progress = [{ libraryItemId: 'book-one', currentTime: 450, duration: 1000, progress: .45 }, { libraryItemId: 'show-one', episodeId: 'episode-one', currentTime: 20, duration: 1200, progress: 20/1200 }, { libraryItemId: 'show-one', episodeId: 'episode-two', currentTime: 800, duration: 800, progress: 1, isFinished: true }], bookmarks = []
  const mutations = []
  const server = createServer(async (req, res) => {
    requests.push(req.url)
    const url = new URL(req.url, 'http://localhost')
    res.setHeader('Content-Type', 'application/json')
    if (url.pathname.startsWith('/rest/')) {
      if (!url.searchParams.get('t') || url.searchParams.has('p')) { res.statusCode = 401; return res.end('{}') }
      if (url.pathname.includes('stream.view')) return serveWav(req, res, 600)
      const data = { status: 'ok', version: '1.16.1' }
      let form = url.searchParams
      if (req.method === 'POST') { let body = ''; for await (const chunk of req) body += chunk; form = new URLSearchParams(body); mutations.push({ path: url.pathname, fields: Object.fromEntries(form), songs: form.getAll('songId') }) }
      if (url.pathname.includes('getPlaylists')) data.playlists = { playlist: playlists }
      if (url.pathname.includes('getPlaylist.view')) data.playlist = playlists.find(p => p.id === form.get('id'))
      if (url.pathname.includes('createPlaylist')) { let p = playlists.find(p => p.id === form.get('playlistId')); if (!p) { p = { id: 'playlist-' + (playlists.length+1), name: form.get('name'), comment: '', public: false, owner: 'test-user', readonly: false }; playlists.push(p) }; p.entry = form.getAll('songId').map(id => ({ ...fixtureSong, id })); p.songCount = p.entry.length; p.duration = p.songCount*600; data.playlist = p }
      if (url.pathname.includes('updatePlaylist')) { const p = playlists.find(p => p.id === form.get('playlistId')); if (p) Object.assign(p, { name: form.get('name'), comment: form.get('comment'), public: form.get('public') === 'true' }) }
      if (url.pathname.includes('deletePlaylist')) playlists = playlists.filter(p => p.id !== form.get('id'))
      if (url.pathname.includes('getArtists')) data.artists = { index: [{ artist: [{ id: 'artist', name: 'Test Artist', albumCount: 1 }] }] }
      if (url.pathname.includes('getArtist.view')) data.artist = { id: 'artist', name: 'Test Artist', albumCount: 1, album: [{ id: 'album', name: 'The Test Album', artist: 'Test Artist' }] }
      if (url.pathname.includes('getStarred2')) data.starred2 = { song: [{ ...fixtureSong, starred: '2026-01-01' }] }
      if (url.pathname.includes('getGenres')) data.genres = { genre: [{ value: 'Jazz', songCount: 1, albumCount: 1 }] }
      if (url.pathname.includes('getInternetRadioStations')) data.internetRadioStations = { internetRadioStation: [] }
      if (url.pathname.includes('getMusicFolders')) data.musicFolders = { musicFolder: [{ id: '1', name: 'Test Music' }] }
      if (url.pathname.includes('getAlbumList2') || url.pathname.includes('search3')) data[url.pathname.includes('search3') ? 'searchResult3' : 'albumList2'] = { album: [...Array.from({length:24},(_,i)=>({id:'archive-'+i,name:'Archive recording '+(i+1),artist:'Fixture Artist',songCount:1,year:2025})), { id: 'album', name: 'The Test Album', artist: 'Test Artist', songCount: 1, year: 2026 }] }
      if (url.pathname.includes('getAlbum.view')) data.album = { id: 'album', name: 'The Test Album', artist: 'Test Artist', songCount: 1, song: [{ id: 'song', title: 'Original Audio', artist: 'Test Artist', duration: 300, suffix: 'flac', samplingRate: 96000, bitDepth: 24 }] }
      if (url.pathname.includes('getSong.view')) data.song = { id: 'song', title: 'Original Audio', artist: 'Test Artist', album: 'The Test Album', duration: 600, suffix: 'wav', samplingRate: 96000, bitDepth: 24 }
      return res.end(JSON.stringify({ 'subsonic-response': data }))
    }
    if (req.headers.authorization !== 'Bearer test-token') { res.statusCode = 401; return res.end('{}') }
    if (url.pathname === '/api/items/offline-book') return res.end(JSON.stringify({id:'offline-book',libraryId:'books',mediaType:'book',media:{metadata:{title:'Offline book'},duration:9,chapters:[{id:0,title:'Across both files',start:2,end:7}],tracks:[{index:1,ino:'part-a',duration:4,startOffset:0},{index:2,ino:'part-b',duration:5,startOffset:4}]}}))
    if (url.pathname === '/api/items/offline-show') return res.end(JSON.stringify({id:'offline-show',libraryId:'podcasts',mediaType:'podcast',media:{metadata:{title:'Offline show'},episodes:[{id:'offline-episode',title:'Offline episode',audioFile:{ino:'episode-a',duration:8}}]}}))
    if (url.pathname === '/api/items/offline-book/file/part-a/download')return serveWav(req,res,4)
    if (url.pathname === '/api/items/offline-book/file/part-b/download')return serveWav(req,res,5)
    if (url.pathname === '/api/items/offline-show/file/episode-a/download')return serveWav(req,res,8)
    if (url.pathname === '/audio/a.wav') return serveWav(req, res, 400)
    if (url.pathname === '/audio/b.wav') return serveWav(req, res, 600)
    if (url.pathname === '/audio/episode.wav') return serveWav(req, res, 1200)
    if (url.pathname === '/api/items/book-one/play') return res.end(JSON.stringify({ id: 'book-session', duration: 1000, currentTime: 450, playMethod: 0, audioTracks: [{ index: 1, title: 'A', startOffset: 0, duration: 400, contentUrl: '/audio/a.wav' }, { index: 2, title: 'B', startOffset: 400, duration: 600, contentUrl: '/audio/b.wav' }] }))
    if (url.pathname === '/api/items/show-one/play/episode-one') return res.end(JSON.stringify({ id: 'episode-session', duration: 1200, currentTime: 20, playMethod: 0, audioTracks: [{ index: 1, title: 'Episode', startOffset: 0, duration: 1200, contentUrl: '/audio/episode.wav' }] }))
    if (/^\/api\/session\/[^/]+\/(sync|close)$/.test(url.pathname)) { let body = ''; req.on('data', chunk => { body += chunk }); req.on('end', () => { syncRequests.push({ path: url.pathname, ...JSON.parse(body) }); res.end('{}') }); return }
    if (url.pathname === '/api/me/items-in-progress') return res.end(JSON.stringify({ libraryItems: [book, { ...podcast, recentEpisode: podcast.media.episodes[0] }] }))
    if (url.pathname === '/api/me') return res.end(JSON.stringify({ id: 'test-user', mediaProgress: progress, bookmarks }))
    if (url.pathname.startsWith('/api/me/progress/') && req.method === 'PATCH') { let body = ''; for await (const chunk of req) body += chunk; const payload = JSON.parse(body), parts = url.pathname.split('/'), itemId = parts[4], episodeId = parts[5]; let p = progress.find(p => p.libraryItemId === itemId && p.episodeId === episodeId); if (!p) { p = { libraryItemId: itemId, episodeId }; progress.push(p) }; Object.assign(p, payload); mutations.push({ path: url.pathname, payload }); return res.end('OK') }
    if (url.pathname.includes('/bookmark')) { let body = ''; for await (const chunk of req) body += chunk; if (req.method === 'POST' || req.method === 'PATCH') bookmarks.push({ libraryItemId: 'book-one', ...JSON.parse(body) }); if (req.method === 'DELETE') bookmarks = bookmarks.filter(b => b.time !== Number(url.pathname.split('/').at(-1))); return res.end('OK') }
    if (url.pathname === '/api/libraries') return res.end(JSON.stringify({ libraries: [{ id: 'books', name: 'Test Books', mediaType: 'book' }, { id: 'podcasts', name: 'Test Podcasts', mediaType: 'podcast' }] }))
    if (url.pathname === '/api/libraries/books/items') return res.end(JSON.stringify({ results: [book], total: 1 }))
    if (url.pathname === '/api/libraries/podcasts/items') return res.end(JSON.stringify({ results: [podcast], total: 1 }))
    if (url.pathname === '/api/items/book-one') return res.end(JSON.stringify(book))
    if (url.pathname === '/api/items/show-one') return res.end(JSON.stringify(podcast))
    res.statusCode = 404; res.end('{}')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  let desktop
  const errors = []
  try {
    const profileArg = `--user-data-dir=${resolve(artifacts, `smoke-profile-${Date.now()}-${Math.random().toString(16).slice(2,8)}`)}`
    desktop = await electron.launch({ executablePath: process.env.MEDIA_CENTER_EXECUTABLE || undefined, args: process.env.MEDIA_CENTER_EXECUTABLE ? [profileArg] : [resolve('out/main/index.js'), profileArg], env: { ...process.env, MEDIA_CENTER_SMOKE: '1' }, timeout: 30000 })
    const page = await desktop.firstWindow()
    await desktop.evaluate(({ BrowserWindow }) => { for (const window of BrowserWindow.getAllWindows()) window.webContents.setBackgroundThrottling(false) })
    // Windows can withhold compositor frames for a hidden packaged executable.
    // Exercise the packaged UI as it will actually run, without stealing focus.
    if (process.env.MEDIA_CENTER_EXECUTABLE) await desktop.evaluate(({ BrowserWindow }) => { for (const window of BrowserWindow.getAllWindows()) window.showInactive() })
    async function waitPlayback(predicate) {
      const deadline = Date.now() + 20000
      let state
      while (Date.now() < deadline) {
        state = await page.evaluate(() => window.mediaCenter.playback())
        if (predicate(state)) return state
        if (state.status === 'error') throw new Error(`Native playback failed: ${state.error}`)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      throw new Error(`Playback state did not settle: ${JSON.stringify(state)}`)
    }
    page.on('pageerror', error => errors.push(error.message))
    await page.getByRole('button', { name: 'Explore sample library' }).click()
    await page.getByRole('button', { name: /Blue Hour The Sunday Sessions/ }).waitFor()
    await page.screenshot({ path: resolve(artifacts, 'music-preview.png') })
    await page.getByRole('button', { name: 'Audiobooks', exact: true }).click()
    await page.getByRole('button', { name: /The Long Way Home Eleanor Hayes/ }).click()
    assert.equal(await page.getByRole('heading', { name: 'Chapters', exact: true }).count(), 1)
    assert.equal(await page.getByRole('heading', { name: 'Episodes', exact: true }).count(), 0)
    await page.screenshot({ path: resolve(artifacts, 'audiobook-preview.png') })
    await page.getByRole('button', { name: 'Podcasts', exact: true }).click()
    await page.getByRole('button', { name: /The Curious Mind/ }).click()
    assert.equal(await page.getByRole('heading', { name: 'Episodes', exact: true }).count(), 1)
    assert.equal(await page.getByRole('heading', { name: 'Chapters', exact: true }).count(), 0)
    await page.screenshot({ path: resolve(artifacts, 'podcast-preview.png') })
    await page.getByRole('button', { name: 'Downloaded on server' }).click()
    assert.equal(await page.locator('.episode-row').count(), 3)
    await page.getByRole('button', { name: 'Connect a server', exact: true }).click()
    await page.getByRole('heading', { name: 'App updates', exact: true }).waitFor()
    const updateState = await page.evaluate(() => window.mediaCenter.updateState())
    assert.equal(updateState.currentVersion, require('../package.json').version)
    assert.equal(updateState.status, process.env.MEDIA_CENTER_EXECUTABLE ? 'idle' : 'unavailable')
    assert.equal(await page.getByRole('button', { name: 'Check for updates', exact: true }).isDisabled(), !process.env.MEDIA_CENTER_EXECUTABLE)
    await page.screenshot({ path: resolve(artifacts, 'app-updates.png') })
    await page.getByLabel('Connection name', { exact: true }).fill('Test Navidrome')
    await page.getByLabel('Server address', { exact: true }).fill(url)
    await page.getByLabel('Username', { exact: true }).fill('test-user')
    await page.getByLabel('Password', { exact: true }).fill('test-password')
    await page.getByRole('button', { name: 'Test & connect' }).click()
    await page.getByRole('button', { name: 'Remove Test Navidrome' }).waitFor()
    await page.getByRole('button', { name: 'Audiobookshelf', exact: true }).click()
    await page.getByLabel('Connection name', { exact: true }).fill('Test Audiobookshelf')
    await page.getByLabel('Server address', { exact: true }).fill(url)
    await page.getByLabel('API key / access token', { exact: true }).fill('test-token')
    await page.getByRole('button', { name: 'Test & connect' }).click()
    await page.getByRole('button', { name: 'Remove Test Audiobookshelf' }).waitFor()
    await page.screenshot({ path: resolve(artifacts, 'settings-preview.png') })
    const saved = await page.evaluate(() => window.mediaCenter.settings())
    assert.equal(saved.connections.length, 2)
    assert.ok(!JSON.stringify(saved).includes('test-token'))
    assert.ok(!JSON.stringify(saved).includes('test-password'))
    const navId = saved.connections.find(c => c.provider === 'navidrome').id, absId = saved.connections.find(c => c.provider === 'audiobookshelf').id
    await page.getByRole('button', { name: 'Music', exact: true }).click()
    await page.getByRole('button', { name: 'Playlists', exact: true }).click()
    await page.getByRole('button', { name: 'New playlist', exact: true }).click()
    await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Tomorrow morning')
    await page.getByRole('button', { name: 'Save playlist', exact: true }).click()
    await page.getByRole('button', { name: /Tomorrow morning/ }).waitFor()
    const playlist = await page.evaluate(async serverId => { const p = (await window.mediaCenter.musicBrowse({ serverId, libraryId: '1', view: 'playlists', page: 0, search: '' })).items[0]; await window.mediaCenter.playlistSave({ serverId, id: p.id, name: p.title, comment: 'Keep repeats', public: false, songIds: ['song','song','song'] }); return window.mediaCenter.musicDetail({ serverId, kind: 'playlist', id: p.id }) }, navId)
    assert.equal(playlist.tracks.length,3)
    assert.equal(mutations.find(m => m.songs?.length === 3).songs.join(','),'song,song,song')
    await page.getByRole('button', { name: 'Refresh libraries', exact: true }).click()
    await page.getByRole('button', { name: /Tomorrow morning/ }).click()
    await page.getByRole('heading', { name: 'Playlist tracks', exact: true }).waitFor()
    await page.setViewportSize({width:1008,height:680})
    const actionBoxes = await page.locator('.detail-hero .listen-actions').first().locator('button').evaluateAll(buttons => buttons.map(b => { const r=b.getBoundingClientRect(),s=getComputedStyle(b); return {y:r.y,height:r.height,font:parseFloat(s.fontSize)} }))
    assert.ok(actionBoxes.every(b=>b.height>=40 && b.font>=13), 'Playlist actions should be readable and easy to click')
    assert.ok(actionBoxes.every(b=>Math.abs(b.y-actionBoxes[0].y)<2), 'Play must align with its neighboring actions')
    await page.screenshot({ path: resolve(artifacts,'playlist-v021.png') })
    await page.setViewportSize({width:1440,height:940})
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('button', { name: 'Albums', exact: true }).click()
    await page.getByRole('button', { name: /The Test Album Test Artist/ }).click()
    await page.getByRole('heading', { name: 'Tracks', exact: true }).waitFor()
    assert.equal(await page.locator('.workspace').evaluate(el=>el.scrollTop),0,'Opening an album from a scrolled library must start at the heading')
    await page.getByRole('button', { name: 'Audiobooks', exact: true }).click()
    await page.getByRole('button', { name: /The Test Book Test Author/ }).click()
    await page.getByRole('heading', { name: 'Chapters', exact: true }).waitFor()
    assert.equal(await page.locator('.chapter-row').count(), 3)
    await page.getByRole('button', { name: 'Podcasts', exact: true }).click()
    await page.getByRole('button', { name: /The Test Podcast Test Host/ }).click()
    await page.getByRole('heading', { name: 'Episodes', exact: true }).waitFor()
    assert.equal(await page.locator('.episode-card').count(), 2)
    assert.equal(await page.locator('.chapter-row').count(), 0)
    await page.getByLabel('Episode status', { exact: true }).selectOption('finished')
    assert.equal(await page.locator('.episode-card').count(), 1)
    assert.ok((await page.locator('.episode-card').innerText()).includes('Second independent'))
    await page.getByLabel('Episode status', { exact: true }).selectOption('all')
    await page.getByLabel('Search episodes', { exact: true }).fill('First')
    assert.equal(await page.locator('.episode-card').count(), 1)
    await page.getByLabel('Search episodes', { exact: true }).fill('')
    await page.getByLabel('Episode sort', { exact: true }).selectOption('title')
    const statusStyle = await page.locator('.episode-card .status-control button').first().evaluate(b=>({height:b.getBoundingClientRect().height,font:parseFloat(getComputedStyle(b).fontSize)}))
    assert.ok(statusStyle.height>=36 && statusStyle.font>=13, 'Episode status controls need visible button targets')
    for (const width of [1024,1920]) {
      await page.setViewportSize({width,height:900})
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Episode screen must fit the viewport')
      const actions=await page.locator('.episode-card').first().evaluate(el=>{const status=el.querySelector('.status-control').getBoundingClientRect(),actions=el.querySelector('.listen-actions').getBoundingClientRect();return Math.abs(status.left-actions.left)})
      assert.ok(actions<4,'Episode status and playback actions should stay grouped')
      await page.locator('.episode-card').first().evaluate(el=>el.scrollIntoView({block:'start'}))
      await page.screenshot({path:resolve(artifacts,'episodes-v021-'+width+'.png')})
    }
    await page.setViewportSize({width:1440,height:940})
    await page.evaluate(async serverId => { const target = { kind: 'podcast-episode', serverId, showId: 'show-one', episodeId: 'episode-two' }; await window.mediaCenter.spokenProgress({ target, action: 'unfinished' }); const d = await window.mediaCenter.detail({ serverId, itemId: 'show-one' }); if (d.item.episodes[1].progress.status === 'finished') throw Error('Status did not update'); await window.mediaCenter.spokenProgress({ target, action: 'finished' }) }, absId)
    assert.ok(mutations.some(m => m.path === '/api/me/progress/show-one/episode-two' && m.payload.isFinished))
    // Missing MPV is a clear actionable error, never browser playback fallback.
    await page.locator('.episode-card').filter({ hasText: 'First independent episode' }).getByRole('button', { name: 'Play selection', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Choose your MPV executable' }).waitFor()
    if (mpvPath) {
      assert.ok(existsSync(mpvPath), 'MPV_TEST_PATH must exist')
      await desktop.evaluate(({ dialog }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }) }, mpvPath)
      await page.evaluate(async () => { await window.mediaCenter.chooseMpv(); await window.mediaCenter.command({ action: 'volume', value: 0 }) })
      await page.getByRole('button', { name: 'Dismiss error' }).click()
      await page.locator('.episode-card').filter({ hasText: 'First independent episode' }).getByRole('button', { name: 'Play selection', exact: true }).click()
      await waitPlayback(p => p.status === 'playing' && p.position > 20 && p.sampleRate === 96000)
      await page.evaluate(() => window.mediaCenter.command({ action: 'speed', value: 1.5 }))
      await page.getByRole('button', { name: 'Audiobooks', exact: true }).click()
      await page.getByRole('button', { name: /The Test Book Test Author/ }).click()
      await page.locator('.detail-hero').getByRole('button', { name: 'Play selection', exact: true }).click()
      await waitPlayback(p => p.status === 'playing' && p.kind === 'audiobook' && p.position > 450 && p.position < 480 && p.sampleRate === 96000)
      await page.evaluate(async () => { await window.mediaCenter.command({ action: 'toggle' }); await window.mediaCenter.command({ action: 'seek', value: 250 }) })
      await waitPlayback(p => p.status === 'paused' && Math.abs(p.position - 250) < 1)
      assert.ok(syncRequests.some(r => r.path === '/api/session/book-session/sync' && Math.abs(r.currentTime - 250) < 1))
      assert.ok(audioRequests.some(r => r.path === '/audio/a.wav'))
      assert.ok(audioRequests.some(r => r.path === '/audio/b.wav' && r.length > 300 * 1024 * 1024))
      await page.getByRole('button', { name: 'Music', exact: true }).click()
      await page.getByRole('button', { name: /The Test Album Test Artist/ }).click()
      await page.locator('.detail-hero').getByRole('button', { name: 'Play selection', exact: true }).click()
      await waitPlayback(p => p.status === 'playing' && p.kind === 'music-track' && p.speed === 1 && p.position > 0 && p.sampleRate === 96000)
      assert.ok(audioRequests.some(r => r.path.includes('format=raw') && r.path.includes('maxBitRate=0')), JSON.stringify({ state: await page.evaluate(() => window.mediaCenter.playback()), audio: audioRequests.map(r => { const u = new URL(r.path, 'http://localhost'); return { path: u.pathname, format: u.searchParams.get('format'), maxBitRate: u.searchParams.get('maxBitRate') } }) }))
      await page.evaluate(async () => { const p = await window.mediaCenter.playback(); await window.mediaCenter.queueEdit({ action: 'append', items: [p.queue[0],p.queue[0]] }); await window.mediaCenter.queueEdit({ action: 'move', from: 2, to: 1 }); await window.mediaCenter.queueEdit({ action: 'remove', index: 2 }) })
      assert.equal((await page.evaluate(() => window.mediaCenter.playback())).queue.length,2)
      await page.getByRole('button', { name: 'Open now playing', exact: true }).click()
      await page.screenshot({ path: resolve(artifacts,'now-playing-v02.png') })
      await page.locator('.expanded-art').getByRole('button', { name: 'Listen later', exact: true }).click()
      await page.getByLabel('A note for yourself', { exact: true }).fill('Morning listening')
      await page.getByRole('button', { name: 'Save listening plan', exact: true }).click()
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
      await page.getByRole('complementary').getByRole('button', { name: 'Listen later', exact: true }).click()
      await page.locator('.plan-card').waitFor()
      await page.getByLabel('Reschedule', { exact: true }).fill('2026-09-10')
      await page.getByRole('button', { name: 'Mark done', exact: true }).click()
      await page.getByLabel('Show completed plans', { exact: true }).check()
      await page.locator('.plan-card.done').waitFor()
      await page.screenshot({ path: resolve(artifacts,'listen-later-v02.png') })
      const localPath = resolve(artifacts,'local-fixture'); mkdirSync(resolve(localPath,'Disc 1'),{recursive:true})
      const wav = Buffer.alloc(44+192000*3); wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(192000,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);writeFileSync(resolve(localPath,'Disc 1','Local track.wav'),wav)
      await desktop.evaluate(({ dialog }, path) => { dialog.showOpenDialog = async () => ({ canceled:false,filePaths:[path] }) },localPath)
      await page.getByRole('button', { name: 'Local files', exact: true }).click()
      await page.getByRole('button', { name: 'Add folder', exact: true }).click()
      await page.getByRole('button', { name: 'Disc 1', exact: true }).click()
      await page.locator('.local-file-row').waitFor()
      assert.ok((await page.locator('.local-file-row').innerText()).includes('48 kHz'))
      await page.locator('.local-file-row .song-title').click()
      await waitPlayback(p => p.status === 'playing' && p.kind === 'local-file' && p.sampleRate === 48000)
      await page.evaluate(async () => { await window.mediaCenter.command({ action:'toggle' }); const p = await window.mediaCenter.preferences(); p.equalizer[5] = 2; p.replayGain = 'album'; await window.mediaCenter.savePreferences(p) })
      await page.screenshot({ path: resolve(artifacts,'local-files-v02.png') })
      await page.evaluate(() => window.mediaCenter.command({ action: 'stop' }))
      assert.equal((await page.evaluate(() => window.mediaCenter.playback())).queue.length,1)
      const snapshots = await page.evaluate(async () => ({ plans: await window.mediaCenter.laterList(), roots: await window.mediaCenter.localRoots(), history: await window.mediaCenter.history() }))
      await require('./daily-smoke.cjs')({desktop,page,waitPlayback,artifacts})
      assert.equal(snapshots.plans[0].done,true); assert.equal(snapshots.plans[0].due,'2026-09-10'); assert.equal(snapshots.roots.length,1); assert.ok(snapshots.history.length>0)
    }
    await page.setViewportSize({ width: 1024, height: 720 })
    await page.screenshot({ path: resolve(artifacts, 'minimum-window.png') })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false)
    assert.deepEqual(errors, [])
    if (mpvPath) {
      await desktop.close(); desktop = undefined
      desktop = await electron.launch({ executablePath: process.env.MEDIA_CENTER_EXECUTABLE || undefined, args: process.env.MEDIA_CENTER_EXECUTABLE ? [profileArg] : [resolve('out/main/index.js'),profileArg], env: { ...process.env, MEDIA_CENTER_SMOKE:'1' }, timeout:30000 })
      const restoredPage = await desktop.firstWindow()
      await desktop.evaluate(({ BrowserWindow }, visible) => { for (const window of BrowserWindow.getAllWindows()) { window.webContents.setBackgroundThrottling(false); if (visible) window.showInactive() } }, !!process.env.MEDIA_CENTER_EXECUTABLE)
      const restored = await restoredPage.evaluate(async () => ({ playback: await window.mediaCenter.playback(), plans: await window.mediaCenter.laterList(), roots: await window.mediaCenter.localRoots(), prefs: await window.mediaCenter.preferences() }))
      assert.equal(restored.playback.status,'idle'); assert.equal(restored.playback.queue.length,1); assert.equal(restored.playback.queue[0].target.kind,'local-file'); assert.equal(restored.plans[0].done,true); assert.equal(restored.roots.length,1); assert.equal(restored.prefs.equalizer[5],2)
      await restoredPage.getByRole('button', { name:'Resume playback',exact:true }).click()
      let resumed; for (let i=0;i<100;i++) { resumed = await restoredPage.evaluate(() => window.mediaCenter.playback()); if (resumed.status === 'playing') break; await new Promise(r => setTimeout(r,100)) }; assert.equal(resumed.status,'playing')
      await restoredPage.evaluate(() => window.mediaCenter.command({action:'stop'}))
    }
    writeFileSync(resolve(artifacts, process.env.MEDIA_CENTER_EXECUTABLE ? 'packaged-smoke.json' : 'desktop-smoke.json'), JSON.stringify({ passed: true, version: require('../package.json').version, packagedExecutable: process.env.MEDIA_CENTER_EXECUTABLE || null, nativeMpvTested: !!mpvPath, nativeAudioRequests: audioRequests.length, checks: ['production Electron/preload/SQLite', 'sample music/books/podcasts', 'book chapters distinct from podcast episodes', 'episode availability filter', 'Navidrome authentication and album browsing', 'Audiobookshelf authentication and separate libraries', 'credentials excluded from renderer settings', 'missing MPV error', 'minimum window layout', 'readable aligned action buttons', 'navigation resets inherited scroll', 'grouped episode controls at 1024 and 1920 pixels', 'playlist creation and replacement with ordered duplicate tracks', 'episode status search and sorting', 'server completion mutation', ...(mpvPath ? ['real MPV 24-bit/96 kHz 300+ MB virtual WAV streaming', 'authenticated episode playback', 'resume second book file and seek backward to first while paused', 'server progress sync', 'raw Navidrome audio and music speed reset', 'editable queue and expanded player', 'SQLite listen-later save reschedule completion', 'local WAV metadata and native playback', 'live ReplayGain and equalizer', 'restart persistence without autoplay','native gapless transition','mini-window pin and restricted IPC','original offline book/episode downloads and cross-file seeks','offline progress preview and commit','saved queue load without autoplay','timestamped notes','cross-show inbox and Home','listening statistics','credential-free backup preview/restore and schema rejection'] : [])], requestCount: requests.length, rendererErrors: errors }, null, 2))
    console.log('Desktop smoke passed: production Electron, 2 fixture servers, 3 media types, 0 renderer errors.')
  } catch (error) {
    console.error('Desktop check failed:', error)
    if (desktop) { try { await desktop.firstWindow().then(page => page.screenshot({path:resolve(artifacts,'desktop-failure.png'), timeout:5000})) } catch {} }
    throw error
  } finally {
    if (desktop) {
      let timer
      await Promise.race([desktop.close().catch(() => {}), new Promise(resolve => { timer = setTimeout(() => { desktop.process().kill(); resolve() }, 10000) })])
      clearTimeout(timer)
    }
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
