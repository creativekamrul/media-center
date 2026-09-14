import type {PlayingScreenPreferences} from '../../shared/playing-screen'
import type {QueueItem} from '../../shared/types'
import {QueueArt} from './Artwork'

export function PlayingBackdrop({background,item}:{background:PlayingScreenPreferences['background'];item?:QueueItem}) {
 return <div className="immersive-atmosphere" aria-hidden="true">{background==='artwork'?<QueueArt key={JSON.stringify(item?.target)} item={item}/>:<div className="ambient-glow"/>}{background==='stars'&&<div className="star-field"/>}{(background==='snow'||background==='rain')&&<div className={`weather-field weather-${background}`}><i/><i/><i/></div>}</div>
}
