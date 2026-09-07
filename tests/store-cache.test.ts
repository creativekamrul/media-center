import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{}}))
import {Store} from '../src/main/store'
describe('persistent cache invalidation',()=>{
  it('keeps the podcast index and Last.fm artwork when music libraries refresh',()=>{
    const store=new Store(':memory:')
    try{
      store.cacheSet('music:page',{title:'Album'})
      store.cacheSet('podcast-inbox',[{episodeId:'episode'}])
      store.cacheSet('lastfm:album',{url:'https://lastfm.freetls.fastly.net/cover.png'})
      store.cacheClear('music:')
      expect(store.cache('music:page')).toBeUndefined()
      expect(store.cache('podcast-inbox')?.value).toEqual([{episodeId:'episode'}])
      expect(store.cache('lastfm:album')).toBeDefined()
      store.cacheClear()
      expect(store.cache('podcast-inbox')).toBeUndefined()
      expect(store.cache('lastfm:album')).toBeDefined()
    }finally{store.close()}
  })
})
