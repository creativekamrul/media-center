import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { LyricsRecord } from '../../shared/lyrics'
import { api } from './actions'
import { Modal } from './actions'
import { duration, message } from './ui'

export function LyricSearch({songKey,title,artist,close,saved}:{songKey:string;title:string;artist:string;close:()=>void;saved:()=>void}){
  const [query,setQuery]=useState(`${title} ${artist}`.slice(0,300)),[results,setResults]=useState<LyricsRecord[]>([]),[selected,setSelected]=useState<LyricsRecord>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(false)
  async function search(){setBusy(true);setError('');setSelected(undefined);try{setResults(await api.searchLyrics({key:songKey,query}));setSearched(true)}catch(e){setError(message(e))}finally{setBusy(false)}}
  async function bind(){if(!selected)return;setBusy(true);setError('');try{await api.bindLyrics({key:songKey,id:selected.id});saved();close()}catch(e){setError(message(e))}finally{setBusy(false)}}
  return createPortal(<Modal title="Find lyrics for this song" close={close}><p className="muted">{title} · {artist}</p><form className="lyric-search-form" onSubmit={e=>{e.preventDefault();void search()}}><label className="field">Song, artist, or album<input autoFocus maxLength={300} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search LRCLIB…"/></label><button className="primary" disabled={busy||query.trim().length<2}>Search lyrics</button></form>
    {error&&<p role="alert">{error}</p>}{busy&&<p role="status">Working…</p>}
    <div className="lyric-search-layout"><div className="lyric-results" aria-label="Lyric search results">{searched&&!results.length&&<p>No results. Try a shorter title or a different artist spelling.</p>}{results.map(r=><button className="lyric-result" key={r.id} aria-pressed={selected?.id===r.id} onClick={()=>setSelected(r)}><strong>{r.title}</strong><span>{r.artist} · {duration(r.duration)}</span><small>{r.album||'Album unspecified'} · {r.status==='instrumental'?'Instrumental':r.lines.length?'Synced lyrics':'Plain lyrics'}</small></button>)}</div><div className="lyric-preview">{selected?<><h3>{selected.title}</h3><p className="muted">{selected.artist} · {selected.album}</p><pre>{selected.status==='instrumental'?'Instrumental':selected.plain||selected.lines.map(l=>l.text).join('\n')||'No lyrics in this record.'}</pre><button className="primary" disabled={busy||selected.status==='missing'} onClick={()=>void bind()}>Use these lyrics</button></>:<p className="muted">Choose a result to preview its lyrics before saving.</p>}</div></div><p className="muted">Your choice and its lyrics stay in this device’s database until you replace or clear the match. Search text is sent to LRCLIB.</p></Modal>,document.body)
}
