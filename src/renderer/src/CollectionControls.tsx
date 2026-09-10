import {useEffect,useState} from 'react'
import {Music2,BookOpen,Podcast,FolderOpen,SlidersHorizontal,Disc3,Headphones,LibraryBig,Radio,Star,Heart,Sparkles} from 'lucide-react'
import {collectionDefaults,collectionKeys,collectionIcons,collectionsSchema,type Experience} from '../../shared/experience'
import {useExperience} from './Experience'
import {api} from './actions'
import {message} from './ui'

export const collectionIconComponents={music:Music2,book:BookOpen,podcast:Podcast,folder:FolderOpen,sliders:SlidersHorizontal,disc:Disc3,headphones:Headphones,library:LibraryBig,radio:Radio,star:Star,heart:Heart,sparkles:Sparkles}
const iconNames={music:'Music note',book:'Book',podcast:'Podcast',folder:'Folder',sliders:'Sliders',disc:'Record',headphones:'Headphones',library:'Library',radio:'Radio',star:'Star',heart:'Heart',sparkles:'Sparkles'}
export function CollectionControls({error}:{error:(s:string)=>void}){
 const [prefs]=useExperience(),[draft,setDraft]=useState<Experience['navigation']['collections']>(collectionDefaults),[saving,setSaving]=useState(false),[notice,setNotice]=useState('')
 const saved=JSON.stringify(prefs.navigation.collections)
 useEffect(()=>{setDraft(JSON.parse(saved))},[saved])
 const dirty=JSON.stringify(draft)!==saved
 async function save(){
  const parsed=collectionsSchema.safeParse(draft)
  if(!parsed.success){setNotice('Give every collection a name between 1 and 40 characters.');return}
  setSaving(true);setNotice('')
  try{await api.saveNavigation({action:'collections',collections:parsed.data});setDraft(parsed.data);setNotice('Collection names and icons saved.')}catch(e){error(message(e))}finally{setSaving(false)}
 }
 return <section className="settings-panel collection-controls" id="collection-controls" aria-label="Collection controls">
  <div className="panel-heading"><span className="panel-icon"><LibraryBig size={21}/></span><div><h2>Collection controls</h2><p>Choose the names and icons shown in your navigation.</p></div></div>
  <p className="muted">These labels stay on this device. Your server libraries, files and media types keep their original names.</p>
  <form onSubmit={e=>{e.preventDefault();void save()}}>
   <div className="collection-control-list">{collectionKeys.map(key=>{const entry=draft[key],Icon=collectionIconComponents[entry.icon];return <div className="collection-control-row" key={key}>
    <span className="collection-icon-preview" aria-hidden="true"><Icon size={23}/></span>
    <label className="field">{collectionDefaults[key].name} name<input required maxLength={40} value={entry.name} disabled={saving} onChange={e=>{setDraft(d=>({...d,[key]:{...d[key],name:e.target.value}}));setNotice('')}}/></label>
    <label className="field">{collectionDefaults[key].name} icon<select aria-label={`${collectionDefaults[key].name} icon`} value={entry.icon} disabled={saving} onChange={e=>{setDraft(d=>({...d,[key]:{...d[key],icon:e.target.value as typeof entry.icon}}));setNotice('')}}>{collectionIcons.map(icon=><option key={icon} value={icon}>{iconNames[icon]}</option>)}</select></label>
   </div>})}</div>
   <div className="collection-control-actions"><button type="button" className="text-button" disabled={saving} onClick={()=>{setDraft(collectionDefaults);setNotice('Defaults restored in the preview. Save to apply them.')}}>Reset collection defaults</button><button className="primary" disabled={saving||!dirty}>{saving?'Saving…':'Save collection controls'}</button></div>
   {notice&&<p className="muted" role="status">{notice}</p>}
  </form>
 </section>
}
