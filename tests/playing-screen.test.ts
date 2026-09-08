import {describe,it,expect} from 'vitest'
import {playingScreenSchema,defaultPlayingScreen} from '../src/shared/playing-screen'
describe('Immersive appearance preferences',()=>{
 it('migrates existing preferences without losing user choices',()=>{
  expect(playingScreenSchema.parse({background:'stars',fontSize:48,motion:false})).toEqual({...defaultPlayingScreen,background:'stars',fontSize:48,motion:false})
 })
 it('rejects unsafe CSS values, unknown fields and unbounded settings',()=>{
  for(const patch of [{wordColor:'url(https://example.com)'},{font:'untrusted'},{textColor:'#fff'},{glow:25},{inactiveOpacity:-1},{lineHeight:5},{backdropDim:1},{animation:'unknown'},{customCss:'x'}])expect(playingScreenSchema.safeParse({...defaultPlayingScreen,...patch}).success).toBe(false)
 })
 it('round trips a fully customized appearance',()=>{
  const prefs={...defaultPlayingScreen,font:'georgia' as const,wordColor:'#ff9900',animation:'focus' as const,alignment:'center' as const}
  expect(playingScreenSchema.parse(JSON.parse(JSON.stringify(prefs)))).toEqual(prefs)
 })
})
