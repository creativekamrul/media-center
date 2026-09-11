import {progressKey} from '../../shared/timeline'
import {useEffect,useState,useRef,useSyncExternalStore} from 'react'
import type {QueueItem} from '../../shared/types'
import {Art} from './ui'
import {api} from './actions'
const localCache=new Map<string,Promise<string|null>>()
let artRevision=0
const artListeners=new Set<()=>void>()
function invalidateArt(){localCache.clear();artRevision++;for(const listener of artListeners)listener()}
api.onExperience(invalidateArt);api.onPersonal(invalidateArt)
const subscribeArt=(listener:()=>void)=>{artListeners.add(listener);return()=>{artListeners.delete(listener)}}
const artSnapshot=()=>artRevision
function localArtwork(rootId:string,fileId:string){const key=JSON.stringify([rootId,fileId]);let pending=localCache.get(key);if(!pending){pending=api.localCover({rootId,fileId}).catch(e=>{localCache.delete(key);throw e});localCache.set(key,pending);if(localCache.size>96)localCache.delete(localCache.keys().next().value!)}return pending}
export function QueueArt({ item }: { item?: QueueItem }) {
  const revision=useSyncExternalStore(subscribeArt,artSnapshot)
  const [cover, setCover] = useState<string | null>(null), target = item?.target
  const art=useRef<HTMLDivElement>(null)
  useEffect(()=>{setCover(null);let live=true;if(target?.kind!=='local-file'||!art.current)return;const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();void api.personalCover({key:progressKey(target)}).then(custom=>custom??localArtwork(target.rootId,target.fileId)).then(c=>{if(live)setCover(c)}).catch(()=>{})},{rootMargin:'200px'});observer.observe(art.current);return()=>{live=false;observer.disconnect()}},[JSON.stringify(target),revision])
  if (!item) return <div className="art idle-art">♫</div>
  if (target?.kind === 'local-file') return cover ? <div ref={art} className="art"><img src={cover} alt=""/></div> : <div ref={art} className="art idle-art"><img src="./assets/default-cover.png" alt=""/></div>
  return <Art personalKey={progressKey(item.target)} item={{ id: item.cover ?? (target?.kind === 'audiobook' ? target.bookId : target?.kind === 'podcast-episode' ? target.showId : target?.kind === 'music-track' ? target.trackId : ''), title: item.title, subtitle: item.subtitle, serverId: item.target.serverId, kind: item.target.kind, cover: item.cover }}/>
}

export function TrackArtwork({item}:{item?:QueueItem}) {const ref=useRef<HTMLSpanElement>(null);useEffect(()=>{const row=ref.current?.closest('.artist-track,.local-library-track,.song-row,.track-row,.queue-row,.history-row,.unified-result,.personal-entry,.personal-shelf-card,.mix-preview-track,.local-file-row,.plan-card,.daily-card,.screen-queue-item,.home-resume')??ref.current;if(!row||!item)return;const show=(e:Event)=>{e.preventDefault();e.stopPropagation();window.dispatchEvent(new CustomEvent('track-menu',{detail:item}))};const key=(e:Event)=>{const k=e as KeyboardEvent;if(k.key==='ContextMenu'||(k.shiftKey&&k.key==='F10'))show(e)};row.addEventListener('contextmenu',show);row.addEventListener('keydown',key);return()=>{row.removeEventListener('contextmenu',show);row.removeEventListener('keydown',key)}},[JSON.stringify(item)]);return <span ref={ref} className="track-artwork" aria-hidden="true"><QueueArt key={JSON.stringify(item?.target)} item={item}/></span>}
