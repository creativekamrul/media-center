import {defaultAppearance, type AppStyle} from '../../shared/appearance'
import type {Preferences} from '../../shared/types'

const styles: {id:AppStyle;name:string;description:string}[] = [
  {id:'default',name:'Original',description:'Familiar pill controls and open, balanced surfaces.'},
  {id:'frosted',name:'Frosted',description:'Glass panels, quiet navigation and translucent action buttons.'},
  {id:'soft',name:'Soft',description:'Soft corners, quiet tonal controls and relaxed spacing.'},
  {id:'precision',name:'Precision',description:'Crisp controls, layered panels, and subtle edge highlights.'},
  {id:'outline',name:'Outline',description:'Square corners, fine rules, and a flat, structured layout.'},
  {id:'bold',name:'Bold',description:'Confident typography, defined edges and grounded surfaces.'},
  {id:'retro',name:'Retro',description:'Compact square controls with subtle desktop detailing.'},
  {id:'editorial',name:'Editorial',description:'Open surfaces, fine rules and understated controls.'},
  {id:'neon',name:'Neon',description:'Fine accent edges and crisp, low-profile controls.'},
  {id:'ribbon',name:'Ribbon',description:'Balanced rounded controls with slim section markers.'},
]

export function StylePicker({value,onChange}:{value:Preferences;onChange:(p:Preferences)=>void}){
  const appearance=value.appearance??defaultAppearance
  return <fieldset className="app-style-picker">
    <legend>Application style</legend>
    <p className="muted guidance">Choose the shape and finish of controls and surfaces. Pair any style with a theme.</p>
    <div className="app-style-grid" role="group" aria-label="Application style">
      {styles.map(style=><button key={style.id} type="button" className="app-style-choice" aria-label={`${style.name} style`} aria-pressed={(appearance.appStyle??'default')===style.id} onClick={()=>onChange({...value,appearance:{...appearance,appStyle:style.id}})}>
        <span className="style-preview" data-style-variant={style.id} aria-hidden="true">
          <span className="style-preview-rail"><i/><i/><i/></span>
          <span className="style-preview-content"><span className="style-preview-heading"/><span className="style-preview-cards"><i/><i/><i/></span><span className="style-preview-controls"><i>▶</i><i>＋</i><i>···</i><span/></span></span>
        </span>
        <span className="app-style-name">{style.name}<span>{style.id==='default'?'Default':null}{(appearance.appStyle??'default')===style.id?' ✓':null}</span></span>
        <span className="app-style-description">{style.description}</span>
      </button>)}
    </div>
    <p className="muted guidance">Preview instantly. Use Save theme to keep your style; leaving Settings discards unsaved changes. Original keeps the familiar pill controls.</p>
  </fieldset>
}
