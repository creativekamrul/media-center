import type {JfBrowse,JfItem,JfLibrary} from '../../shared/jellyfin'
export type MediaLibrary=JfLibrary&{serverId:string;serverName:string}
export type JellyfinRoute={library:MediaLibrary;item?:JfItem}
export function openJellyfin(route:JellyfinRoute){window.dispatchEvent(new CustomEvent('open-jellyfin',{detail:route}))}
export function navigateMedia(page:string){window.dispatchEvent(new CustomEvent('app-navigate',{detail:page}))}
export async function jellyfinLibraries(){
 const connections=await window.mediaCenter.jfConnections(),libraries:MediaLibrary[]=[],warnings:string[]=[]
 for(const c of connections){try{libraries.push(...(await window.mediaCenter.jfLibraries(c.id)).map(l=>({...l,serverId:c.id,serverName:c.name})))}catch{warnings.push(`${c.name}: library discovery unavailable.`)}}
 return {libraries,warnings}
}
export function libraryQuery(l:MediaLibrary):JfBrowse{return {serverId:l.serverId,libraryId:l.id,kind:l.kind,view:'all',search:'',page:0,sort:'DateCreated',descending:true}}
export async function discoverJellyfin(query:string|undefined,alive:()=>boolean,recent=false){
 const {libraries,warnings}=await jellyfinLibraries(),entries:{library:MediaLibrary;items:JfItem[]}[]=[]
 for(const library of libraries){
  if(!alive())break
  const base=libraryQuery(library)
  const views:JfBrowse['view'][]=query!==undefined?(library.kind==='music'?['songs','all','artists']:['all']):recent?['all']:library.kind==='music'?[]:['continue']
  for(const view of views){if(!alive())break;try{const result=await window.mediaCenter.jfBrowse({...base,view,search:query??''});entries.push({library,items:result.items.slice(0,query!==undefined?30:12)})}catch{warnings.push(`${library.serverName} · ${library.name}: ${query!==undefined?'search':'continue watching'} unavailable.`)}}
 }
 return {entries,libraries,warnings:[...new Set(warnings)]}
}
