import {useExperience} from './Experience'
import {api} from './actions'
import {message} from './ui'
import type {LibrarySelectionScope} from '../../shared/experience'

// Save only explicit choices: a missing/offline source must not overwrite the saved ID.
export function useLibrarySelection(scope:LibrarySelectionScope,fallback:string,error:(text:string)=>void){
 const [prefs,setPrefs]=useExperience()
 const value=prefs.navigation.librarySelections[scope]??fallback
 const select=(next:string)=>{
  setPrefs(current=>({...current,navigation:{...current.navigation,librarySelections:{...current.navigation.librarySelections,[scope]:next}}}))
  void api.saveNavigation({action:'library-selection',scope,value:next}).catch(e=>error(message(e)))
 }
 return [value,select] as const
}
