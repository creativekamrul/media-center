import manifest from '../../package.json'

// The installer, UI, and server client identification share one version source.
export const APP_VERSION = manifest.version

declare const __BUILD_ID__:string
export const BUILD_ID=typeof __BUILD_ID__==='string'?__BUILD_ID__:'unversioned'
