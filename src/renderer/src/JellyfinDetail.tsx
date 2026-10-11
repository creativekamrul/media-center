import {useEffect,useRef,useState} from 'react'
import {Check,Heart,Play,RotateCcw,Star,UserRound} from 'lucide-react'
import type {JfItem,JfLibrary} from '../../shared/jellyfin'
import {JfArt} from './Jellyfin'
import {Rail} from './JellyfinHub'
import {duration,IconButton,message,plain} from './ui'
const api=window.mediaCenter
function Portrait({id,serverId}:{id:string;serverId:string}){const [src,setSrc]=useState<string|null>(null),ref=useRef<HTMLDivElement>(null);useEffect(()=>{let live=true;setSrc(null);const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();void api.jfCover({serverId,itemId:id}).then(s=>{if(live)setSrc(s)}).catch(()=>{})},{rootMargin:'150px'});if(ref.current)observer.observe(ref.current);return()=>{live=false;observer.disconnect()}},[id,serverId]);return <div className="jf-person-image" ref={ref}>{src?<img src={src} alt="" loading="lazy"/>:<UserRound size={38}/>}</div>}
export function JellyfinDetail({item:seed,libraryId,kind,open,play,mark,working}:{item:JfItem;libraryId:string;kind:JfLibrary['kind'];open:(i:JfItem)=>void;play:(i:JfItem,restart?:boolean)=>void;mark:(i:JfItem,field:'favorite'|'played')=>void;working:boolean}){
 const [item,setItem]=useState(seed),[backdrop,setBackdrop]=useState<string|null>(null),[logo,setLogo]=useState<string|null>(null),[related,setRelated]=useState<JfItem[]>([]),[seasons,setSeasons]=useState<JfItem[]>([]),[next,setNext]=useState<JfItem>(),[errors,setErrors]=useState<string[]>([])
 useEffect(()=>{let live=true;setItem(seed);setErrors([]);setBackdrop(null);setLogo(null);setRelated([]);setSeasons([]);setNext(undefined);const ref={serverId:seed.serverId,itemId:seed.id};const failed=(e:unknown)=>{if(live)setErrors(old=>[...old,message(e)])}
  void api.jfDetail(ref).then(i=>{if(live)setItem(i);if(i.logoId)return api.jfCover({serverId:i.serverId,itemId:i.logoId,image:'Logo'}).then(s=>{if(live)setLogo(s)})}).catch(failed)
  void api.jfCover({...ref,itemId:seed.kind==='Episode'?seed.seriesId??seed.id:seed.id,image:'Backdrop'}).then(s=>{if(live)setBackdrop(s)}).catch(()=>{})
  void api.jfRelated(ref).then(p=>{if(live)setRelated(p.items.filter(i=>i.id!==seed.id&&['Movie','Series','Episode'].includes(i.kind)))}).catch(failed)
  if(seed.kind==='Series'){
   void api.jfBrowse({serverId:seed.serverId,libraryId,kind,parentId:seed.id,view:'all',search:'',page:0,sort:'IndexNumber',descending:false}).then(p=>{if(live)setSeasons(p.items.filter(i=>i.kind==='Season'))}).catch(failed)
  }
  return()=>{live=false}
 },[seed.id,seed.serverId,libraryId,kind])
 useEffect(()=>{let live=true;setItem(old=>({...old,favorite:seed.favorite,played:seed.played}));if(seed.kind==='Series')void api.jfNextUp({serverId:seed.serverId,itemId:seed.id}).then(p=>{if(live)setNext(p.items.find(i=>i.kind==='Episode'))}).catch(e=>{if(live)setErrors(old=>[...old,message(e)])});return()=>{live=false}},[seed])
 const target=item.kind==='Series'?next:item
 const cards=(items:JfItem[])=>items.map(i=><article className="jf-hub-card" key={i.id}><button className="jf-card-open" onClick={()=>open(i)}><JfArt item={i}/><strong>{i.title}</strong><span>{i.subtitle||i.year||''}</span>{i.position>0&&i.duration>0&&!i.played&&<progress max={i.duration} value={i.position} aria-label="Watched progress"/>}</button></article>)
 return <section className={`jf-cinema jf-detail ${backdrop?'has-backdrop':''}`} aria-label={`${item.title} details`}>
  <div className="jf-cinema-hero">{backdrop&&<img className="jf-cinema-backdrop" src={backdrop} alt=""/>}<div className="jf-cinema-shade"/>
   <div className="jf-cinema-title">{logo?<><h2 className="sr-only">{item.title}</h2><img className="jf-cinema-logo" src={logo} alt={item.title}/></>:<h2>{item.title}</h2>}
    {item.subtitle&&<p>{item.subtitle}</p>}<div className="jf-cinema-meta">{item.year&&<span>{item.year}</span>}{item.duration>0&&item.kind!=='Series'&&<span>{duration(item.duration)}</span>}{item.certification&&<span className="jf-certification">{item.certification}</span>}{item.rating!=null&&<span><Star size={15}/>{item.rating.toFixed(1)}</span>}</div>
    <div className="jf-cinema-actions">{target&&<button className="primary" disabled={working} onClick={()=>play(target)}><Play size={18}/>{target.position>0&&!target.played?'Resume':item.kind==='Series'?'Play next episode':'Play'}</button>}{target&&target.position>0&&<IconButton label="Start over" disabled={working} onClick={()=>play(target,true)}><RotateCcw size={20}/></IconButton>}<IconButton aria-pressed={item.played} label={item.played?'Mark unwatched':'Mark watched'} disabled={working} onClick={()=>mark(item,'played')}><Check size={22} strokeWidth={item.played?3:1.7}/></IconButton><IconButton aria-pressed={item.favorite} label={item.favorite?'Remove favorite':'Add favorite'} disabled={working} onClick={()=>mark(item,'favorite')}><Heart size={21} fill={item.favorite?'currentColor':'none'}/></IconButton></div>
   </div>
  </div>
  <div className="jf-cinema-body">{errors.length>0&&<p className="error-banner" role="alert">Some details could not load: {errors.join(' ')}</p>}{item.overview&&<p className="jf-cinema-overview">{plain(item.overview)}</p>}
   {(item.genres.length>0||item.studios?.length||item.people?.some(p=>p.type==='Director'))&&<dl className="jf-cinema-facts">{item.genres.length>0&&<div><dt>Genres</dt><dd>{item.genres.join(' · ')}</dd></div>}{item.people?.some(p=>p.type==='Director')&&<div><dt>Director</dt><dd>{item.people.filter(p=>p.type==='Director').map(p=>p.name).join(', ')}</dd></div>}{!!item.studios?.length&&<div><dt>Studios</dt><dd>{item.studios.join(', ')}</dd></div>}</dl>}
   {item.kind==='Series'&&<div className="jf-series-content">{next&&<Rail title="Next up">{cards([next])}</Rail>}<Rail title="Seasons">{seasons.length?cards(seasons):<p className="muted">No seasons available.</p>}</Rail></div>}
   {!!item.people?.length&&<Rail title="Cast & crew">{item.people.slice(0,40).map((p,index)=><article className="jf-person" key={`${p.id}:${index}`}><Portrait id={p.id} serverId={item.serverId}/><strong>{p.name}</strong><span>{p.role||p.type}</span></article>)}</Rail>}
   {related.length>0&&<Rail title="More like this">{cards(related)}</Rail>}
  </div>
 </section>
}
