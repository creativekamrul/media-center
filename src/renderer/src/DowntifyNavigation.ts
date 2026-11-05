import type {DtShelf} from '../../shared/downtify'
let pending:DtShelf|undefined
export function openDowntifyArtist(artist:DtShelf){pending=artist;window.dispatchEvent(new CustomEvent('app-navigate',{detail:'downtify'}));window.dispatchEvent(new Event('downtify-artist'))}
export function takeDowntifyArtist(){const result=pending;pending=undefined;return result}
