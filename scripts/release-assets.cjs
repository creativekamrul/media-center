const { createReadStream, writeFileSync, mkdirSync, readdirSync } = require('node:fs')
const { join } = require('node:path')
const { createHash } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { version } = require('../package.json')

async function main() {
  require('./release-check.cjs')
  mkdirSync('release', { recursive: true })
  const source = `Media-Center-${version}-source.zip`
  // Archive tracked source from exactly this commit; ignored media/credentials never enter it.
  execFileSync('git', ['archive', '--format=zip', `--output=${join('release', source)}`, 'HEAD'])
  const installer = `Media-Center-${version}-win-x64.exe`
  const names = [installer, source]
  const blockmap = `${installer}.blockmap`
  if (readdirSync('release').includes(blockmap)) names.push(blockmap)
  const sums = []
  for (const name of names) {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(join('release', name))) hash.update(chunk)
    sums.push(`${hash.digest('hex')}  ${name}`)
  }
  writeFileSync('release/SHA256SUMS.txt', sums.join('\n') + '\n')
  console.log(`Prepared ${names.join(', ')} and SHA256SUMS.txt`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
