import {ArrowDownWideNarrow} from 'lucide-react'
import {trackSortOptions,type TrackSort} from '../../shared/track-sort'
export function TrackSortControl({value,onChange,local=false}:{value:TrackSort;onChange:(value:TrackSort)=>void;local?:boolean}){
 return <label className="track-sort-control"><ArrowDownWideNarrow size={15}/><select aria-label="Track sort" title={local?'Date added is when this app first indexed the file':'Date added is when the track was added to the server library'} value={value} onChange={e=>onChange(e.target.value as TrackSort)}>{trackSortOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
}
