import {dtWorkspace} from '../src/main/downtify-workspace'
import {afterEach,beforeEach,describe,expect,it} from 'vitest'
import {createServer,type Server} from 'node:http'
import {Downtify,normalizeDt} from '../src/main/providers/downtify'
import {DowntifyRelay} from '../src/main/downtify'
import {progressKey} from '../src/shared/timeline'

describe('Downtify 3.9 contracts',()=>{
 let server:Server,p:Downtify,relay:DowntifyRelay,requests:{path:string;method:string;cookie?:string;body:any;query:URLSearchParams}[],redirect:boolean
 const song={name:'Fixture discovery',artists:['Fixture artist'],album_name:'Fixture album',duration:30,song_id:'abcdefghijk',cover_url:''}
 beforeEach(async()=>{
  requests=[];redirect=false;relay=new DowntifyRelay()
  server=createServer(async(req,res)=>{
   const u=new URL(req.url!,'http://fixture');let body='';for await(const c of req)body+=c
   requests.push({path:u.pathname,method:req.method!,cookie:req.headers.cookie,body:body?JSON.parse(body):undefined,query:u.searchParams})
   res.setHeader('Content-Type','application/json')
   if(u.pathname==='/dt/api/auth/status')return res.end(JSON.stringify({signed_in:req.headers.cookie==='downtify_session=fixture'}))
   if(u.pathname==='/dt/api/auth/login'){res.setHeader('Set-Cookie','downtify_session=fixture; HttpOnly; Path=/');return res.end('{}')}
   if(req.headers.cookie!=='downtify_session=fixture'){res.writeHead(401);return res.end('{}')}
   if(u.pathname==='/dt/api/version')return res.end('"3.9.0"')
   if(u.pathname==='/dt/api/discover/chart')return res.end(JSON.stringify({tracks:[song]}))
   if(u.pathname==='/dt/api/finder/artist')return res.end(JSON.stringify({artist_id:'24',name:'Fixture artist',top_songs:[song]}))
   if(u.pathname==='/dt/api/finder/artist/albums')return res.end(JSON.stringify([{album_id:'42',name:'Fixture album',release_type:'Single',year:2026}]))
   if(u.pathname==='/dt/api/songs/search')return res.end(JSON.stringify([song]))
   if(u.pathname==='/dt/tracks')return res.end(JSON.stringify([{file:'ext/music/Fixture song.flac',title:'Saved fixture',artist:'Fixture artist',duration:30}]))
   if(u.pathname==='/dt/playlists')return res.end(JSON.stringify([{name:'Favorites',files:['song.flac']}]))
   if(u.pathname==='/dt/api/download/batch')return res.end('{}')
   if(u.pathname==='/dt/api/stream/file'||u.pathname.startsWith('/dt/media/')){
    if(redirect){res.writeHead(302,{Location:'https://example.invalid/private'});return res.end()}
    res.setHeader('Content-Type','audio/flac');res.setHeader('Accept-Ranges','bytes')
    if(req.headers.range){res.writeHead(206,{'Content-Range':'bytes 2-4/10','Content-Length':3});return res.end('234')}
    return res.end('0123456789')
   }
   res.writeHead(404).end('{}')
  });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r))
  p=new Downtify({id:'one',name:'Fixture',url:`http://127.0.0.1:${(server.address() as {port:number}).port}/dt/`,username:'fixture',version:'3.9.0'},'downtify_session=fixture')
 })
 afterEach(async()=>{await relay.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()))})
 it('keeps saved browsing away from discovery endpoints',async()=>{
  const data=await dtWorkspace(p,{mode:'saved'},()=>{});expect(data.tracks[0].saved).toBe(true);expect(data.playlists[0].title).toBe('Favorites');expect(requests.map(r=>r.path)).toEqual(['/dt/tracks','/dt/playlists'])
 })
 it('opens real artist profiles and release metadata without downloading',async()=>{
  const data=await dtWorkspace(p,{mode:'artist',id:'24'},()=>{});expect(data.artists[0].title).toBe('Fixture artist');expect(data.albums[0].releaseType).toBe('Single');expect(data.tracks[0].title).toBe('Fixture discovery');expect(requests.every(r=>r.method==='GET')).toBe(true)
 })
 it('logs in using an HttpOnly session and tests the version with a reverse proxy prefix',async()=>{
  expect(await Downtify.login(p.connection.url,'fixture','password')).toBe('downtify_session=fixture')
  expect(requests[1].body).toEqual({username:'fixture',password:'password'});expect(await p.test()).toBe('3.9.0')
  await expect(new Downtify(p.connection,'expired').test()).rejects.toThrow('expired')
 })
 it('browses and streams without submitting any permanent downloads',async()=>{
  const [record]=await p.browse({serverId:'one',view:'discover'})
  const url=await p.streamPath(record);expect(url.pathname).toBe('/dt/api/stream/file');expect(url.searchParams.get('video_id')).toBe('abcdefghijk')
  const local=await relay.open(url,p.headers());expect(local).not.toContain('fixture')
  const response=await fetch(local,{headers:{Range:'bytes=2-4'}});expect(response.status).toBe(206);expect(response.headers.get('content-range')).toBe('bytes 2-4/10');expect(await response.text()).toBe('234')
  expect(requests.every(r=>r.method==='GET')).toBe(true)
  expect((await fetch(local+'/wrong')).status).toBe(404)
 })
 it('resolves discovery IDs through search without saving',async()=>{
  const record=normalizeDt({...song,song_id:'deezer-42'},'one')
  expect((await p.streamPath(record)).searchParams.get('video_id')).toBe('abcdefghijk')
  expect(requests[0].path).toBe('/dt/api/songs/search');expect(requests).toHaveLength(1)
 })
 it('saves only after the explicit download operation and preserves original metadata',async()=>{
  const record=normalizeDt(song,'one');await p.save(record)
  expect(requests).toHaveLength(1);expect(requests[0]).toMatchObject({path:'/dt/api/download/batch',method:'POST',body:{songs:[{name:song.name,artists:song.artists,youtube_id:song.song_id}],generate_m3u:false}})
 })
 it('plays external library files using the media route and does not download saved songs again',async()=>{
  const [record]=await p.browse({serverId:'one',view:'library'});expect((await p.streamPath(record)).pathname).toBe('/dt/media/ext/music/Fixture%20song.flac')
  await p.save(record);expect(requests).toHaveLength(1)
  expect(await p.playlists()).toEqual(['Favorites'])
 })
 it('refuses traversal and authenticated redirects',async()=>{
  for(const file of ['../private','/private','C:\\private','folder\\..\\private'])await expect(p.streamPath({...normalizeDt(song,'one'),file})).rejects.toThrow('Invalid')
  redirect=true;const local=await relay.open(await p.streamPath(normalizeDt(song,'one')),p.headers());expect((await fetch(local)).status).toBe(502)
 })
 it('keeps identities separate by server and media kind and rejects nonfinite duration',()=>{
  const a={kind:'downtify-track' as const,serverId:'one',trackId:'same'}
  expect(progressKey(a)).not.toBe(progressKey({...a,serverId:'two'}));expect(progressKey(a)).not.toBe(progressKey({...a,kind:'music-track'}))
  expect(normalizeDt({...song,duration:Infinity},'one').track.duration).toBe(0)
 })
})
