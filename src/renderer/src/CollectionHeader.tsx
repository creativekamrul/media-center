import {useLayoutEffect,useRef,type ReactNode} from 'react'

/** Match the square to the content height without the circular intrinsic
 * sizing that occurs when a grid image's width depends on its row height. */
export function CollectionHeader({children,className=''}:{children:ReactNode;className?:string}) {
  const ref=useRef<HTMLElement>(null)
  useLayoutEffect(()=>{
    const card=ref.current!,copy=card.querySelector<HTMLElement>('.detail-heading')!
    let frame=0,lastWidth=0
    const fit=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        const css=getComputedStyle(card)
        const available=card.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)
        const gap=parseFloat(css.columnGap)||0
        if(Math.abs(available-lastWidth)>1){
          lastWidth=available
          card.dataset.stacked='false'
          card.style.setProperty('--collection-art-size','220px')
        }
        // Reserve enough room for two compact actions. Unusually narrow
        // windows/very long metadata switch to a full-width square above.
        const limit=Math.max(0,available-gap-240)
        const height=Math.ceil(copy.getBoundingClientRect().height)
        if(available<540||height>limit){card.dataset.stacked='true';return}
        card.style.setProperty('--collection-art-size',`${height}px`)
      })
    }
    const observer=new ResizeObserver(fit)
    const content=new MutationObserver(()=>{lastWidth=0;fit()})
    content.observe(copy,{childList:true,characterData:true,subtree:true})
    observer.observe(card);observer.observe(copy);fit()
    return()=>{observer.disconnect();content.disconnect();cancelAnimationFrame(frame)}
  },[])
  return <section ref={ref} className={`detail-hero ${className}`}>{children}</section>
}
