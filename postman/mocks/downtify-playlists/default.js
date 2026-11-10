// Source-derived Downtify 3.9.0 manual-playlist contract; no real files or downloads.
const http=require('http');
const songs=['One','Two','Three'].map((name,i)=>({file:`Music/${name}.flac`,name:`MC ${name}`,artist:'Generated artist',album_name:'Generated album',duration:30+i}));
let lists=[{name:'MC Manual',manual:true,mine:true,can_edit_tracks:true,visibility:'private',files:songs.slice(0,2).map(t=>t.file)},{name:'MC Imported',manual:false,mine:true,can_edit_tracks:false,files:[songs[0].file]},{name:'MC Shared',manual:true,mine:false,can_edit_tracks:true,visibility:'shared',files:[songs[1].file]}],writes=[],requests=[],failAfterWrite=false;
function publicRow(r){return {...r,count:r.files.length,liked:false,owner_id:r.mine?1:2,owner:r.mine?'fixture':'other',display_name:r.name};}
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://fixture'),p=u.pathname;let body=req.body;if(body==null){let text='';for await(const c of req){text+=c;if(text.length>100000)throw Error('Payload too large');}body=text?JSON.parse(text):{};}else if(typeof body==='string')body=JSON.parse(body||'{}');const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 if(p==='/__state')return send(200,{lists,writes,requests});
 if(p==='/__control'){if(body.stale){const r=lists.find(r=>r.name===body.stale);if(r)r.files=[...r.files].reverse();}if(body.readOnly){const r=lists.find(r=>r.name===body.readOnly);if(r){r.mine=false;r.can_edit_tracks=false;}}if(body.failAfterWrite!==undefined)failAfterWrite=body.failAfterWrite;return send(200,{ok:true});}
 requests.push({path:p,method:req.method});requests=requests.slice(-300);
 if(p==='/api/auth/status')return send(200,{auth_disabled:true,signed_in:true});
 if(p==='/api/version')return send(200,{version:'3.9.0'});
 if(p==='/playlists')return send(200,lists.map(publicRow));
 if(p==='/tracks'){const name=u.searchParams.get('playlist'),q=(u.searchParams.get('q')||'').toLowerCase(),r=lists.find(r=>r.name===name);return send(200,songs.filter(t=>(!name||r?.files.includes(t.file))&&(!q||t.name.toLowerCase().includes(q))));}
 if(req.method==='POST'&&p.startsWith('/api/library/playlists')){
  const r=lists.find(r=>r.name===body.name);let result;
  if(p==='/api/library/playlists'){if(!body.name||body.name.length>120)return send(400,{});if(r)return send(409,{});result={name:body.name,manual:true,mine:true,can_edit_tracks:true,visibility:'private',files:[]};lists.push(result);}
  else if(p==='/api/library/playlists/tracks'){if(!r)return send(404,{});if(!r.manual||!(r.mine||r.can_edit_tracks))return send(403,{});if((body.add||[]).some(f=>!songs.some(t=>t.file===f)))return send(400,{});const old=new Set(r.files),remove=new Set(body.remove||[]);r.files=[...r.files.filter(f=>!remove.has(f)),...new Set((body.add||[]).filter(f=>!old.has(f)&&!remove.has(f)))];result=r;}
  else if(p==='/api/library/playlists/rename'){if(!r||!r.manual||!r.mine)return send(403,{});if(lists.some(x=>x!==r&&x.name===body.new_name))return send(409,{});r.name=body.new_name;result=r;}
  else return send(501,{error:'Unmodeled operation'});
  writes.push({path:p,body});if(failAfterWrite){failAfterWrite=false;return send(503,{error:'Applied but response unavailable'});}return send(200,publicRow(result));
 }
 return send(501,{error:'Not modeled by the playlist fixture'});
}catch(e){res.writeHead(500);res.end(JSON.stringify({error:String(e.message).slice(0,100)}));}}).listen(process.env.PORT||18552,'127.0.0.1');
