import {useLayoutEffect,useRef,type ReactNode} from 'react'

/** Shared, artwork-led header for audio collections. Jellyfin has its own heroes. */
export function CollectionHeader({children,className=''}:{children:ReactNode;className?:string}) {
  const ref=useRef<HTMLElement>(null)
  useLayoutEffect(()=>{
    const card=ref.current!
    const canvas=card.closest<HTMLElement>('.collection-page')??card
    const fit=()=>{card.dataset.stacked=String(card.clientWidth<580)}
    const artwork=()=>{
      const src=card.querySelector<HTMLImageElement>('.art img')?.currentSrc
      if(src)canvas.style.setProperty('--collection-artwork',`url(${JSON.stringify(src)})`)
      else canvas.style.removeProperty('--collection-artwork')
    }
    const resize=new ResizeObserver(fit)
    const content=new MutationObserver(artwork)
    resize.observe(card);content.observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['src']})
    card.addEventListener('load',artwork,true);fit();artwork()
    return()=>{resize.disconnect();content.disconnect();card.removeEventListener('load',artwork,true);canvas.style.removeProperty('--collection-artwork')}
  },[])
  return <section ref={ref} className={`detail-hero ${className}`}>{children}</section>
}
