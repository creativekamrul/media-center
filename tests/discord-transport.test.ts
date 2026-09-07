import {EventEmitter} from 'node:events'
import {afterEach,describe,expect,it,vi} from 'vitest'
vi.mock('../src/main/store',()=>({Store:class{}}))
vi.mock('node:net',()=>({createConnection:vi.fn()}))
import {createConnection} from 'node:net'
import {DiscordPresence,discordDefaults,rpcFrame} from '../src/main/discord'
import {emptyPlayback} from '../src/shared/types'
import type {Store} from '../src/main/store'
import type {Player} from '../src/main/player'
import type {LocalFiles} from '../src/main/local'
class Pipe extends EventEmitter {
  destroyed=false
  frames:Buffer[]=[]
  write(frame:Buffer){this.frames.push(frame);return true}
  end(){return this}
  destroy(){if(!this.destroyed){this.destroyed=true;this.emit('close')}return this}
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()})
describe('Discord local transport',()=>{
  it('keeps artwork errors visible after acknowledgements and retries the same track',async()=>{
    vi.useFakeTimers();const pipe=new Pipe()
    vi.mocked(createConnection).mockImplementation((()=>{queueMicrotask(()=>pipe.emit('connect'));return pipe}) as unknown as typeof createConnection)
    const target={kind:'local-file' as const,serverId:'local' as const,rootId:'root',fileId:'track'}
    const state={...emptyPlayback,status:'playing' as const,kind:'local-file' as const,title:'Track',subtitle:'Artist',duration:90,queue:[{target,title:'Track',subtitle:'Artist'}],queueIndex:0}
    const settings={...discordDefaults,enabled:true,local:true,applicationId:'123456789012345678'}
    const cache=new Map<string,{value:unknown;updated:number}>()
    const store={get:(key:string)=>key==='discordSettings'?settings:undefined,secret:()=> 'a'.repeat(32),cache:(key:string)=>cache.get(key),cacheSet:(key:string,value:unknown)=>cache.set(key,{value,updated:Date.now()})} as unknown as Store
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({error:10})))
    vi.stubGlobal('fetch',fetcher)
    const rpc=new DiscordPresence(store,{state} as Player,()=>{throw new Error('No provider access expected')},{metadata:async()=>({artist:'Artist',album:'Album',title:'Track'})} as unknown as LocalFiles)
    const acknowledge=()=>{const activity=JSON.parse(pipe.frames.at(-1)!.subarray(8).toString());pipe.emit('data',rpcFrame(1,{nonce:activity.nonce,data:{}}));return activity}
    try{
      await vi.advanceTimersByTimeAsync(1);pipe.emit('data',rpcFrame(1,{evt:'READY'}));await vi.advanceTimersByTimeAsync(1)
      acknowledge();expect(rpc.status.message).toBe('Connected to Discord.');expect(rpc.status.artworkMessage).toContain('API key')
      const cover='https://lastfm-img.freetls.fastly.net/i/u/300x300/album.png'
      fetcher.mockImplementation(async(input)=>new URL(String(input)).hostname==='ws.audioscrobbler.com'?new Response(JSON.stringify({album:{image:[{'#text':cover,size:'large'}]}})):new Response(null,{headers:{'content-type':'image/png'}}))
      await vi.advanceTimersByTimeAsync(63000)
      expect(acknowledge().args.activity.assets.large_image).toBe(cover)
      expect(rpc.status.artworkMessage).toContain('Album cover found');expect(rpc.status.artwork).toBe(true)
    }finally{rpc.stop()}
  })
  it('handles fragmented READY frames, acknowledgement, ping/pong, privacy clearing and reconnect',async()=>{
    vi.useFakeTimers();const pipes:Pipe[]=[]
    vi.mocked(createConnection).mockImplementation((()=>{const pipe=new Pipe();pipes.push(pipe);queueMicrotask(()=>pipe.emit('connect'));return pipe}) as unknown as typeof createConnection)
    const state={...emptyPlayback,status:'playing' as const,kind:'music-track' as const,title:'Listening fixture',subtitle:'Artist',duration:90,position:3}
    const store={get:()=>({...discordDefaults,enabled:true,applicationId:'123456789012345678'}),secret:()=>''} as unknown as Store
    const player={state} as unknown as Player,rpc=new DiscordPresence(store,player,()=>{throw new Error('No provider access expected')},{} as LocalFiles)
    try{
      await vi.advanceTimersByTimeAsync(1);const pipe=pipes[0]
      expect(JSON.parse(pipe.frames[0].subarray(8).toString())).toEqual({v:1,client_id:'123456789012345678'})
      const ready=rpcFrame(1,{evt:'READY'});pipe.emit('data',ready.subarray(0,5));expect(rpc.status.connected).toBe(false);pipe.emit('data',ready.subarray(5));await vi.advanceTimersByTimeAsync(1)
      expect(rpc.status.connected).toBe(true)
      const activity=JSON.parse(pipe.frames.at(-1)!.subarray(8).toString());expect(activity.cmd).toBe('SET_ACTIVITY');expect(activity.args.activity.details).toBe('Listening fixture')
      pipe.emit('data',rpcFrame(1,{cmd:'SET_ACTIVITY',nonce:activity.nonce,data:{}}));pipe.emit('data',rpcFrame(3,{ping:'fixture'}));expect(pipe.frames.at(-1)!.readUInt32LE(0)).toBe(4)
      player.state={...state,kind:'audiobook'};await vi.advanceTimersByTimeAsync(3000);expect(JSON.parse(pipe.frames.at(-1)!.subarray(8).toString()).args.activity).toBeNull()
      pipe.destroy();await vi.advanceTimersByTimeAsync(18000);expect(pipes.length).toBe(2)
    }finally{rpc.stop()}
  })
})
