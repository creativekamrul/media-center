// Dedicated test process, never loaded by the shipped app. All downloads are inert fixtures.
const { app } = require('electron')
const { NsisUpdater } = require('electron-updater')
const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor')
const { createServer } = require('node:http')
const { createHash, randomUUID } = require('node:crypto')
const { mkdirSync, writeFileSync, readFileSync } = require('node:fs')
const { resolve, join } = require('node:path')
const assert = require('node:assert/strict')
const { Updates } = require(process.env.UPDATE_TEST_CONTROLLER)
const root = resolve('artifacts', 'update-test-' + randomUUID())
mkdirSync(root, { recursive: true })
app.setPath('userData', join(root, 'electron-profile'))

async function main() {
  await app.whenReady()
  const bytes = Buffer.alloc(128 * 1024, 'inert update fixture; never executed\n')
  const sha512 = createHash('sha512').update(bytes).digest('base64')
  let mode = 'available', downloads = 0
  const server = createServer((req, res) => {
    if (req.url.split('?')[0] === '/latest.yml') {
      const version = mode === 'current' ? '0.2.2' : mode === 'older' ? '0.2.1' : '0.2.3'
      res.end(`version: ${version}\nfiles:\n  - url: fixture.exe\n    sha512: ${sha512}\n    size: ${bytes.length}\npath: fixture.exe\nsha512: ${sha512}\nreleaseDate: '2026-09-07T00:00:00Z'\n`)
    } else if (req.url.split('?')[0] === '/fixture.exe') {
      downloads++; res.setHeader('Content-Length', bytes.length)
      res.end(mode === 'corrupt' ? Buffer.alloc(bytes.length, 'x') : bytes)
    } else { res.statusCode = 404; res.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    for (const scenario of ['available', 'current', 'older', 'corrupt']) {
      mode = scenario
      const dir = join(root, scenario); mkdirSync(dir, { recursive: true })
      const config = join(dir, 'app-update.yml')
      writeFileSync(config, 'updaterCacheDirName: update-fixture\n')
      const adapter = {
        version: '0.2.2', name: 'update-fixture', isPackaged: true, appUpdateConfigPath: config,
        userDataPath: dir, baseCachePath: dir, whenReady: () => app.whenReady(),
        quit: () => { throw Error('Tests must not install') }, relaunch: () => { throw Error('Tests must not relaunch') },
        onQuit: () => { throw Error('Automatic installation must remain disabled') }
      }
      const backend = new NsisUpdater(undefined, adapter)
      backend.httpExecutor = new ElectronHttpExecutor(() => {})
      backend.setFeedURL({ provider: 'generic', url: `http://127.0.0.1:${server.address().port}` })
      backend.disableDifferentialDownload = true
      backend.logger = null
      const updates = new Updates(backend, '0.2.2', true, async () => { throw Error('Installation is not part of this fixture') })
      const before = downloads
      await updates.check()
      assert.equal(downloads, before, 'Checking must not download')
      if (scenario === 'current' || scenario === 'older') {
        assert.equal(updates.state.status, 'up-to-date', scenario)
      } else {
        assert.equal(updates.state.status, 'available')
        await updates.download()
        if (scenario === 'corrupt') {
          assert.equal(updates.state.status, 'error'); assert.match(updates.state.error, /integrity/)
        } else {
          assert.equal(updates.state.status, 'ready')
          assert.deepEqual(readFileSync(backend.installerPath), bytes)
          assert.ok(!JSON.stringify(updates.state).includes(root))
        }
      }
    }
    writeFileSync(resolve('artifacts/updater-smoke.json'), JSON.stringify({ passed: true, checks: ['real NSIS updater metadata parsing', 'manual download', 'SHA-512 verified download', 'same and older versions rejected', 'corrupt download rejected', 'automatic installation disabled'], installed: false }, null, 2))
    console.log('Updater integration passed: real NSIS updater, manual downloads, SHA-512 rejection, no installation.')
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
}
main().then(() => app.exit(0), error => { console.error(error); app.exit(1) })
