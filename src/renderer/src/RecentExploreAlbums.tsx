import {useSourceShelves} from './useExploreSources'
import {useState} from 'react'
import type {MusicAlbum} from '../../shared/types'
import {api,Modal} from './actions'
import {Art} from './ui'
import {Rail} from './JellyfinHub'
import {SearchCollectionPage} from './SearchCollectionPage'

const albumSources=async()=>(await api.settings()).connections.filter(c=>c.provider==='navidrome')
async function recentAlbums(serverId:string){
  const result=await api.musicBrowse({serverId,libraryId:'all',view:'newest',page:0,search:''})
  return {items:result.items.filter((item):item is MusicAlbum=>item.kind==='album').slice(0,12),warnings:[]}
}
export function RecentExploreAlbums({revision}:{revision:number}) {
  const {sources,items,error:listError,retry}=useSourceShelves(revision,albumSources,recentAlbums)
  const albums=items.slice(0,24).map(album=>({album,source:sources.find(s=>s.id===album.serverId)?.name}))
  const [selected,setSelected]=useState<MusicAlbum>(),[error,setError]=useState('')
  return <>{listError&&<p role="status">{listError}</p>}{sources.filter(s=>s.warnings.length).map(s=><p key={s.id}>{s.name}: recent albums unavailable. <button disabled={s.pending} onClick={()=>retry(s.id)}>Retry</button></p>)}{!!albums.length&&<Rail title="Recently added albums">{albums.map(({album,source})=><article key={JSON.stringify([album.serverId,album.id])} className="explore-card"><button className="explore-art" aria-label={`Open ${album.title}`} onClick={()=>setSelected(album)}><Art item={album}/></button><div className="explore-card-copy"><small>{source}</small><strong>{album.title}</strong><span>{album.subtitle}</span></div></article>)}</Rail>}
    {selected&&<Modal title="Album details" close={()=>setSelected(undefined)}><SearchCollectionPage collection={{id:selected.id,sourceId:selected.serverId,provider:'navidrome',kind:'album',title:selected.title,subtitle:selected.subtitle,cover:selected.cover}} back={()=>setSelected(undefined)} open={()=>{}} error={setError}/></Modal>}{error&&<p role="alert">{error}</p>}</>
}
