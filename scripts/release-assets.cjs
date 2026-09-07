const { createReadStream, readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } = require('node:fs')
const { load } = require('js-yaml')
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
  const metadata = readdirSync('release').filter(name => name.endsWith('.yml')).map(name => ({ name, data: load(readFileSync(join('release', name), 'utf8')) })).filter(({ data }) => data?.version === version)
  if (!metadata.length) throw new Error('Update metadata is missing for this version. Build with the GitHub publish configuration.')
  const integrity = createHash('sha512')
  for await (const chunk of createReadStream(join('release', installer))) integrity.update(chunk)
  const expected = integrity.digest('base64')
  for (const { name, data } of metadata) {
    if (data.files?.length !== 1 || data.files[0].url !== installer || data.files[0].sha512 !== expected) throw new Error(`Invalid installer reference or SHA-512 in ${name}`)
    names.push(name)
  }
  const blockmap = `${installer}.blockmap`
  if (readdirSync('release').includes(blockmap)) names.push(blockmap)
  const sums = []
  for (const name of names) {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(join('release', name))) hash.update(chunk)
    sums.push(`${hash.digest('hex')}  ${name}`)
  }
  writeFileSync('release/SHA256SUMS.txt', sums.join('\n') + '\n')
  const publishDir = join('release', `publish-v${version}`)
  mkdirSync(publishDir, { recursive: true })
  for (const name of [...names, 'SHA256SUMS.txt']) copyFileSync(join('release', name), join(publishDir, name))
  console.log(`Prepared ${names.join(', ')} and SHA256SUMS.txt`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
