import type {DtWorkspace,DtShelf} from '../shared/downtify'
import {Downtify,normalizeDt,type DtRecord} from './providers/downtify'

export function savedShelves(records:DtRecord[],names:string[]):DtWorkspace {
 const tracks=records.map(r=>r.track),albums=new Map<string,DtShelf>(),artists=new Map<string,DtShelf>()
 for(const r of records){const t=r.track
  for(const name of r.artists?.filter(Boolean)??[t.artist]){if(!name)continue;const old=artists.get(name);artists.set(name,{id:name,title:name,artist:name,serverId:t.serverId,coverId:old?.coverId??t.id,kind:'artist',saved:true,count:(old?.count??0)+1})}
  if(t.album){const key=JSON.stringify([t.artist,t.album]),old=albums.get(key);albums.set(key,{id:key,title:t.album,artist:t.artist,serverId:t.serverId,coverId:old?.coverId??t.id,kind:'album',saved:true,count:(old?.count??0)+1})}
 }
 return {tracks,albums:[...albums.values()],artists:[...artists.values()],playlists:names.map(name=>({id:name,title:name,artist:'Saved playlist',serverId:tracks[0]?.serverId??'',coverId:'',kind:'playlist',saved:true})),warnings:[]}
}
export async function dtWorkspace(p:Downtify,q:{mode:'saved'|'discover'|'artist'|'album';query?:string;id?:string},cache:(r:DtRecord)=>void):Promise<DtWorkspace>{
 const result:DtWorkspace={tracks:[],albums:[],artists:[],playlists:[],warnings:[]}
 const songs=(rows:any[])=>rows.map(row=>{const r=normalizeDt(row,p.connection.id);cache(r);return r.track})
 const shelf=(rows:any[],kind:'album'|'artist'):DtShelf[]=>rows.filter(r=>/^\d+$/.test(String(r[kind+'_id']??r.deezer_id))).map(r=>{
  const id=String(r[kind+'_id']??r.deezer_id),coverId=`${kind}-${id}`,title=String(r.name??r.title??'')
  cache({track:{id:coverId,serverId:p.connection.id,title,artist:String(r.artist??''),album:'',duration:0,saved:false},file:'',video:'',url:'',cover:String(r.cover_url??r.picture_url??'')})
  return {id,title,coverId,serverId:p.connection.id,kind,artist:String(r.artist??''),saved:false,year:String(r.year??r.release_date??''),releaseType:String(r.release_type??r.record_type??r.album_type??''),reason:Array.isArray(r.because)&&r.because.length?`Because you like ${r.because.join(', ')}`:undefined}
 })
 if(q.mode==='saved'){
  const records=await p.browse({serverId:p.connection.id,view:'library'});records.forEach(cache)
  let playlists:any[]=[];try{const rows=await p.json('playlists');if(!Array.isArray(rows))throw Error('Unsupported playlists');playlists=rows}catch{result.warnings.push('Saved playlists could not be loaded.')}
  const saved=savedShelves(records,playlists.map(r=>typeof r==='string'?r:String(r.name??'')).filter(Boolean));saved.playlists.forEach(c=>{c.serverId=p.connection.id;const row=playlists.find(r=>r.name===c.title);if(Array.isArray(row?.files)){c.count=row.files.length;c.coverId=records.find(r=>row.files.includes(r.file))?.track.id??''}});return {...saved,warnings:result.warnings}
 }
 if(q.mode==='artist'){
  const data=await p.json('api/finder/artist',{artist_id:q.id!});result.artists=shelf([data],'artist');result.description=String(data.bio_html??'');result.tracks=songs(data.top_songs??[])
  try{const albums=await p.json('api/finder/artist/albums',{artist_id:q.id!});result.albums=shelf(Array.isArray(albums)?albums:albums.albums??[],'album')}catch{result.warnings.push('Discography unavailable. Try refreshing.')}
  return result
 }
 if(q.mode==='album'){const data=await p.json('api/finder/album',{album_id:q.id!});result.tracks=songs(data.tracks??data.songs??[]);return result}
 const data=await p.json(q.query?'api/finder/search':'api/discover/chart',q.query?{query:q.query,limit:'30'}:{limit:'30'})
 result.tracks=songs(data.songs??data.tracks??[]);result.albums=shelf(data.albums??[],'album');result.artists=shelf(data.artists??[],'artist')
 if(!q.query){try{
  const records=await p.browse({serverId:p.connection.id,view:'library'}),saved=savedShelves(records,[])
  if(saved.artists.length){const suggested=await p.json('api/discover',{}, {library:saved.artists.map(a=>({name:a.title,tracks:a.count,liked:0}))});const artists=shelf(suggested.artists??[],'artist');if(artists.length)result.artists=artists;if(suggested.partial)result.warnings.push('Some artist suggestions are temporarily unavailable.')}
 }catch{result.warnings.push('Personal artist suggestions unavailable; showing trending artists.')}}
 return result
}
