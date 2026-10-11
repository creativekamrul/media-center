import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {createServer,type Server} from 'node:http'
import {Jellyfin,mapJfItem} from '../src/main/providers/jellyfin'
import {JellyfinRelay} from '../src/main/jellyfin-relay'
import {JellyfinPlayer} from '../src/main/jellyfin-player'
import {Mpv} from '../src/main/mpv'
import type {Store} from '../src/main/store'

describe('Jellyfin original media contract',()=>{
 let server:Server,p:Jellyfin,relay:JellyfinRelay,requests:{path:string;query:URLSearchParams;headers:Record<string,unknown>;body:any}[]
 let direct=true,redirect=false
 beforeEach(async()=>{
  requests=[];direct=true;redirect=false
  server=createServer(async(req,res)=>{const u=new URL(req.url!,'http://localhost');let body='';for await(const c of req)body+=c;requests.push({path:u.pathname,query:u.searchParams,headers:req.headers,body:body?JSON.parse(body):undefined});res.setHeader('Content-Type','application/json')
   if(u.pathname.endsWith('/AuthenticateByName'))return res.end(JSON.stringify({AccessToken:'secret-token',User:{Id:'user',Name:'Listener'}}))
   if(u.pathname.endsWith('/Info/Public'))return res.end(JSON.stringify({Version:'10.11.11',ServerName:'JellyBean'}))
   if(u.pathname.endsWith('/Views'))return res.end(JSON.stringify({Items:[{Id:'m',Name:'Music',CollectionType:'music'},{Id:'v',Name:'Cinema archive',CollectionType:'movies'},{Id:'v2',Name:'Family favourites',CollectionType:'movies'},{Id:'t',Name:'Shows',CollectionType:'tvshows'},{Id:'x',Name:'Music by name only',CollectionType:'books'}]}))
   if(u.pathname.endsWith('/PlaybackInfo'))return res.end(JSON.stringify({PlaySessionId:'session',MediaSources:[{Id:'source',SupportsDirectPlay:direct,TranscodingUrl:'/bad.m3u8',MediaStreams:[]}]}))
   if(u.pathname.endsWith('/stream')){if(redirect){res.writeHead(302,{Location:'http://example.invalid/steal'});return res.end()}res.setHeader('Content-Type','video/mp4');res.setHeader('Accept-Ranges','bytes');if(req.headers.range){res.writeHead(206,{'Content-Range':'bytes 3-5/10','Content-Length':3});return res.end('345')}return res.end('0123456789')}
   if(u.pathname.endsWith('/Items/album'))return res.end(JSON.stringify({Id:'album',Type:'MusicAlbum',Name:'Album'}))
   const start=Number(u.searchParams.get('StartIndex')??0);return res.end(JSON.stringify({TotalRecordCount:125,Items:Array.from({length:Math.max(0,Math.min(60,125-start))},(_,n)=>({Id:String((start+n)%100),Type:'Audio',Name:`Track ${start+n}`,UserData:{PlaybackPositionTicks:15e7}}))}))
  });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as {port:number};p=new Jellyfin({id:'server',url:`http://127.0.0.1:${address.port}/jf/`,userId:'user',name:'Test',username:'Listener',version:'10.11.11'},'secret-token','device');relay=new JellyfinRelay()
 })
 afterEach(async()=>{await relay.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()))})
 it('authenticates without returning passwords and preserves reverse proxy paths',async()=>{const result=await Jellyfin.login(p.config.url,'Listener','password','device');expect(result).toMatchObject({version:'10.11.11',token:'secret-token'});expect(requests[0].path).toBe('/jf/Users/AuthenticateByName');expect(requests[0].body).toEqual({Username:'Listener',Pw:'password'})})
 it('uses explicit collection types and rejects unknown item types',async()=>{expect((await p.libraries()).map(l=>l.kind)).toEqual(['music','movies','movies','tvshows']);expect((await p.libraries()).map(l=>l.name)).toEqual(['Music','Cinema archive','Family favourites','Shows']);expect(()=>mapJfItem({Id:'1',Name:'Movie',Type:'Book'},'s')).toThrow('Unsupported');expect(mapJfItem({Id:'1',Name:'Episode',Type:'Episode',SeriesId:'show'},'s')).toMatchObject({kind:'Episode',seriesId:'show'})})
 it('requests authenticated wide backdrop artwork through the reverse proxy',async()=>{await p.cover('movie','Backdrop');const request=requests.at(-1)!;expect(request.path).toBe('/jf/Items/movie/Images/Backdrop');expect(request.query.get('maxWidth')).toBe('1600');expect(request.headers['x-emby-authorization']).toContain('secret-token');await p.cover('movie');expect(requests.at(-1)?.path).toBe('/jf/Items/movie/Images/Primary')})
 it('loads similar titles and next-up with user and series scope',async()=>{await p.related('movie');expect(requests.at(-1)?.path).toBe('/jf/Items/movie/Similar');expect(requests.at(-1)?.query.get('UserId')).toBe('user');await p.nextUp('show');expect(requests.at(-1)?.path).toBe('/jf/Shows/NextUp');expect(requests.at(-1)?.query.get('SeriesId')).toBe('show');expect(requests.at(-1)?.query.get('Limit')).toBe('1')})
 it('maps optional detail metadata without requiring it for older cached items',()=>{const i=mapJfItem({Id:'movie',Type:'Movie',Name:'Cinema',CommunityRating:7.5,OfficialRating:'PG',ImageTags:{Logo:'tag'},Studios:[{Name:'Studio'}],People:[{Id:'person',Name:'Actor',Role:'Character',Type:'Actor'}]},'s');expect(i).toMatchObject({rating:7.5,certification:'PG',logoId:'movie',studios:['Studio'],people:[{id:'person',name:'Actor',role:'Character',type:'Actor'}]});expect(mapJfItem({Id:'movie',Type:'Movie',Name:'Cinema'},'s').rating).toBeUndefined()})
 it('disables all server conversion and refuses a transcode-only response',async()=>{await p.playback('movie',12);expect(requests.at(-1)?.body).toMatchObject({EnableDirectPlay:true,EnableDirectStream:false,EnableTranscoding:false,StartTimeTicks:12e7,DeviceProfile:{TranscodingProfiles:[]}});direct=false;await expect(p.playback('movie',0)).rejects.toThrow('Original-file playback is unavailable')})
 it('uses the 10.11.11 resume and artist routes with library and user scope',async()=>{const query={serverId:'server',libraryId:'m',kind:'music' as const,view:'artists' as const,search:'',page:0,sort:'SortName' as const,descending:false};await p.browse(query);expect(requests.at(-1)?.path).toBe('/jf/Artists');expect(requests.at(-1)?.query.get('ParentId')).toBe('m');await p.browse({...query,kind:'tvshows',view:'continue'});expect(requests.at(-1)?.path).toBe('/jf/UserItems/Resume');expect(requests.at(-1)?.query.get('UserId')).toBe('user');expect(requests.at(-1)?.query.get('IncludeItemTypes')).toBe('Episode')})
 it('queues every sorted page and preserves duplicate occurrences',async()=>{const tracks=await p.collection({serverId:'server',libraryId:'m',parentId:'album',kind:'music',view:'all',search:'',page:0,sort:'SortName',descending:false});expect(tracks).toHaveLength(125);expect(tracks[0].id).toBe(tracks[100].id);expect(requests.filter(r=>r.path==='/jf/Items').map(r=>r.query.get('StartIndex'))).toEqual(['0','60','120'])})
 it('relays original byte ranges without exposing server tokens to MPV',async()=>{const item=mapJfItem({Id:'movie',Type:'Movie',Name:'Movie'},'server');const stream=await relay.open(p,item,{Id:'source',MediaStreams:[]});expect(stream.url).not.toContain('secret-token');const response=await fetch(stream.url,{headers:{Range:'bytes=3-5'}});expect(response.status).toBe(206);expect(response.headers.get('content-range')).toBe('bytes 3-5/10');expect(await response.text()).toBe('345');expect(requests.at(-1)?.query.get('Static')).toBe('true');expect(requests.at(-1)?.headers['x-emby-authorization']).toContain('secret-token');expect((await fetch(stream.url.replace(/\/[^/]+\/media$/,'/wrong/media'))).status).toBe(404)})
 it('does not follow upstream redirects carrying authenticated requests',async()=>{redirect=true;const stream=await relay.open(p,mapJfItem({Id:'movie',Type:'Movie',Name:'Movie'},'server'),{Id:'source',MediaStreams:[]});expect((await fetch(stream.url)).status).toBe(502)})
})

