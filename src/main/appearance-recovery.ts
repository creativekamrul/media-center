import {defaultAppearance} from '../shared/appearance'
import {defaultPreferences, type Preferences} from '../shared/types'
import type {Store} from './store'

const key='appearance-recovery'
type SavedAppearance=Pick<Preferences,'theme'|'appearance'|'customCss'>
export function appearanceRecovery(store:Store, action:'get'|'start'|'restore') {
  const saved=store.get<SavedAppearance>(key)
  if(action==='start'){
    const prefs=store.preferences()
    if(!saved)store.set(key,{theme:prefs.theme,appearance:prefs.appearance,customCss:prefs.customCss})
    store.set('preferences',{...prefs,theme:defaultPreferences.theme,appearance:defaultAppearance,customCss:undefined})
  }else if(action==='restore'&&saved){
    store.set('preferences',{...store.preferences(),theme:saved.theme,appearance:saved.appearance,customCss:saved.customCss})
    store.set(key,null)
  }
  return !!store.get(key)
}
