import {useEffect,useRef,useState} from 'react'
import {X,RotateCcw} from 'lucide-react'
import {defaultPlayingScreen,type PlayingScreenPreferences} from '../../shared/playing-screen'
import {fonts,fontIds} from '../../shared/appearance'
import {api} from './actions'
import {message} from './ui'

/** Native modal supplies focus containment, Escape dismissal and background inertness. */
export function LyricsAppearance({value,preview,close}:{value:PlayingScreenPreferences;preview:(p:PlayingScreenPreferences)=>void;close:()=>void}){
 const original=useRef(value),dialog=useRef<HTMLDialogElement>(null)
 const [draft,setDraft]=useState(value),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{const el=dialog.current!,opener=document.activeElement as HTMLElement|null;el.showModal();return()=>{el.close();opener?.focus()}},[])
 const update=(patch:Partial<PlayingScreenPreferences>)=>{const next={...draft,...patch};setDraft(next);preview(next)}
 const cancel=()=>{if(!busy){preview(original.current);close()}}
 const save=async()=>{setBusy(true);setError('');try{await api.savePlayingScreenPreferences(draft);close()}catch(e){setError(message(e));setBusy(false)}}
 return <dialog ref={dialog} className="lyrics-appearance" aria-labelledby="lyrics-appearance-title" onCancel={e=>{e.preventDefault();cancel()}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel()}}} onClick={e=>{if(e.target===e.currentTarget)cancel()}}>
  <header><div><span className="eyebrow">MAKE IT YOURS</span><h2 id="lyrics-appearance-title">Lyrics appearance</h2><p>Preview changes live. Save to keep them for your next listen.</p></div><button autoFocus className="icon-button" aria-label="Close lyrics appearance" disabled={busy} onClick={cancel}><X size={20}/></button></header>
  <div className="lyrics-appearance-body">
   <div className="lyric-style-preview" aria-label="Lyric style preview"><small>STYLE PREVIEW</small><p className="preview-upcoming">A little closer to the music</p><p className="preview-current">Make this <span>moment</span> yours</p><p className="preview-upcoming">One song at a time</p></div>
   <fieldset disabled={busy} className="lyrics-option-grid"><legend className="sr-only">Lyrics customization</legend>
    <section><h3>Typography</h3><label>Lyric font<select aria-label="Lyric font" value={draft.font} onChange={e=>update({font:e.target.value as PlayingScreenPreferences['font']})}><option value="theme">Use theme font</option>{fontIds.map(id=><option key={id} value={id}>{fonts[id].name}</option>)}</select></label>
     <label>Weight<select aria-label="Lyric weight" value={draft.weight} onChange={e=>update({weight:e.target.value as PlayingScreenPreferences['weight']})}><option value="500">Medium</option><option value="650">Semibold</option><option value="800">Bold</option></select></label>
     <label>Lyric size · {draft.fontSize}px<input aria-label="Lyric font size" type="range" min={24} max={64} step={2} value={draft.fontSize} onChange={e=>update({fontSize:Number(e.target.value)})}/></label>
     <label>Line spacing · {draft.lineHeight.toFixed(1)}<input aria-label="Lyric line spacing" type="range" min={1.2} max={2} step={.1} value={draft.lineHeight} onChange={e=>update({lineHeight:Number(e.target.value)})}/></label>
     <label>Alignment<select aria-label="Lyric alignment" value={draft.alignment} onChange={e=>update({alignment:e.target.value as PlayingScreenPreferences['alignment']})}><option value="left">Left</option><option value="center">Centered</option></select></label>
    </section>
    <section><h3>Colors & focus</h3>{([['textColor','Upcoming lyrics'],['sungColor','Sung lyrics'],['wordColor','Current word']] as const).map(([key,label])=><label className="lyric-color-field" key={key}><span>{label}<small>{draft[key].toUpperCase()}</small></span><input aria-label={`${label} color`} type="color" value={draft[key]} onChange={e=>update({[key]:e.target.value})}/></label>)}
     <label>Surrounding lines · {Math.round(draft.inactiveOpacity*100)}%<input aria-label="Surrounding lyric opacity" type="range" min={.2} max={1} step={.05} value={draft.inactiveOpacity} onChange={e=>update({inactiveOpacity:Number(e.target.value)})}/></label>
     <label>Word glow · {draft.glow}px<input aria-label="Word glow" type="range" min={0} max={24} step={1} value={draft.glow} onChange={e=>update({glow:Number(e.target.value)})}/></label>
    </section>
    <section><h3>Atmosphere & motion</h3><label>Background<select aria-label="Playing screen background" value={draft.background} onChange={e=>update({background:e.target.value as PlayingScreenPreferences['background']})}><option value="aurora">Aurora</option><option value="artwork">Blurred artwork</option><option value="midnight">Midnight glass</option><option value="sunset">Sunset</option><option value="stars">Starlight</option></select></label>
     <label>Background shade · {Math.round(draft.backdropDim*100)}%<input aria-label="Background shade" type="range" min={0} max={.8} step={.05} value={draft.backdropDim} onChange={e=>update({backdropDim:Number(e.target.value)})}/></label>
     <label>Animation style<select aria-label="Animation style" value={draft.animation} onChange={e=>update({animation:e.target.value as PlayingScreenPreferences['animation']})}><option value="flow">Flow · word emphasis</option><option value="focus">Focus · soft blur</option><option value="fade">Gentle fade</option><option value="none">No lyric animation</option></select></label>
     <label className="check-field"><input type="checkbox" checked={draft.motion} onChange={e=>update({motion:e.target.checked})}/>Smooth motion</label><p className="muted">Word timestamps are used when available. For line-only lyrics, Flow smoothly enlarges each word in place, estimating its timing across the line; other styles use a smooth sweep. System reduced-motion preferences are respected.</p>
    </section>
   </fieldset>
  </div>
  <footer>{error&&<p role="alert">{error}</p>}<button className="text-button" disabled={busy} onClick={()=>update(defaultPlayingScreen)}><RotateCcw size={15}/>Reset appearance</button><div><button className="secondary" disabled={busy} onClick={cancel}>Cancel</button><button className="primary" disabled={busy} onClick={()=>void save()}>{busy?'Saving…':'Save appearance'}</button></div></footer>
 </dialog>
}
