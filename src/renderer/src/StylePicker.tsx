import {defaultAppearance, type AppStyle} from '../../shared/appearance'
import type {Preferences} from '../../shared/types'

const styles: {id:AppStyle;name:string;description:string}[] = [
  {id:'default',name:'Original',description:'Your current design. Familiar pill buttons and clean panels.'},
  {id:'soft',name:'Soft',description:'Rounded surfaces, tonal controls, and floating cards.'},
  {id:'precision',name:'Precision',description:'Crisp controls, layered panels, and subtle edge highlights.'},
  {id:'outline',name:'Outline',description:'Square corners, fine rules, and a flat, structured layout.'},
  {id:'bold',name:'Bold',description:'Strong borders, offset shadows, and punchy controls.'},
  {id:'retro',name:'Retro',description:'Beveled buttons, inset fields, and classic desktop panels.'},
]

export function StylePicker({value,onChange}:{value:Preferences;onChange:(p:Preferences)=>void}){
  const appearance=value.appearance??defaultAppearance
  return <fieldset className="app-style-picker">
    <legend>Application style</legend>
    <p className="muted">A different feel for the whole app: buttons, cards, menus, navigation, and both players. Your theme colors and fonts stay yours.</p>
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
    <p className="muted">Preview instantly. Use Save theme to keep your style; leaving Settings discards unsaved changes. Choose Original to return to the current design.</p>
  </fieldset>
}
