import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import {execFileSync} from 'node:child_process'
let buildId='unversioned'
try{buildId=execFileSync('git',['rev-parse','--short=12','HEAD'],{encoding:'utf8'}).trim();if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())buildId+='-local'}catch{/* Source archives may not contain Git metadata. */}
const define={__BUILD_ID__:JSON.stringify(buildId)}

export default defineConfig({
  main: { define, plugins: [externalizeDepsPlugin()], build: { rollupOptions: { external: ['node:sqlite'] } } },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: { define, plugins: [react()] }
})
