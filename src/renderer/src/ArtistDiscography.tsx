import type {ReactNode} from 'react'
import {useState} from 'react'
/** The same browsing structure for each provider; only actual metadata is offered. */
export function ArtistDiscography({releases,onOpen}:{releases:{id:string;title:string;subtitle?:string;releaseType?:string;art:ReactNode}[];onOpen:(id:string)=>void}){
 const [query,setQuery]=useState(''),[sort,setSort]=useState('original'),[type,setType]=useState('all')
 const types=[...new Set(releases.map(r=>r.releaseType).filter((t):t is string=>!!t))]
 const rows=releases.filter(r=>r.title.toLowerCase().includes(query.toLowerCase())&&(type==='all'||r.releaseType===type))
 if(sort==='title')rows.sort((a,b)=>a.title.localeCompare(b.title))
 return <section className="discovery-shelf artist-discography"><header><h2>Discography <small>{releases.length}</small></h2><div className="dt-tools"><input aria-label="Filter discography" placeholder="Filter releases…" value={query} onChange={e=>setQuery(e.target.value)}/>{types.length>0&&<select aria-label="Release type" value={type} onChange={e=>setType(e.target.value)}><option value="all">All releases</option>{types.map(t=><option key={t}>{t}</option>)}</select>}<select aria-label="Sort discography" value={sort} onChange={e=>setSort(e.target.value)}><option value="original">Source order</option><option value="title">Title A–Z</option></select></div></header><div className="dt-collection-grid">{rows.map(r=><button className="dt-collection" key={r.id} onClick={()=>onOpen(r.id)}>{r.art}<strong>{r.title}</strong><span>{r.subtitle}</span></button>)}</div>{!rows.length&&<p className="muted">No matching releases.</p>}</section>
}
