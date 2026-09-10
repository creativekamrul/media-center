import {RefreshCw} from 'lucide-react'
import type {ContinueItem} from '../../shared/types'
import {Shelf} from './Shelf'
import {CardActions} from './CardActions'
export function ContinueShelf({items,error,refresh}:{items:ContinueItem[];error:(s:string)=>void;refresh?:()=>void}){
 return <div className="continue-shelf"><Shelf action={refresh?<button className="icon-button" title="Refresh progress" aria-label="Refresh progress" onClick={refresh}><RefreshCw size={17}/></button>:undefined} title="Continue listening" subtitle="Your latest audiobook and podcast positions." empty="Start a book or episode and it will appear here.">{items.map(c=><article className="daily-card resume-card home-resume" key={JSON.stringify(c.item.target)}><span className="daily-status">{c.progress.status==='finished'?'Finished':`In progress · ${Math.round(c.progress.fraction*100)}%`}</span><h3 title={c.item.title}>{c.item.title}</h3><p title={c.item.subtitle}>{c.item.subtitle}</p><div className="daily-meter" role="meter" aria-label="Listening progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(c.progress.fraction*100)}><span style={{width:`${Math.min(100,Math.max(0,c.progress.fraction*100))}%`}}/></div><CardActions item={c.item} error={error}/></article>)}</Shelf></div>
}
