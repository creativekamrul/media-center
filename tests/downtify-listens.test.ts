import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {EventEmitter} from 'node:events'
import {trackDowntifyListening} from '../src/main/downtify-listens'
import type {PlaybackState} from '../src/shared/types'
describe('Downtify listening reports',()=>{
 let player:EventEmitter,values:Map<string,any>,json:ReturnType<typeof vi.fn>,stop:()=>void,state:PlaybackState
 beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(1000000);player=new EventEmitter();values=new Map([['deviceId','qa-device'],['downtify:track:s:t',{remoteId:'stable'}]] as any);json=vi.fn(async()=>({}));stop=trackDowntifyListening(player as any,{get:(k:string)=>values.get(k),set:(k:string,v:any)=>values.set(k,v)} as any,()=>({json}) as any);state={status:'playing',queueIndex:0,queue:[{target:{kind:'downtify-track',serverId:'s',trackId:'t'},title:'QA',subtitle:'Artist'}],position:0,duration:30} as PlaybackState})
 afterEach(()=>{stop();vi.useRealTimers()})
 const tick=async(seconds:number)=>{for(let i=0;i<seconds;i++){vi.advanceTimersByTime(1000);player.emit('state',state);await Promise.resolve()}}
 it('counts elapsed listening, not seeking, and reports once per play',async()=>{player.emit('state',state);state.position=29;player.emit('state',state);expect(json.mock.calls.filter(c=>c[0]==='api/discover/listens')).toHaveLength(0);await tick(16);expect(json.mock.calls.filter(c=>c[0]==='api/discover/listens')).toHaveLength(1);await tick(15);expect(json.mock.calls.filter(c=>c[0]==='api/discover/listens')).toHaveLength(1)})
 it('suppresses private listening and respects the existing scrobble setting',async()=>{state.privateListening=true;player.emit('state',state);await tick(20);expect(json).not.toHaveBeenCalled();state.privateListening=false;values.set('preferences',{scrobble:false});await tick(20);expect(json).not.toHaveBeenCalled()})
 it('retains an uncertain report and retries the same play ID',async()=>{json.mockImplementation(async(path:string)=>{if(path==='api/discover/listens')throw Error('offline');return {}});player.emit('state',state);await tick(17);const pending=values.get('downtify:listen-outbox');expect(pending).toHaveLength(1);const play=pending[0].play_id;json.mockResolvedValue({});await vi.advanceTimersByTimeAsync(30000);expect(values.get('downtify:listen-outbox')).toEqual([]);expect(json.mock.calls.filter(c=>c[0]==='api/discover/listens').every(c=>c[2].play_id===play)).toBe(true)})
})
