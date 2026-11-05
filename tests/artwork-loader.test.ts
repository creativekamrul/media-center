import {describe,it,expect} from 'vitest'
import {createArtworkLoader} from '../src/renderer/src/artwork-loader'

describe('artwork request scheduling',()=>{
 it('bounds concurrent work and drains all requests',async()=>{
  const load=createArtworkLoader(3)
  let active=0,peak=0
  const results=await Promise.all(Array.from({length:100},(_,i)=>load(async()=>{
   active++;peak=Math.max(peak,active)
   await new Promise(resolve=>setTimeout(resolve,1))
   active--;return i
  })))
  expect(peak).toBe(3);expect(results).toEqual(Array.from({length:100},(_,i)=>i))
 })
 it('skips stale queued requests and continues after failures',async()=>{
  const load=createArtworkLoader(1)
  let release!:()=>void,called=false,relevant=true
  const first=load(()=>new Promise<void>(resolve=>{release=resolve}))
  await Promise.resolve()
  const stale=load(async()=>{called=true},()=>relevant)
  relevant=false
  const failed=load(async()=>{throw Error('Unavailable')}).catch(e=>e.message)
  const last=load(async()=>42)
  release();await first
  expect(await stale).toBeUndefined();expect(called).toBe(false)
  expect(await failed).toBe('Unavailable');expect(await last).toBe(42)
 })
})
