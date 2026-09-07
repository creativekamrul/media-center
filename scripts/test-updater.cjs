const { buildSync } = require('esbuild')
const { spawn } = require('node:child_process')
const { resolve } = require('node:path')
const controller = resolve('artifacts/update-controller.cjs')
buildSync({ entryPoints: ['src/main/updates.ts'], outfile: controller, bundle: true, platform: 'node', format: 'cjs' })
const env = { ...process.env, UPDATE_TEST_CONTROLLER: controller }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(require('electron'), [resolve('scripts/updater-smoke.cjs')], { env, stdio: 'inherit', windowsHide: true })
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
