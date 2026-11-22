// Source-derived 3.13.0 fixture. Fictional identities only; no downloads or external requests.
const http=require('node:http');const {createHash}=require('node:crypto');
function createFixture(){
 let cursor=1,identity='qa-downtify-313',malformed=false,failWrite=false,libraryOnly=false;
 const likes=new Set(),hidden=new Map(),watches=[],shows=[{id:1,name:'QA Podcast',author:'QA Author',feed_url:'https://qa.invalid/feed',enabled:true,retention:0,interval_minutes:720,episode_count:2,downloaded_count:1}],episodes=[{id:11,show_id:1,title:'QA Episode One',duration_seconds:30,filename:'Podcasts/QA/One.wav',position_seconds:4,played:false},{id:12,show_id:1,title:'QA Episode Two',duration_seconds:30,filename:null,position_seconds:0,played:false}];
 let upgrade={state:'idle',categories:['artwork','lyrics','metadata'],counts:{lyrics:2,artwork:1,metadata:3}},doctor={job:null,last:{duplicates:{groups:[{files:['QA/One.flac','QA/Duplicate.flac']}]},playlists:{groups:[{paths:['QA/A.m3u','QA/B.m3u']}]},navidrome:{delete:[{id:'nav-duplicate'}]}},stale:[]};
 let tracks=['One','Two','Three'].map((title,i)=>({id:'t'+i,file:'QA/'+title+'.flac',title:'QA '+title,artist:'QA Artist',artists:['QA Artist'],album:'QA Album',album_artist:'QA Artist',album_id:'qa-album',artist_id:'qa-artist',duration:30,has_cover:false,revision:'r1'}));
 let playlists=[{name:'QA Manual',manual:true,mine:true,can_edit_tracks:true,owner:'qa',visibility:'private',track_ids:['t0','t1','t0']},{name:'QA Shared',manual:true,mine:false,can_edit_tracks:true,owner:'other',visibility:'shared',track_ids:['t1']},{name:'QA Imported',manual:false,mine:true,can_edit_tracks:false,owner:'qa',visibility:'private',track_ids:['t0']},{name:'QA Public',manual:true,mine:false,can_edit_tracks:false,owner:'other',visibility:'public',followed:false,track_ids:['t2']}];
 const requests=[],writes=[],sockets=new Set();
 const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://qa');const path=u.pathname.replace(/^\/downtify\//,'/');let text='';for await(const chunk of req)text+=chunk;const raw=req.headers['content-type']==='application/octet-stream',body=raw?{bytes:Buffer.byteLength(text)}:text?JSON.parse(text):typeof req.body==='string'?JSON.parse(req.body):req.body??{};requests.push({path,method:req.method,body});const send=(status,value,headers={})=>{res.writeHead(status,{'Content-Type':'application/json',...headers});res.end(JSON.stringify(value))};
 if(path==='/__state')return send(200,{cursor,tracks,playlists,requests:requests.slice(-200),writes,websockets:sockets.size});
 if(path==='/__control'){if(body.event){const payload=Buffer.from(JSON.stringify({type:body.event}));for(const socket of sockets)socket.write(Buffer.concat([Buffer.from([0x81,payload.length]),payload]))}if(body.libraryOnly!==undefined)libraryOnly=body.libraryOnly;if(body.rename){tracks[0].file='QA/Renamed.flac';tracks[0].title='QA Renamed';cursor++}if(body.identity)identity=body.identity;if(body.malformed!==undefined)malformed=body.malformed;if(body.stale)playlists[0].track_ids.push('t2');if(body.readonly)playlists[0].can_edit_tracks=false;if(body.failWrite!==undefined)failWrite=body.failWrite;return send(200,{ok:true})}
 if(path==='/api/songs/search'){
  const query=u.searchParams.get('query');const index=query==='QA Artist QA Playlist One'?0:query==='QA Artist QA Playlist Two'?1:-1;
  return send(200,index<0?[]:[{name:'QA Playlist '+(index?'Two':'One'),artists:['QA Artist'],duration:30,song_id:index?'lmnopqrstuv':'abcdefghijk',source:'youtube'}]);
 }
 if(path==='/api/song/url'){
  const link=u.searchParams.get('url');
  if(link==='https://www.deezer.com/playlist/98')return send(502,{detail:'Fixture upstream unavailable'});
  if(link==='https://www.deezer.com/playlist/97')return send(200,{unexpected:true});
  if(link==='https://www.deezer.com/playlist/96')return send(200,[]);
  if(link!=='https://www.deezer.com/playlist/99')return send(404,{detail:'Playlist not found'});
  return send(200,[0,1,0].map(i=>({name:'QA Playlist '+(i?'Two':'One'),artist:'QA Artist',album_name:'QA Album',duration:30,song_id:'deezer:'+(900+i),source:'deezer',url:'https://www.deezer.com/track/'+(900+i)})));
 }
 if(path==='/api/server/info')return send(200,{product:'Downtify',server_id:identity,api_version:1,version:'3.13.0',capabilities:{library_sync:true,playlist_editing:true,podcasts:true,lyrics:true,password_sign_in:true,pairing:true},library_only:libraryOnly});
 if(path==='/api/auth/login'){res.setHeader('Set-Cookie','downtify_session=qa; HttpOnly; Path=/');return send(200,{})}
 if(path==='/api/auth/ws-ticket')return send(200,{ticket:'qa-ticket'});
 if(path==='/api/auth/status')return send(200,{signed_in:true,via:req.headers.authorization?'device':'session',user:{username:'qa',role:'admin'}});
 if(path==='/api/version')return send(200,'3.13.0');
 if(path==='/api/auth/token'||path==='/api/auth/pair')return send(200,{token:'qa-disposable-token',server:{server_id:identity},user:{username:'qa',role:'admin'}});
 if(path==='/api/v1/library'){if(malformed)return send(200,{cursor:99,full:true,tracks:[{id:'broken'}]});if(req.headers['if-none-match']==='"qa-'+cursor+'"'){res.writeHead(304);return res.end()}const since=Number(u.searchParams.get('since')||0);return send(200,{cursor,full:since===0,tracks:since===cursor?[]:tracks,deleted:[]},{ETag:'"qa-'+cursor+'"'})}
 if(path==='/api/v1/playlists'&&req.method==='GET')return send(200,playlists.map(p=>({...p,count:p.track_ids.length,liked:false,cover:'',hidden_count:(hidden.get(p.name)||[]).length})));

 if(path==='/api/v1/playlists/hidden'&&req.method==='GET')return send(200,{name:u.searchParams.get('name'),songs:hidden.get(u.searchParams.get('name'))||[]});
 if(path==='/api/library/playlists/visibility'){const p=playlists.find(p=>p.name===body.name);if(req.headers.authorization||!p?.mine)return send(403,{});Object.assign(p,{visibility:body.visibility,shared_with:body.shared_with,editors:body.editors});writes.push({path,body});return send(200,p)}
 if(path==='/api/v1/playlists/hidden'&&req.method==='POST'){const p=playlists.find(p=>p.name===body.name);if(!p?.mine||p.manual)return send(409,{});let rows=hidden.get(p.name)||[];for(const id of body.hide||[]){p.track_ids=p.track_ids.filter(t=>t!==id);rows.push({key:'hidden-'+id,label:'Hidden '+id,track_id:id})}for(const key of body.show||[]){const h=rows.find(r=>r.key===key);if(h)p.track_ids.push(h.track_id);rows=rows.filter(r=>r.key!==key)}hidden.set(p.name,rows);writes.push({path,body});return send(200,{ok:true})}
 if(path==='/api/v1/likes'){if(req.method==='PUT'){if(body.liked)likes.add(body.track_id);else likes.delete(body.track_id);writes.push({path,body})}return send(200,{track_ids:[...likes]})}
 if(path==='/api/v1/tracks/metadata/batch'){const results=body.track_ids.map(id=>{const t=tracks.find(t=>t.id===id);if(!t)return {id,ok:false,error:'Not found'};if(body.revisions?.[id]&&body.revisions[id]!==t.revision)return {id,ok:false,error:'Stale revision',status:409};Object.assign(t,body.changes,{revision:'r'+(++cursor)});return {id,ok:true}});writes.push({path,body});return send(200,{results})}
 if(path==='/api/discover/listens'||path==='/api/activity/playback'){writes.push({path,body});return send(200,{ok:true})}
 if(path==='/api/monitor/playlists'&&req.method==='GET')return send(200,watches);
 if(path==='/api/monitor/playlists'&&req.method==='POST'){const w={id:watches.length+1,name:'QA Watch',kind:body.url.includes('/artist/')?'artist':'playlist',url:body.url,enabled:true,...body};watches.push(w);writes.push({path,body});return send(200,w)}
 if(path.startsWith('/api/monitor/wanted')){if(req.method!=='GET')writes.push({path,body});return send(200,{artists:watches.filter(w=>w.kind==='artist').map(watch=>({watch,releases:[],missing:{tracks:2},unchecked:1})),totals:{tracks:2,artists:watches.length},job:null})}
 const watch=/^\/api\/monitor\/playlists\/(\d+)(.*)$/.exec(path);
 if(watch){const w=watches.find(w=>w.id===Number(watch[1]));if(!w)return send(404,{});if(req.method!=='GET')writes.push({path,body});if(watch[2].startsWith('/releases'))return send(200,{releases:[{id:'qa-release',album_ids:['deezer:42'],name:'QA Release',state:'missing',have:0,total:2,choice:body.choice||'',section:'album'}],missing:{tracks:2},inventory:null});if(req.method==='PATCH')Object.assign(w,body);if(req.method==='DELETE')watches.splice(watches.indexOf(w),1);return send(200,w)}
 if(path==='/api/podcasts/search')return send(200,{results:[{name:'QA New Podcast',feed_url:'https://qa.invalid/new'}]});
 if(path==='/api/podcasts/resolve')return send(200,{show:{name:'QA New Podcast',feed_url:body.url},episodes:[]});
 if(path==='/api/podcasts/subscribe'){const show={id:2,...body,enabled:true};shows.push(show);writes.push({path,body});return send(200,show)}
 if(path==='/api/podcasts/shows')return send(200,shows);
 const show=/^\/api\/podcasts\/shows\/(\d+)(.*)$/.exec(path);
 if(show){const item=shows.find(s=>s.id===Number(show[1]));if(!item)return send(404,{});if(show[2]==='/episodes')return send(200,{show:item,episodes:episodes.filter(e=>e.show_id===item.id)});if(req.method!=='GET')writes.push({path,body,query:Object.fromEntries(u.searchParams)});if(req.method==='PATCH')Object.assign(item,body);if(req.method==='DELETE')shows.splice(shows.indexOf(item),1);return send(200,item)}
 const ep=/^\/api\/podcasts\/episodes\/(\d+)\/(playback|download)$/.exec(path);
 if(ep){const e=episodes.find(e=>e.id===Number(ep[1]));if(!e)return send(404,{});writes.push({path,body});if(ep[2]==='download')e.filename='Podcasts/QA/Two.wav';else Object.assign(e,body);return send(200,e)}
 if(path==='/api/doctor/slskd/files'){const offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||100);return send(200,{total:202,files:Array.from({length:202},(_,i)=>({file:'QA/Leftover-'+i+'.flac',bytes:1024})).slice(offset,offset+limit)})}
 if(path==='/api/doctor')return send(200,doctor);
 if(path.startsWith('/api/doctor/')){if(req.headers.authorization)return send(403,{});writes.push({path,body});return send(200,{ok:true,selected:body.files||body.paths||body.delete||[]})}
 if(path==='/api/library/upgrade')return send(200,upgrade);
 if(path.startsWith('/api/library/upgrade/')){if(req.headers.authorization)return send(403,{});writes.push({path,body});upgrade.state=path.endsWith('/start')||path.endsWith('/resume')?'running':path.endsWith('/pause')?'paused':'idle';return send(200,upgrade)}
 if(path==='/api/library/replace/candidates')return send(200,{candidates:[{video_id:'abcdefghijk',title:'QA Alternate',artist:'QA Artist',source:'youtube',duration:30}]});
 if(path==='/api/library/replace/upload'){if(req.headers.authorization)return send(403,{});writes.push({path,body,query:Object.fromEntries(u.searchParams)});return send(200,{ok:true})}
 if(path==='/api/library/replace'){if(req.headers.authorization)return send(403,{});writes.push({path,body});return send(200,{queued:true})}
 if(path.startsWith('/api/v1/playlists')&&req.method!=='GET'){
  let p=playlists.find(p=>p.name===body.name);
  if(path==='/api/v1/playlists'){if(p)return send(409,{});p={name:body.name,manual:true,mine:true,can_edit_tracks:true,track_ids:[]};playlists.push(p)}
  else {if(!p)return send(404,{});if(path.endsWith('/rename')){if(!p.mine)return send(403,{});p.name=body.new_name}
  else if(path.endsWith('/order')){if(!p.can_edit_tracks)return send(403,{});if(JSON.stringify([...p.track_ids].sort())!==JSON.stringify([...body.track_ids].sort()))return send(409,{});p.track_ids=body.track_ids}
  else if(path.endsWith('/tracks')){if(!p.can_edit_tracks)return send(403,{});for(const id of body.add||[])if(body.allow_duplicates||!p.track_ids.includes(id))p.track_ids.push(id);for(const e of body.remove_entries||[]){let seen=0;p.track_ids=p.track_ids.filter(id=>id!==e.track_id||seen++!==e.occurrence)}}
  else if(path.endsWith('/follow'))p.followed=req.method!=='DELETE';else return send(501,{detail:'Unmodeled playlist operation'})}
  writes.push({path,body});if(failWrite){failWrite=false;return send(503,{})}return send(200,{...p,count:p.track_ids.length})
 }
 if(path.match(/^\/api\/v1\/tracks\/[^/]+\/cover$/))return send(404,{detail:'The fictional track has no embedded cover.'});
 if(path.match(/^\/api\/v1\/tracks\/[^/]+\/lyrics$/))return send(200,{synced:'[00:00.00]QA synced lyric',plain:'QA synced lyric'});
 if(path==='/api/stream/file'||path.startsWith('/media/')||path.match(/^\/api\/v1\/tracks\/[^/]+\/stream$/)){const bytes=Buffer.alloc(44+48000*2*2*30);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(48000,24);bytes.writeUInt32LE(192000,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(bytes.length-44,40);const range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||''),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;if(start> end){res.writeHead(416);return res.end()}res.writeHead(range?206:200,{'Content-Type':'audio/wav','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})});return res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1))}
 if(path==='/api/discover/chart')return send(200,{tracks:[{song_id:'abcdefghijk',name:'QA Chart Song',source:'deezer',artists:['QA Artist'],duration:30}],albums:[{album_id:42,name:'QA Chart Album',artist:'QA Artist'}],artists:[{artist_id:24,name:'QA Artist'}],playlists:[{playlist_id:99,name:'QA Chart Playlist'}]});
 if(path==='/api/finder/search')return send(200,{songs:[],albums:[],artists:[]});
 if(path==='/api/discover')return send(200,{artists:[]});
 if(path==='/api/download/batch'){writes.push({path,body});return send(200,{job_ids:['qa-download'],count:body.songs?.length??0})}
 if(path==='/api/queue')return send(200,[]);
 return send(501,{detail:'Unmodeled operation; add its pinned contract before using it'});
 }catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({detail:String(e)}))}});
 server.on('upgrade',(req,socket)=>{const u=new URL(req.url,'http://qa');if(!u.pathname.endsWith('/api/ws')||u.searchParams.get('ticket')!=='qa-ticket'){socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');return}const accept=createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');sockets.add(socket);socket.on('data',data=>{if((data[0]&15)===8)socket.end(Buffer.from([0x88,0]))});socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>sockets.delete(socket))});
 const close=server.close.bind(server);server.close=(...args)=>{for(const socket of sockets)socket.destroy();return close(...args)};
 return server;
}
module.exports={createFixture};
