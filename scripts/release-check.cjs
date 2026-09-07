const { readFileSync } = require('node:fs')
const { execFileSync } = require('node:child_process')

const { version } = require('../package.json')
const lock = require('../package-lock.json')
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Use a semantic package version.')
if (lock.version !== version || lock.packages[''].version !== version) throw new Error('package-lock.json version does not match package.json.')
const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || `v${version}`
if (tag !== `v${version}`) throw new Error(`Tag ${tag} does not match package version v${version}.`)
const changelog = readFileSync('CHANGELOG.md', 'utf8')
if (!changelog.split(/\r?\n/).includes(`## ${version}`)) throw new Error(`Add a CHANGELOG.md section for ${version} before releasing.`)
if (process.argv.includes('--tag')) {
  const revision = execFileSync('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`], { encoding: 'utf8' }).trim()
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (revision !== head) throw new Error('Checked-out commit does not match the release tag.')
}
console.log(`Validated ${tag}: package, lockfile, changelog${process.argv.includes('--tag') ? ', and commit' : ''}.`)
