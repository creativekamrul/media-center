import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { PlaybackState } from '../../shared/types'
import { progressKey } from '../../shared/timeline'
import { activeLyricIndex, type LyricsResult } from '../../shared/lyrics'
import { api } from './actions'
import { message } from './ui'
export function LyricsPanel({player}:{player:PlaybackState}) {
 const item=player.queue[player.queueIndex],key=item?progressKey(item.target):''
 const [result,setResult]=useState<LyricsResult>(),[error,setError]=useState(''),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0),[follow,setFollow]=useState(true)
 const lastRevision=useRef(0)
 const box=useRef<HTMLDivElement>(null),rows=useRef<(HTMLButtonElement|null)[]>([])
 useEffect(()=>{let live=true;setResult(undefined);setError('');setLoading(true);setFollow(true)
  const refresh=lastRevision.current!==revision;lastRevision.current=revision
  void api.lyrics({refresh}).then(r=>{if(live&&r.key===key)setResult(r)}).catch(e=>{if(live)setError(message(e))}).finally(()=>{if(live)setLoading(false)})
  return()=>{live=false}
 },[key,revision])
 const shown=result?.key===key?result:undefined,active=activeLyricIndex(shown?.lines??[],player.position)
 useEffect(()=>{const el=rows.current[active],root=box.current;if(follow&&el&&root)root.scrollTo({top:Math.max(0,el.offsetTop-root.clientHeight/2+el.clientHeight/2),behavior:'auto'})},[active,follow,shown])
 return <section className="lyrics-panel" aria-label="Lyrics"><div className="section-title"><div><h2>Lyrics</h2><p className="muted">LRCLIB · {shown?.lines.length?'Synced to MPV':'Song lyrics'}</p></div><button className="icon-button" aria-label="Refresh lyrics" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={18}/></button></div><p className="lyrics-caption">{item?.title} · {item?.subtitle}</p>
 {loading&&<p role="status" className="lyrics-message">Finding lyrics…</p>}{error&&<p role="alert" className="lyrics-message">{error}</p>}
 {shown?.status==='unsupported'&&<p className="lyrics-message">Lyrics are available for music and tagged local audio.</p>}
 {shown?.status==='instrumental'&&<p className="lyrics-message">Instrumental — no lyrics for this track.</p>}
 {shown?.status==='missing'&&<p className="lyrics-message">No matching lyrics found. Title, artist, album, and duration are used to identify the recording.</p>}
 {!!shown?.lines.length&&<><label className="check-field"><input type="checkbox" checked={follow} onChange={e=>setFollow(e.target.checked)}/>Follow playback</label><div className="lyrics-scroll" ref={box} onWheel={()=>setFollow(false)} onTouchMove={()=>setFollow(false)} onKeyDown={e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))setFollow(false)}}>{shown.lines.map((line,i)=><button ref={el=>{rows.current[i]=el}} key={i} className={`lyric-line ${i===active?'current':''}`} aria-current={i===active?'true':undefined} disabled={!['playing','paused'].includes(player.status)||line.time>player.duration} title={`Seek to ${Math.floor(line.time/60)}:${String(Math.floor(line.time%60)).padStart(2,'0')}`} onClick={()=>void api.seekLyric({key,time:line.time}).catch(e=>setError(message(e)))}>{line.text||'♪'}</button>)}</div></>}
 {shown?.status==='found'&&!shown.lines.length&&<div className="lyrics-scroll lyrics-plain" tabIndex={0}><p className="muted">Plain lyrics · timing unavailable</p><p>{shown.plain}</p></div>}
 <p className="lyrics-credit">Lyrics are looked up only while this panel is open. Song metadata is sent to LRCLIB; server credentials and audio are not.</p></section>
}
