import {dialog} from 'electron'
import {createReadStream} from 'node:fs'
import {stat} from 'node:fs/promises'
import {basename,extname} from 'node:path'
import type {Downtify} from './providers/downtify'
import type {DtManage,DtPanel,DtPanelData} from '../shared/downtify'
const segment=(id?:string)=>{if(!id||!/^\d+$/.test(id))throw Error('Choose a server item.');return encodeURIComponent(id)}
const adminActions=['doctor-','upgrade-','replace']
const record=async(p:Downtify,id?:string)=>{if(!id)throw Error('Choose a saved track.');await p.client!.sync();return p.client!.record(id)}
export async function dtPanel(p:Downtify,input:{panel:DtPanel;id?:string;query?:string}):Promise<DtPanelData>{
 const status=await p.client!.status();if(!status.modern)throw Error('Update this Downtify server to use its current client API.')
 let data:any
 switch(input.panel){
  case 'watches':data=await p.json('api/monitor/playlists');break
  case 'wanted':data=await p.json('api/monitor/wanted');return {rows:data.artists??[],summary:data.totals,job:data.job}
  case 'releases':data=await p.json(`api/monitor/playlists/${segment(input.id)}/releases`);return {rows:data.releases??[],summary:{...data.counts,...data.missing},job:data.inventory}
  case 'shows':if(!status.capabilities.podcasts)throw Error('This server does not advertise podcasts.');data=input.query?await p.json('api/podcasts/search',{q:input.query}):await p.json('api/podcasts/shows');if(input.query)data=data.results;break
  case 'episodes':data=await p.json(`api/podcasts/shows/${segment(input.id)}/episodes`,{include_dismissed:'true'});return {rows:(data.episodes??[]).map((ep:any)=>{const local=p.client!.resume(input.id!,String(ep.id));return {...ep,...(local?.syncPending?{local_position:local.position}:{}),resume_revision:JSON.stringify([ep.position_seconds,local?.updatedAt])}}),summary:data.show}
  case 'slskd':if(!status.webAdmin)throw Error('Verified leftovers require an administrator web-session connection.');{const offset=Number(input.id??0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000000)throw Error('Invalid result page.');data=await p.json('api/doctor/slskd/files',{offset:String(offset),limit:'200'});if(!Array.isArray(data.files))throw Error('Verified file results are unavailable.');return {rows:data.files,summary:{total:data.total,offset,next:offset+data.files.length<Number(data.total)?offset+data.files.length:null}}}
  case 'doctor':if(!status.webAdmin)throw Error('Doctor needs an administrator web-session connection. Device tokens cannot administer this server.');data=await p.json('api/doctor');return {rows:Object.entries(data.last??{}).map(([kind,value])=>({kind,name:kind,result:value,stale:(data.stale??[]).includes(kind)})),job:data.job,summary:{holding_queue:data.holding_queue,stale:data.stale}}
  case 'upgrade':if(!status.webAdmin)throw Error('Library upgrades need an administrator web-session connection.');data=await p.json('api/library/upgrade');return {rows:[],summary:{counts:data.counts,summary:data.summary,categories:data.categories,artwork_sources:data.artwork_sources},job:data.job??{state:data.state,run:data.run,scan:data.scan}}
  case 'replacement':if(!status.webAdmin)throw Error('Replacing audio needs an administrator web-session connection.');data=await p.json('api/library/replace/candidates',{file:(await record(p,input.id)).file,...(input.query?{query:input.query}:{})});return {rows:data.candidates??[],summary:data.track}
  case 'likes':data=await p.json('api/v1/likes');return {rows:(data.track_ids??[]).map((id:string)=>({id}))}
  case 'hidden':data=await p.json('api/v1/playlists/hidden',{name:input.id??''});return {rows:data.songs??[]}
 }
 if(!Array.isArray(data))throw Error('This Downtify server returned an unsupported listing.');return {rows:data}
}
export async function dtManage(p:Downtify,input:DtManage){
 const status=await p.client!.status();if(!status.modern)throw Error('Update this Downtify server to use its current client API.')
 if(adminActions.some(prefix=>input.action.startsWith(prefix))&&!status.webAdmin)throw Error('This operation needs an administrator web-session connection.')
 const confirm=()=>{if(!input.confirmed)throw Error('Review and confirm this server operation first.')},id=()=>segment(input.id)
 const files=()=>{if(!input.files?.length)throw Error('Select specific files from the current health check.');return input.files}
 let result:any
 switch(input.action){
  case 'watch-add':confirm();if(!input.url||!input.kind)throw Error('Enter an artist or playlist URL.');p.client!.assertExternal();result=await p.json('api/monitor/playlists',{}, {url:input.url,interval_minutes:input.interval??360,...(input.kind==='artist'?{new_only:input.newOnly??true,release_types:input.releaseTypes??['album','single','ep']}:{})});break
  case 'watch-update':result=await p.json(`api/monitor/playlists/${id()}`,{}, {...(input.enabled!==undefined?{enabled:input.enabled}:{}),...(input.interval?{interval_minutes:input.interval}:{})},'PATCH');break
  case 'watch-check':result=await p.json(`api/monitor/playlists/${id()}/check`,{},{});break
  case 'watch-stop':confirm();result=await p.json(`api/monitor/playlists/${id()}`,{},undefined,'DELETE');break
  case 'inventory':result=await p.json(`api/monitor/playlists/${id()}/releases/inventory`,{},{});break
  case 'download-missing':confirm();result=await p.json(`api/monitor/playlists/${id()}/releases/download-missing`,{},{});break
  case 'release-choice':confirm();if(!input.albumIds?.length||input.choice===undefined)throw Error('Choose a release and monitoring rule.');result=await p.json(`api/monitor/playlists/${id()}/releases`,{}, {album_ids:input.albumIds,choice:input.choice},'PATCH');break
  case 'wanted-check':result=await p.json('api/monitor/wanted/check-all',{},{});break
  case 'wanted-download':confirm();p.client!.assertExternal();result=await p.json('api/monitor/wanted/download-all',{},{});break
  case 'wanted-stop':result=await p.json('api/monitor/wanted/stop',{},{});break
  case 'podcast-resolve':if(!input.url)throw Error('Enter a feed or podcast link.');return p.json('api/podcasts/resolve',{}, {url:input.url})
  case 'podcast-subscribe':confirm();if(!input.url||!input.name)throw Error('Preview and name this podcast first.');result=await p.json('api/podcasts/subscribe',{}, {feed_url:input.url,name:input.name,retention:input.retention??0,interval_minutes:input.interval??720});break
  case 'podcast-update':confirm();result=await p.json(`api/podcasts/shows/${id()}`,{}, {...(input.enabled!==undefined?{enabled:input.enabled}:{}),...(input.interval?{interval_minutes:input.interval}:{}),...(input.retention!==undefined?{retention:input.retention}:{})},'PATCH');break
  case 'podcast-unsubscribe':confirm();result=await p.json(`api/podcasts/shows/${id()}`,{keep_files:'true'},undefined,'DELETE');break
  case 'episode-download':confirm();result=await p.json(`api/podcasts/episodes/${id()}/download`,{},{});break
  case 'episode-played':result=await p.json(`api/podcasts/episodes/${id()}/playback`,{}, {played:input.enabled===true},'PUT');break
  case 'track-like':if(!input.trackIds?.length||input.enabled===undefined)throw Error('Choose tracks and a like state.');{const results=[];for(const id of input.trackIds){try{const r=await record(p,id);if(!r.remoteId)throw Error('Refresh saved music first.');await p.json('api/v1/likes',{}, {track_id:r.remoteId,liked:input.enabled},'PUT');results.push({id,ok:true})}catch{results.push({id,ok:false,error:'Like was not confirmed. Refresh before retrying.'})}}return {results}}
  case 'metadata':confirm();if(!input.trackIds?.length||!input.changes||!Object.keys(input.changes).length)throw Error('Select tracks and metadata fields.');{
   const rows=await Promise.all(input.trackIds.map(id=>record(p,id)));if(rows.some(r=>!r.remoteId))throw Error('Refresh saved tracks before editing metadata.');const revisions=Object.fromEntries(rows.filter(r=>input.revisions?.[r.track.id]).map(r=>[r.remoteId,input.revisions![r.track.id]]));result=await p.json('api/v1/tracks/metadata/batch',{}, {track_ids:rows.map(r=>r.remoteId),changes:input.changes,revisions},'PATCH');await p.client!.sync(true);break
  }
  case 'doctor-scan':result=await p.json('api/doctor/scan',{},{});break
  case 'doctor-cancel':result=await p.json('api/doctor/cancel',{},{});break
  case 'doctor-preview':result=await p.json('api/doctor/playlists/preview',{}, {paths:files()});break
  case 'doctor-merge':confirm();result=await p.json('api/doctor/playlists/merge',{}, {paths:files()});break
  case 'doctor-nav-repair':confirm();result=await p.json('api/doctor/navidrome/repair',{}, {delete:files()});break
  case 'doctor-duplicates':confirm();if(!input.keep)throw Error('Select the copy to keep.');result=await p.json('api/doctor/duplicates/merge',{}, {keep:input.keep,remove:files()});break
  case 'doctor-keep':result=await p.json('api/doctor/duplicates/keep',{}, {files:files()});break
  case 'doctor-slskd-scan':result=await p.json('api/doctor/slskd/scan',{},{});break
  case 'doctor-slskd-clean':confirm();result=await p.json('api/doctor/slskd/clean',{}, {files:files()});break
  case 'doctor-slskd-release':result=await p.json('api/doctor/slskd/release',{},{});break
  case 'upgrade-scan':result=await p.json('api/library/upgrade/scan',{},{});break
  case 'upgrade-start':confirm();if(!input.categories?.length)throw Error('Choose the categories to upgrade.');{const current=await p.json('api/library/upgrade');if(!Array.isArray(current.categories)||input.categories.some(c=>!current.categories.includes(c)))throw Error('The server does not advertise these upgrade categories. No upgrade was started.');result=await p.json('api/library/upgrade/start',{}, {categories:input.categories});break}
  case 'upgrade-resume':confirm();result=await p.json('api/library/upgrade/resume',{},{});break
  case 'upgrade-pause':result=await p.json('api/library/upgrade/pause',{},{});break
  case 'upgrade-cancel':result=await p.json('api/library/upgrade/cancel',{},{});break
  case 'playlist-share':confirm();if(!status.webSession)throw Error('Sharing changes require a web-session connection.');if(!input.name||!input.visibility)throw Error('Choose a playlist and visibility.');{const list=await p.client!.playlist(input.name);if(!list.mine||list.liked)throw Error('Only an owner can share a non-liked playlist.');result=await p.json('api/library/playlists/visibility',{}, {name:input.name,visibility:input.visibility,shared_with:input.users??[],editors:input.editors??[]},'PUT');break}
  case 'replace':confirm();if(!input.trackIds?.[0]||!input.videoId)throw Error('Choose a saved track and replacement candidate.');result=await p.json('api/library/replace',{}, {file:(await record(p,input.trackIds[0])).file,video_id:input.videoId});break
 }
 return result
}
export async function dtReplaceFile(p:Downtify,trackId:string){
 const status=await p.client!.status();if(!status.webAdmin)throw Error('Replacing audio needs an administrator web-session connection.')
 const track=await record(p,trackId),pick=await dialog.showOpenDialog({title:'Choose replacement audio',properties:['openFile'],filters:[{name:'Audio',extensions:['mp3','flac','m4a','ogg','opus','wav','aiff','aif','aac','webm']}]});if(pick.canceled||!pick.filePaths[0])return {cancelled:true,message:'No audio was replaced.'}
 const file=pick.filePaths[0],info=await stat(file);if(!info.isFile()||info.size<=0||info.size>400*1024*1024||!/^\.(mp3|flac|m4a|ogg|opus|wav|aiff|aif|aac|webm)$/i.test(extname(file)))throw Error('Choose a supported audio file up to 400 MB.')
 const confirmation=await dialog.showMessageBox({type:'warning',title:'Replace server audio?',message:`Replace “${track.track.title}” with ${basename(file)}?`,detail:'This uploads the selected audio to Downtify. A different format is converted using the server settings; playlists and tags are retained.',buttons:['Keep existing audio','Replace audio'],defaultId:0,cancelId:0});if(confirmation.response!==1)return {cancelled:true,message:'No audio was replaced.'}
 const response=await fetch(p.url('api/library/replace/upload',{file:track.file,name:basename(file)}),{method:'POST',headers:{...p.headers(),'Content-Type':'application/octet-stream','Content-Length':String(info.size)},body:createReadStream(file) as any,duplex:'half',redirect:'error',signal:AbortSignal.timeout(300000)} as RequestInit);if(!response.ok)throw Error(`Replacement was not confirmed (HTTP ${response.status}). Check the server before retrying.`);await response.body?.cancel();await p.client!.sync(true);return {cancelled:false,message:'The replacement was accepted and the library refreshed.'}
}
