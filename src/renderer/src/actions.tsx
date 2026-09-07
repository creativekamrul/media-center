import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CalendarPlus, ListPlus, Play, Plus, X } from 'lucide-react'
import type { MusicTrack, QueueItem } from '../../shared/types'
import { message } from './ui'
export const api = window.mediaCenter
export const songQueue = (tracks: MusicTrack[], context?: string): QueueItem[] => tracks.map(t => ({ target: { kind: 'music-track', serverId: t.serverId, trackId: t.id }, title: t.title, subtitle: t.artist, cover: t.cover, context, duration: t.duration }))
export function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { const prior = document.activeElement as HTMLElement | null; if (!ref.current?.contains(prior)) ref.current?.querySelector<HTMLElement>('input,button')?.focus(); return () => prior?.focus() }, [])
  return <div className="modal-shade" onClick={close}><section ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === 'Escape') { e.stopPropagation(); close() }
    if (e.key === 'Tab') { const focusable = [...ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')]; const first = focusable[0], last = focusable.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() } }
  }}><div className="section-title"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={19}/></button></div>{children}</section></div>
}
export function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function ListenActions({ items, error, compact = false, disabled = false }: { items: QueueItem[]; error: (s: string) => void; compact?: boolean; disabled?: boolean }) {
  const [plan, setPlan] = useState(false), [due, setDue] = useState(tomorrow), [note, setNote] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  async function run(work: () => Promise<unknown>, text: string) { setBusy(true); try { await work(); setNotice(text) } catch (e) { error(message(e)) } finally { setBusy(false) } }
  return <><div className={`listen-actions ${compact ? 'compact' : ''}`}>
    <button title="Play" aria-label="Play selection" className={compact ? 'icon-button' : 'primary'} disabled={disabled || busy || !items.length} onClick={() => void run(() => api.play({ queue: items, index: 0 }), '')}><Play size={15}/>{!compact && 'Play'}</button>
    <button title="Play next" aria-label="Play next" className={compact ? 'icon-button' : 'secondary'} disabled={disabled || busy || !items.length} onClick={() => void run(() => api.queueEdit({ action: 'next', items }), 'Added next')}><Plus size={15}/>{!compact && 'Play next'}</button>
    <button title="Add to queue" aria-label="Add to queue" className={compact ? 'icon-button' : 'secondary'} disabled={disabled || busy || !items.length} onClick={() => void run(() => api.queueEdit({ action: 'append', items }), 'Added to queue')}><ListPlus size={15}/>{!compact && 'Queue'}</button>
    <button title="Listen later" aria-label="Listen later" className={compact ? 'icon-button' : 'secondary'} disabled={disabled || busy || !items.length} onClick={() => setPlan(true)}><CalendarPlus size={15}/>{!compact && 'Listen later'}</button>
    {notice && <span role="status" className="action-notice" onClick={() => setNotice('')}>{notice}</span>}
  </div>{plan && <Modal title="Make time for a good listen" close={() => setPlan(false)}><p>{items.length === 1 ? items[0].title : `${items.length} selected items`}</p><label className="field">Listening date<input autoFocus type="date" value={due} onChange={e => setDue(e.target.value)}/></label><label className="field">A note for yourself<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Start this on the way home…"/></label><p className="muted">Saved on this device in Listen later.</p><button className="primary" disabled={busy || !due} onClick={() => void run(async () => { for (const item of items) await api.laterSave({ item, due, note }); setPlan(false) }, 'Saved for later')}>Save listening plan</button></Modal>}</>
}
