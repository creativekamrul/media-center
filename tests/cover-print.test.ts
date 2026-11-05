import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect,it} from 'vitest'
import {coverPrintPath,publicCoverPrint} from '../src/shared/cover-print'

it('maps normalized titles to the same bundled and public artwork across all 36 editions',()=>{
  expect(coverPrintPath('  MUSIC   BOX ')).toBe(coverPrintPath('music box'))
  const paths=new Set(Array.from({length:1000},(_,i)=>coverPrintPath(`Fixture title ${i}`)))
  expect(paths.size).toBe(36)
  for(const path of paths) expect(existsSync(resolve('src/renderer/public',path))).toBe(true)
  const title='Private title 🎵'
  expect(publicCoverPrint(title)).toBe('https://raw.githubusercontent.com/creativekamrul/media-center/main/src/renderer/public/'+coverPrintPath(title))
})
