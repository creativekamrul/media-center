import {useEffect,useState} from 'react'
import {fontIds,fonts} from '../../shared/appearance'
import {api} from './actions'

export function FontSelect({label,value,onChange,theme=false}:{label:string;value:string;onChange:(value:string)=>void;theme?:boolean}){
 const [installed,setInstalled]=useState<string[]>([]),[error,setError]=useState('')
 useEffect(()=>{let live=true;void api.installedFonts().then(names=>{if(live)setInstalled(names)}).catch(()=>{if(live)setError('Installed fonts unavailable; font presets still work.')});return()=>{live=false}},[])
 const missing=value.startsWith('system:')&&!installed.includes(value.slice(7))
 return <><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>
  {theme&&<option value="theme">Use theme font</option>}
  <optgroup label="Font presets">{fontIds.map(id=><option key={id} value={id}>{fonts[id].name}</option>)}</optgroup>
  {missing&&<option value={value}>{value.slice(7)} · saved font</option>}
  {!!installed.length&&<optgroup label="Installed on this device">{installed.map(name=><option key={name} value={`system:${name}`}>{name}</option>)}</optgroup>}
 </select>{error&&<small className="muted">{error}</small>}</>
}
