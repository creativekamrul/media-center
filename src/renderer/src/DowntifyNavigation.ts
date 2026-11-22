import type {DtShelf} from '../../shared/downtify'
let pending:DtShelf|undefined
export function openDowntifyArtist(artist:DtShelf){pending=artist;window.dispatchEvent(new CustomEvent('app-navigate',{detail:'downtify'}));window.dispatchEvent(new Event('downtify-artist'))}
export function takeDowntifyArtist(){const result=pending;pending=undefined;return result}

let discoveryRequest:string|undefined
export function requestDowntifySearch(query:string){discoveryRequest=query.slice(0,300);window.dispatchEvent(new Event('downtify-discover'))}
export function takeDowntifySearch(){const query=discoveryRequest;discoveryRequest=undefined;return query}