describe('Jellyfin session coordination',()=>{
 let player:JellyfinPlayer,mpv:Mpv,p:Jellyfin,store:Store,values:Map<string,unknown>
 const item=mapJfItem({Id:'episode',Type:'Episode',Name:'Episode',RunTimeTicks:600e7,UserData:{PlaybackPositionTicks:42e7}},'server')
 beforeEach(()=>{
  values=new Map();store={get:(k:string)=>values.get(k),set:(k:string,v:unknown)=>values.set(k,v),settings:()=>({mpvPath:'mpv.exe',audioDevice:'auto',exclusive:false})} as unknown as Store
  p=new Jellyfin({id:'server',url:'http://127.0.0.1:1',name:'Fixture',username:'Test',userId:'user',version:'10.11.11'},'test','device');vi.spyOn(p,'detail').mockResolvedValue(item);vi.spyOn(p,'playback').mockResolvedValue({source:{Id:'source',MediaStreams:[]},sessionId:'session'});vi.spyOn(p,'send').mockResolvedValue()
  mpv=new Mpv();vi.spyOn(mpv,'start').mockResolvedValue();vi.spyOn(mpv,'load').mockResolvedValue();vi.spyOn(mpv,'stop').mockResolvedValue();vi.spyOn(mpv,'command').mockResolvedValue(undefined)
  player=new JellyfinPlayer(store,()=>p,async()=>{},mpv)
 })
 afterEach(async()=>{await player.shutdown();vi.restoreAllMocks()})
 it('does not claim playback before MPV loads the file',async()=>{let resolve!:()=>void;vi.mocked(mpv.load).mockImplementation(()=>new Promise<void>(r=>resolve=r));const work=player.play([item]);await vi.waitFor(()=>expect(resolve).toBeDefined());expect(player.state.status).toBe('loading');expect(p.send).not.toHaveBeenCalled();resolve();await work;expect(player.state.status).toBe('playing');expect(p.send).toHaveBeenCalledWith('Sessions/Playing',expect.objectContaining({PlayMethod:'DirectPlay',PositionTicks:42e7,ItemId:'episode'}))})
 it('uses fresh server resume instead of silently replaying stale local progress',async()=>{values.set('jellyfin:progress:server:Episode:episode',{position:120,pending:true});await player.play([item]);expect(mpv.load).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({start:'42'}))})
 it('keeps pause state correct when the native event precedes the command response',async()=>{await player.play([item]);vi.mocked(mpv.command).mockImplementation(async command=>{if(command[0]==='set_property'&&command[1]==='pause')mpv.emit('event',{event:'property-change',name:'pause',data:command[2]});return undefined});await player.command({action:'toggle'});expect(player.state.status).toBe('paused');await player.command({action:'toggle'});expect(player.state.status).toBe('playing')})
 it('embeds playback in the owned surface and routes fullscreen to the app',async()=>{await player.shutdown();const host={handle:vi.fn(async()=>'123'),fullscreen:vi.fn(),hide:vi.fn(),close:vi.fn()};player=new JellyfinPlayer(store,()=>p,async()=>{},mpv,host);await player.play([item]);expect(mpv.start).toHaveBeenLastCalledWith('mpv.exe',true,'123');await player.command({action:'fullscreen'});expect(host.fullscreen).toHaveBeenCalledWith(true);expect(mpv.command).not.toHaveBeenCalledWith(['cycle','fullscreen']);await player.command({action:'stop'});expect(host.hide).toHaveBeenCalled();expect(player.state.fullscreen).toBe(false)})
 it('serializes five-second skips and clamps both ends',async()=>{await player.play([item]);await player.command({action:'seek',value:20});await Promise.all([player.command({action:'seekRelative',value:-5}),player.command({action:'seekRelative',value:5})]);expect(player.state.position).toBe(20);await player.command({action:'seek',value:2});await player.command({action:'seekRelative',value:-5});expect(player.state.position).toBe(0);player.state.duration=30;await player.command({action:'seek',value:28});await player.command({action:'seekRelative',value:5});expect(player.state.position).toBe(30)})
 it('keeps failed progress visible and checkpoints scoped to server and media type',async()=>{await player.play([item]);vi.mocked(p.send).mockRejectedValue(Error('offline'));await player.command({action:'seek',value:65});expect(player.state.syncError).toContain('could not sync');expect(values.get('jellyfin:progress:server:Episode:episode')).toMatchObject({position:65,pending:true});vi.mocked(p.send).mockResolvedValue();await player.command({action:'sync'});expect(player.state.syncError).toBeUndefined()})
 it('retries the failed item at its current position without replacing the queue',async()=>{await player.play([item]);mpv.emit('event',{event:'property-change',name:'time-pos',data:81});mpv.emit('event',{event:'end-file',reason:'error'});await player.command({action:'retry'});expect(mpv.load).toHaveBeenLastCalledWith(expect.any(String),expect.objectContaining({start:'81'}));expect(player.state.queue).toEqual([item])})
 it('advances to the next episode only after EOF and respects the auto-next setting',async()=>{await player.play([item,{...item,id:'next'}]);mpv.emit('event',{event:'end-file',reason:'eof'});await vi.waitFor(()=>expect(player.state.index).toBe(1));await vi.waitFor(()=>expect(player.state.status).toBe('playing'));expect(p.playback).toHaveBeenLastCalledWith('next',0);await player.command({action:'autoNext',value:false});mpv.emit('event',{event:'end-file',reason:'eof'});await vi.waitFor(()=>expect(player.state.status).toBe('idle'))})
 it('persists video appearance and applies language defaults before loading',async()=>{
  await player.command({action:'preferences',value:{...player.state.preferences,audioLanguage:'bn',subtitleLanguage:'en',subtitleScale:1.5,subtitleBackground:true,subtitles:'off'}})
  await player.play([item]);expect(values.get('jellyfin:video-preferences')).toMatchObject({audioLanguage:'bn',subtitleScale:1.5})
  expect(mpv.command).toHaveBeenCalledWith(['set_property','alang','bn']);expect(mpv.command).toHaveBeenCalledWith(['set_property','sub-scale',1.5]);expect(mpv.command).toHaveBeenCalledWith(['set_property','sid','no'])
 })
 it('selects a queue occurrence without discarding the queue or carrying over track IDs',async()=>{
  const queue=[item,{...item,id:'next'},item];await player.play(queue)
  await player.command({action:'queueIndex',value:2});expect(player.state.index).toBe(2);expect(player.state.queue).toEqual(queue)
  await expect(player.command({action:'queueIndex',value:3})).rejects.toThrow('out of bounds');expect(player.state.index).toBe(2)
  expect(mpv.command).toHaveBeenCalledWith(['set_property','aid','auto'])
 })
 it('lets the user cancel next-video countdown without starting another stream',async()=>{
  await player.command({action:'preferences',value:{...player.state.preferences,nextDelay:5}});await player.play([item,{...item,id:'next'}])
  mpv.emit('event',{event:'end-file',reason:'eof'});await vi.waitFor(()=>expect(player.state.nextIn).toBe(5));expect(player.state.index).toBe(0)
  await player.command({action:'cancelNext'});expect(player.state.nextIn).toBeUndefined();expect(player.state.status).toBe('idle');expect(mpv.load).toHaveBeenCalledTimes(1)
 })
 it('ignores cancel-next while ordinary playback is active',async()=>{await player.play([item]);await player.command({action:'cancelNext'});expect(player.state.status).toBe('playing')})

 it('advances once when the optional countdown expires',async()=>{
  await player.command({action:'preferences',value:{...player.state.preferences,nextDelay:5}});await player.play([item,{...item,id:'next'}])
  mpv.emit('event',{event:'end-file',reason:'eof'});await vi.waitFor(()=>expect(player.state.nextIn).toBe(5));await vi.waitFor(()=>expect(player.state.index).toBe(1),{timeout:7000});await vi.waitFor(()=>expect(player.state.status).toBe('playing'));expect(mpv.load).toHaveBeenCalledTimes(2);expect(player.state.nextIn).toBeUndefined()
 },10000)

 it('keeps a paused Jellyfin session in the background until explicitly resumed',async()=>{
  await player.play([item]);expect(player.state.foreground).toBe(true);await player.pause();player.background();expect(player.state.status).toBe('paused');expect(player.state.foreground).toBe(false)
  mpv.emit('event',{event:'property-change',name:'time-pos',data:43});expect(player.state.foreground).toBe(false)
  await player.command({action:'toggle'});expect(player.state.foreground).toBe(true);expect(player.state.status).toBe('playing')
 })

})
