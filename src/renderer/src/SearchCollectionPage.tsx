import {useEffect,useState} from 'react'
import {ArrowLeft,Play} from 'lucide-react'
import type {SearchCollection} from '../../shared/experience'
import type {QueueItem} from '../../shared/types'
import {api,ListenActions,songQueue} from './actions'
import {ArtistPage} from './ArtistPage'
import {ArtistDiscography} from './ArtistDiscography'
import {CollectionHeader} from './CollectionHeader'
import {TrackArtwork} from './Artwork'
import {Art,duration,message} from './ui'
import {dtQueue} from './Downtify'

async function contents(collection:SearchCollection) {
  const {provider,sourceId,id}=collection
  let tracks:QueueItem[]=[]
  let releases:SearchCollection[]=[]
  if(provider==='local') {
    tracks=await api.localQueue({rootId:sourceId,view:'albums',group:id,search:'',sort:'original'})
  } else if(provider==='navidrome') {
    const album=await api.musicDetail({serverId:sourceId,id,kind:'album'})
    tracks=songQueue(album.tracks,album.title)
  } else {
    const saved=await api.dtWorkspace({serverId:sourceId,mode:'saved'})
    const selected=saved.albums.find(album=>album.id===id)
    const matching=saved.tracks.filter(t=>collection.kind==='artist'
      ? (t.artists??[t.artist]).includes(collection.title)
      : selected && t.album===selected.title && t.artist===selected.artist)
    tracks=matching.map(dtQueue)
    if(collection.kind==='artist'){
      const keys=new Set(matching.map(t=>JSON.stringify([t.artist,t.album])))
      releases=saved.albums.filter(a=>keys.has(a.id)).map(a=>({provider,sourceId,id:a.id,title:a.title,kind:'album',subtitle:a.artist,cover:a.coverId}))
    }
  }
  return {tracks,releases}
}

export function SearchCollectionPage({collection,back,open,error}:{collection:SearchCollection;back:()=>void;open:(collection:SearchCollection)=>void;error:(s:string)=>void}) {
  const nativeArtist=collection.kind==='artist'&&collection.provider!=='downtify'
  const [data,setData]=useState<Awaited<ReturnType<typeof contents>>>()
  const [failure,setFailure]=useState(''),[limit,setLimit]=useState(60)
  useEffect(()=>{
    if(nativeArtist)return
    let current=true
    void contents(collection).then(result=>{if(current)setData(result)}).catch(e=>{if(current)setFailure(message(e))})
    return ()=>{current=false}
  },[collection,nativeArtist])
  if(nativeArtist)return <ArtistPage request={collection.provider==='local'?{query:collection.title,rootId:collection.sourceId}:{query:collection.title,serverId:collection.sourceId,artistId:collection.id}} back={back} error={error}/>
  const tracks=data?.tracks??[]
  const art=(c:SearchCollection)=><Art item={{id:c.cover??c.id,serverId:c.sourceId,title:c.title,kind:'collection'}}/>
  return <section><button className="text-button back" onClick={back}><ArrowLeft size={16}/>Back</button>
    <CollectionHeader className={collection.kind==='artist'?'artist-profile':''}>
      {collection.provider==='local'?<div className="art"><TrackArtwork item={tracks[0]}/></div>:art(collection)}
      <div className="detail-heading"><p className="eyebrow">{collection.kind} · {collection.provider}</p><h2>{collection.title}</h2><p>{collection.subtitle}</p>
        {data&&<p>{tracks.length} tracks</p>}<ListenActions items={tracks} error={error}/></div>
    </CollectionHeader>
    {failure?<p role="alert">{failure}</p>:!data?<p role="status">Loading collection…</p>:null}
    {!!data?.releases.length&&<ArtistDiscography releases={data.releases.map(r=>({id:r.id,title:r.title,art:art(r)}))} onOpen={id=>{const r=data.releases.find(r=>r.id===id);if(r)open(r)}}/>}
    {tracks.slice(0,limit).map((item,index)=><div className="artist-track" key={index}><span>{index+1}</span><TrackArtwork item={item}/><div><strong>{item.title}</strong><small>{item.subtitle}</small></div><span>{duration(item.duration??0)}</span><button aria-label={`Play ${item.title}`} className="icon-button" onClick={()=>void api.play({queue:tracks,index}).catch(e=>error(message(e)))}><Play size={16}/></button></div>)}
    {tracks.length>limit&&<button className="secondary" onClick={()=>setLimit(n=>n+60)}>Show more tracks</button>}
  </section>
}

export function DowntifyArtistRoute({request,back,error}:{request:import('./ArtistNavigation').ArtistRequest;back:()=>void;error:(s:string)=>void}) {
  const [album,setAlbum]=useState<SearchCollection>()
  const [artist]=useState<SearchCollection>(()=>({kind:'artist',provider:'downtify',title:request.query,sourceId:request.serverId!,id:request.query,subtitle:'Saved artist',cover:request.cover}))
  return <SearchCollectionPage key={album?.id??artist.id} collection={album??artist} open={setAlbum} back={()=>album?setAlbum(undefined):back()} error={error}/>
}
