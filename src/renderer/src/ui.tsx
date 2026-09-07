import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
const api = window.mediaCenter
const coverCache = new Map<string, string | null>()
export function duration(seconds: number) { const n = Math.floor(Math.max(0, seconds)); return n >= 3600 ? `${Math.floor(n / 3600)}:${String(Math.floor(n / 60) % 60).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}` : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` }
export function hours(seconds: number) { return `${Math.floor(seconds / 3600)} hr ${Math.round(seconds % 3600 / 60)} min` }
export function plain(text: string) { return text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim() }
export function message(error: unknown) { return (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '') }
export function IconButton({ label, children, onClick, active, disabled }: { label: string; children: ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean }) { return <button className={`icon-button ${active ? 'active' : ''}`} type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button> }
export function Art({ item, small = false }: { item: { id: string; serverId: string; title: string; subtitle?: string; cover?: string; kind: string }; small?: boolean }) {
  const [cover, setCover] = useState<string | null>(null); const ref = useRef<HTMLDivElement>(null)
  const hash = [...item.title].reduce((n, c) => n + c.charCodeAt(0), 0) % 8
  useEffect(() => {
    setCover(null)
    if (item.serverId === 'sample' || !ref.current) return
    let live = true; const key = `${item.serverId}:${item.cover ?? item.id}`
    const observer = new IntersectionObserver(entries => { if (!entries.some(e => e.isIntersecting)) return; observer.disconnect(); if (coverCache.has(key)) { setCover(coverCache.get(key)!); return }; void api.cover({ serverId: item.serverId, itemId: item.cover ?? item.id }).then(data => { coverCache.set(key, data); if (live) setCover(data) }).catch(() => {}) }, { rootMargin: '160px' })
    observer.observe(ref.current); return () => { live = false; observer.disconnect() }
  }, [item.id, item.serverId, item.cover])
  return <div ref={ref} className={`art tone-${hash} ${item.kind === 'audiobook' ? 'book-art' : ''} ${small ? 'small-art' : ''}`}>
    {cover ? <img src={cover} alt=""/> : <><div className="art-shape"/><div className="art-grain"/><span className="art-label">{item.kind === 'podcast-show' ? 'ON THE AIR' : item.kind === 'audiobook' ? item.subtitle : 'THE COLLECTION'}</span><strong>{item.title}</strong><span className="art-footer">{item.kind === 'podcast-show' ? 'Stories worth your time' : item.subtitle}</span></>}
  </div>
}

export function usePageScroll(key: string) {
  useLayoutEffect(() => { const workspace = document.querySelector('.workspace'); if (workspace) workspace.scrollTop = 0 }, [key])
}
