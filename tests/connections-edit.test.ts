import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{isEncryptionAvailable:()=>true,encryptString:(s:string)=>Buffer.from(s),decryptString:(b:Buffer)=>b.toString()}}))
import {Store} from '../src/main/store'
describe('saved connection editing',()=>{
 it('updates in place without changing order, identities or unrelated secrets',()=>{
  const store=new Store(':memory:')
  try{
   const music={provider:'navidrome' as const,name:'Music',url:'https://music.invalid',username:'a',secret:'old'}
   store.saveConnection(music,'music');store.saveConnection({...music,provider:'audiobookshelf',name:'Books',secret:'books'},'books')
   store.saveConnection({...music,name:'Renamed',secret:'new'},'music')
   expect(store.connections().map(c=>c.id)).toEqual(['music','books'])
   expect(store.connection('music')).toMatchObject({config:{id:'music',name:'Renamed'},secret:'new'})
   expect(store.connection('books').secret).toBe('books')
   expect(store.connections()[0]).not.toHaveProperty('secret')
  }finally{store.close()}
 })
})
