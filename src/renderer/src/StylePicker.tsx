import {stylePresets,chooseStyle,currentStyle} from '../../shared/styles'
import {defaultAppearance} from '../../shared/appearance'
import type {Preferences} from '../../shared/types'

export function StylePicker({value,onChange}:{value:Preferences;onChange:(p:Preferences)=>void}){
  const appearance=value.appearance??defaultAppearance
  return <fieldset className="app-style-picker">
    <legend>Application style</legend>
    {!appearance.stylePalette&&<p className="muted">Your saved colors are kept. Choosing a style loads its default palette.</p>}
    <p className="muted guidance">Each style includes a default palette. Choose a style, then customize its colors below.</p>
    <div className="app-style-grid" role="group" aria-label="Application style">
      {stylePresets.map(style=><button key={style.id} type="button" className="app-style-choice" aria-label={`${style.name} style`} aria-pressed={currentStyle(appearance.appStyle??'default')===style.id} onClick={()=>onChange({...value,appearance:chooseStyle(appearance,style.id)})}>
        <span className="style-preview" data-style-variant={style.id} style={{background:style.colors.background,color:style.colors.text,'--panel':style.colors.panel,'--accent':style.colors.accent,'--text':style.colors.text} as React.CSSProperties} aria-hidden="true">
          <span className="style-preview-rail"><i/><i/><i/></span>
          <span className="style-preview-content"><span className="style-preview-heading"/><span className="style-preview-cards"><i/><i/><i/></span><span className="style-preview-controls"><i>▶</i><i>＋</i><i>···</i><span/></span></span>
        </span>
        <span className="app-style-name">{style.name}<span>{style.id==='default'?'Default':null}{currentStyle(appearance.appStyle??'default')===style.id?' ✓':null}</span></span>
        <span className="app-style-description">{style.description}</span>
      </button>)}
    </div>
    <p className="muted guidance">Choosing a style loads its default colors. Your fonts, density and listening preferences are kept.</p>
  </fieldset>
}
