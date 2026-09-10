import {applyMetadata} from '../shared/personal-state'
import {progressKey} from '../shared/timeline'
import type {PersonalState} from '../shared/personal-library'
import {readdir,stat} from 'node:fs/promises'
import {relative,resolve,extname,basename,dirname} from 'node:path'
import {randomUUID} from 'node:crypto'
import {LocalFiles} from './local'
import type {Store} from './store'
import type {LocalFile} from '../shared/types'
import {localAlbumKey,type LocalQuery,type LocalPageData,type LocalGroup,type LocalPlaylist,type LocalPlaylistCommand} from '../shared/local-library'
interface Index {version?:number;files:LocalFile[];updatedAt:number;warnings:string[]}
const extensions=new Set(['.mp3','.flac','.wav','.wave','.m4a','.m4b','.aac','.ogg','.opus','.aiff','.aif','.ape','.alac','.wma','.dsf','.dff','.wv','.mka','.ac3'])
export class LocalLibrary {
 private scans=new Map<string,Promise<Index>>()
 constructor(private store:Store,private local:LocalFiles){}
 private async scan(rootId:string):Promise<Index>{
  const root=this.local.roots().find(r=>r.id===rootId);if(!root)throw Error('Choose a local source.')
  const result:Index={version:3,files:[],updatedAt:Date.now(),warnings:[]},pending=[''],seen=new Set<string>();let entriesRead=0
  while(pending.length){
   const folder=pending.shift()!
   try{
    const path=await this.local.path(rootId,folder,false);if(seen.has(path.toLowerCase()))continue;seen.add(path.toLowerCase())
    const entries=await readdir(path,{withFileTypes:true})
    for(let i=0;i<entries.length;i+=6){
     if(entriesRead>=100000||result.files.length>=50000||seen.size>=5000){result.warnings.push('Index limit reached (50,000 tracks / 5,000 folders / 100,000 entries). Choose smaller source folders to index the rest.');pending.length=0;break}
     await Promise.all(entries.slice(i,i+6).map(async entry=>{entriesRead++;const id=relative(root.path,resolve(path,entry.name));try{
      const target=await this.local.path(rootId,id,false),info=await stat(target)
      if(info.isDirectory()){if(!seen.has(target.toLowerCase()))pending.push(id)}
      else if(info.isFile()&&extensions.has(extname(entry.name).toLowerCase())){const metadata=await this.local.metadata(rootId,id);if(result.files.length<50000)result.files.push(metadata)}
     }catch{if(result.warnings.length<50)result.warnings.push(`Could not index ${id}.`)}}))
    }
   }catch{if(result.warnings.length<50)result.warnings.push(`Could not read ${folder||root.name}.`)}
  }
  if(!this.local.roots().some(r=>r.id===rootId))throw Error('This source was removed during indexing.')
  const old=this.store.get<Index>(`local-index:${rootId}`)
  if(old){
   const currentIds=new Set(result.files.map(f=>f.id)),identities=new Map<string,string[]>()
   for(const f of result.files)if(f.fileIdentity){const ids=identities.get(f.fileIdentity)??[];ids.push(f.id);identities.set(f.fileIdentity,ids)}
   const moved=new Map<string,string>()
   for(const f of old.files)if(!currentIds.has(f.id)&&f.fileIdentity){const candidates=identities.get(f.fileIdentity);if(candidates?.length===1)moved.set(f.id,candidates[0])}
   if(moved.size){const remap=(id:string)=>moved.get(id)??id;this.store.set(`local-favorites:${rootId}`,[...new Set((this.store.get<string[]>(`local-favorites:${rootId}`)??[]).map(remap))]);this.store.set(`local-playlists:${rootId}`,(this.store.get<LocalPlaylist[]>(`local-playlists:${rootId}`)??[]).map(p=>({...p,files:p.files.map(remap)})))}
  }
  this.store.set(`local-index:${rootId}`,result);return result
 }
 async index(rootId:string,refresh=false):Promise<Index>{
  if(!this.local.roots().some(r=>r.id===rootId))throw Error('Choose a local source.')
  const running=this.scans.get(rootId);if(running){await running;return refresh?this.index(rootId,true):this.store.get<Index>(`local-index:${rootId}`)!}
  const cached=this.store.get<Index>(`local-index:${rootId}`);if(cached?.version===3&&!refresh)return cached
  const work=this.scan(rootId).finally(()=>this.scans.delete(rootId));this.scans.set(rootId,work);return work
 }
 async favorite(rootId:string,fileId:string,favorite:boolean){await this.local.path(rootId,fileId);const ids=new Set(this.store.get<string[]>(`local-favorites:${rootId}`)??[]);favorite?ids.add(fileId):ids.delete(fileId);this.store.set(`local-favorites:${rootId}`,[...ids])}
 async playlist(input:LocalPlaylistCommand){
  if(!this.local.roots().some(r=>r.id===input.rootId))throw Error('Choose a local source.')
  const key=`local-playlists:${input.rootId}`,lists=this.store.get<LocalPlaylist[]>(key)??[]
  if(input.action==='delete'){this.store.set(key,lists.filter(p=>p.id!==input.id));return}
  if(input.action==='create'&&lists.length>=100)throw Error('This source already has 100 playlists.')
  for(const file of input.files)await this.local.path(input.rootId,file)
  if(input.action==='update'){if(!lists.some(p=>p.id===input.id))throw Error('This playlist no longer exists.');this.store.set(key,lists.map(p=>p.id===input.id?{...p,name:input.name,files:input.files}:p))}
  else this.store.set(key,[...lists,{id:randomUUID(),name:input.name,files:input.files}])
 }
 async query(input:LocalQuery):Promise<LocalPageData>{
  const index=await this.index(input.rootId,input.refresh),favorites=new Set(this.store.get<string[]>(`local-favorites:${input.rootId}`)??[])
  const recent=new Map(this.store.history().filter(h=>h.item.target.kind==='local-file'&&h.item.target.rootId===input.rootId).map(h=>[h.item.target.kind==='local-file'?h.item.target.fileId:'',h.playedAt]))
  const playlists=this.store.get<LocalPlaylist[]>(`local-playlists:${input.rootId}`)??[]
  const overrides=this.store.get<PersonalState>('personal-library')?.metadata??{}
  let files=index.files.map(f=>applyMetadata(f,overrides[progressKey({kind:'local-file',serverId:'local',rootId:input.rootId,fileId:f.id})])).filter(f=>`${f.title} ${f.artist} ${f.album} ${f.genre??''}`.toLowerCase().includes(input.search.toLowerCase()))
  const groupKey=(f:LocalFile)=>input.view==='albums'?localAlbumKey(f):input.view==='artists'?(f.albumArtist||f.artist||'Unknown artist'):(f.genre||'Uncategorized')
  let groups:LocalGroup[]=[]
  if(['albums','artists','genres'].includes(input.view)){
   if(input.group!==undefined)files=files.filter(f=>groupKey(f)===input.group)
   else {const map=new Map<string,LocalGroup>();for(const f of files){const id=groupKey(f),g=map.get(id);if(g)g.count++;else map.set(id,{id,title:input.view==='albums'?(f.album||(dirname(f.id)==='.'?'Unsorted audio':basename(dirname(f.id)))):id,subtitle:input.view==='albums'?(f.albumArtist||f.artist||'Unknown artist'):'Local collection',count:1,fileId:f.id})}groups=[...map.values()]}
  }
  if(input.view==='playlists'){
   if(input.group){const ids=playlists.find(p=>p.id===input.group)?.files??[],byId=new Map(files.map(f=>[f.id,f]));files=ids.flatMap(id=>byId.has(id)?[byId.get(id)!]:[])}
   else groups=playlists.filter(p=>p.name.toLowerCase().includes(input.search.toLowerCase())).map(p=>({id:p.id,title:p.name,subtitle:'Local playlist',count:p.files.length,fileId:p.files[0]}))
  }
  if(input.view==='favorites')files=files.filter(f=>favorites.has(f.id))
  if(input.view==='recent')files=files.filter(f=>recent.has(f.id))
  if(input.view!=='playlists'||!input.group)files.sort((a,b)=>input.view==='recent'?(recent.get(b.id)??0)-(recent.get(a.id)??0):input.view==='newest'?b.modified-a.modified:input.view==='albums'&&input.group?(a.discNumber??1)-(b.discNumber??1)||(a.trackNumber??0)-(b.trackNumber??0)||a.name.localeCompare(b.name):input.sort==='duration'?b.duration-a.duration:input.sort==='year'?(b.year??0)-(a.year??0):String(a[input.sort]??'').localeCompare(String(b[input.sort]??''),undefined,{numeric:true}))
  groups.sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}))
  const grouped=['albums','artists','genres','playlists'].includes(input.view)&&input.group===undefined
  return {tracks:grouped?[]:files.slice(input.page*100,(input.page+1)*100).map(f=>({...f,favorite:favorites.has(f.id)})),groups:groups.slice(input.page*100,(input.page+1)*100),total:grouped?groups.length:files.length,trackCount:index.files.length,page:input.page,updatedAt:index.updatedAt,warnings:index.warnings}
 }
}
