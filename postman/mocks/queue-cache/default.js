// Navidrome 0.60.3 Subsonic-compatible stand-in; identities and media are fictional.
const http=require('http'),crypto=require('crypto');const events=[];
const maximumSeconds=process.env.MEDIA_CENTER_QUEUE_FIXTURE_LARGE==='1'?3600:120;
const seconds=Number(process.env.MEDIA_CENTER_QUEUE_FIXTURE_SECONDS||120);if(!Number.isInteger(seconds)||seconds<1||seconds>maximumSeconds)throw Error('Invalid generated fixture duration');
const chunkMs=Number(process.env.MEDIA_CENTER_QUEUE_FIXTURE_CHUNK_MS||0);if(!Number.isInteger(chunkMs)||chunkMs<0||chunkMs>5000)throw Error("Invalid generated fixture throttle");
let fail=false;
const count=Number(process.env.MEDIA_CENTER_QUEUE_FIXTURE_TRACKS||4);if(!Number.isInteger(count)||count<4||count>10000)throw Error('Invalid generated catalog size');
const ids=['current','one','two','three',...Array.from({length:count-4},(_,i)=>String(i+4).padStart(5,'0'))];
const songs=ids.map((id,i)=>({id:'mc-ahead-'+id,title:'MC Ahead '+id,artist:'Generated fixture',album:'MC Ahead Album',albumId:'mc-ahead-album',duration:seconds,suffix:'wav',coverArt:'mc-ahead-cover',track:i+1,size:20*1024*1024}));
const byteLength=44+96000*seconds,header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(byteLength-8,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(48000,24);header.writeUInt32LE(96000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(byteLength-44,40);
// Generate even the prolonged-transfer original in bounded blocks, never one huge allocation.
const block=(at,until)=>{const bytes=Buffer.alloc(until-at);if(at<44)header.copy(bytes,0,at,Math.min(until,44));return bytes;};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://fixture');if(url.pathname==='/__control'){let body=req.body;if(body===undefined||body===null){body='';for await(const chunk of req)body+=chunk;}const control=typeof body==='string'?JSON.parse(body||'{}'):body;fail=control.fail===true;res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true}));}if(url.pathname==='/__state'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({events,fail}));}
 let raw='';if(req.body!==undefined&&req.body!==null)raw=typeof req.body==='string'?req.body:new URLSearchParams(req.body).toString();else for await(const chunk of req){raw+=chunk;if(raw.length>65536)throw Error('Request too large');}const p=req.method==='GET'?url.searchParams:new URLSearchParams(raw);const method=url.pathname.match(/^\/rest\/([A-Za-z0-9]+)\.view$/)?.[1];
 const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
 if(p.get('u')!=='fixture-user'||p.get('t')!==crypto.createHash('md5').update('fixture-secret'+p.get('s')).digest('hex'))return send(401,{error:'Fictional credentials required'});
 if(fail)return send(503,{error:'Generated fixture outage'});
 events.push({method:req.method,operation:method,id:p.get('id'),range:req.headers.range||''});if(events.length>1000)events.shift();const out={'subsonic-response':{status:'ok',version:'1.16.1',serverVersion:'fixture-0.60.3'}};const body=out['subsonic-response'];
 if(method==='stream'){if(!songs.some(s=>s.id===p.get('id')))return send(404,{error:'Unknown fixture track'});const range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');const start=range?Number(range[1]):0,end=Math.min(byteLength-1,range?.[2]?Number(range[2]):byteLength-1);if(start>end||start>=byteLength){res.writeHead(416,{'Content-Range':'bytes */'+byteLength});return res.end();}res.writeHead(range?206:200,{'Content-Type':'audio/wav','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${byteLength}`}:{})});if(chunkMs){let at=start;const timer=setInterval(()=>{if(res.destroyed){clearInterval(timer);return;}if(res.writableNeedDrain)return;const until=Math.min(at+65536,end+1);res.write(block(at,until));at=until;if(at>end){clearInterval(timer);res.end();}},chunkMs);res.on('close',()=>clearInterval(timer));return;}let at=start;const pump=()=>{while(at<=end&&!res.destroyed){const until=Math.min(at+65536,end+1),bytes=block(at,until);at=until;if(!res.write(bytes)){res.once('drain',pump);return;}}if(!res.destroyed)res.end();};pump();return;}
 if(method==='ping')return send(200,out);
 if(method==='getMusicFolders')body.musicFolders={musicFolder:[{id:'1',name:'MC Ahead Music'}]};
 else if(method==='getAlbumList2')body.albumList2={album:Number(p.get('offset')||0)?[]:[{id:'mc-ahead-album',name:'MC Ahead Album',artist:'Generated fixture',songCount:songs.length,coverArt:'mc-ahead-cover'}]};
 else if(method==='getAlbum')body.album={id:'mc-ahead-album',name:'MC Ahead Album',artist:'Generated fixture',song:songs};
 else if(method==='getSong'){body.song=songs.find(s=>s.id===p.get('id'));if(!body.song)return send(404,{error:'Unknown fixture track'});}
 else if(method==='getRandomSongs')body.randomSongs={song:songs.slice(0,Math.max(0,Math.min(80,Number(p.get('size')||80))))};
 else if(method==='getStarred2')body.starred2={song:[],album:[],artist:[]};
 else if(method==='getArtists')body.artists={index:[]};
 else if(method==='getPlaylists')body.playlists={playlist:[]};
 else if(method==='search3'){const query=(p.get('query')||'').toLowerCase();const rows=songs.filter(s=>!query||s.title.toLowerCase().includes(query));const offset=Number(p.get('songOffset')||0),count=Number(p.get('songCount')||40);body.searchResult3={song:rows.slice(offset,offset+count),album:[],artist:[]};}
 else if(method==='getCoverArt'){res.writeHead(200,{'Content-Type':'image/png'});return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));}
 else return send(501,{error:'Operation not modeled by queue fixture'});
 send(200,out);
 }catch(e){res.writeHead(500);res.end(JSON.stringify({error:String(e.message).slice(0,200)}));}}).listen(process.env.PORT||18547,'127.0.0.1');
