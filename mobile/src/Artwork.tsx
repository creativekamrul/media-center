import {useId} from 'react'
import {releases} from './catalog'

/** Original demo prints. All views of a release use the same composition. */
export function Artwork({index}:{index:number}){
  const [base,field,sun,ridge]=releases[index].colors
  const grain=useId().replace(/:/g,'')
  return <svg className="print" aria-hidden="true" viewBox="0 0 360 360" preserveAspectRatio="xMidYMid slice">
    <defs><filter id={grain}><feTurbulence type="fractalNoise" baseFrequency=".76" numOctaves="3" stitchTiles="stitch"/></filter></defs>
    <rect width="360" height="360" fill={field}/>
    {index%3===0?<><circle cx="231" cy="132" r="75" fill={sun}/><path d="M-5 207 Q60 178 115 198 T235 178 Q300 146 365 172 V365 H-5Z" fill={ridge}/><path d="M-5 187 Q47 174 108 202 T233 219 Q305 202 365 174 V365 H-5Z" fill={base}/><path d="M-8 239 Q64 218 118 236 T227 234 Q292 208 370 202 Q289 214 221 243 T114 242 Q55 226 -8 245Z" fill={sun}/><path d="M-10 318 Q70 257 170 264 T370 228 Q283 271 168 274 T-10 329Z" fill={ridge}/></>:
    index%3===1?<><path d="M-20 362V190L165 12l70 0L56 195v167Z" fill={sun}/><path d="M85 362V230L278 37l50 0-190 198v127Z" fill={ridge}/><path d="M166 362V261l194-194v295Z" fill={base}/></>:
    <><circle cx="116" cy="120" r="87" fill={sun}/><path d="M0 235 Q88 99 182 166 T360 112 V360H0Z" fill={ridge}/><path d="M0 281 Q95 169 180 213 T360 134 V360H0Z" fill={base}/>{Array.from({length:14},(_,i)=><path key={i} d={`M-4 ${283+i*7} Q95 ${170+i*7} 180 ${216+i*6} T368 ${137+i*8}`} fill="none" stroke={sun} opacity=".54" strokeWidth="1.1"/>)}</>}
    <rect width="100%" height="100%" filter={`url(#${grain})`} opacity=".14" style={{mixBlendMode:'multiply'}}/>
  </svg>
}
