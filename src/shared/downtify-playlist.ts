import type {DtTrack} from './downtify'
export function filterPlaylist(tracks:DtTrack[],query:string):DtTrack[]{
 const words=query.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean)
 if(!words.length)return [...tracks]
 return tracks.filter(t=>{const text=[t.title,t.artist,t.album].join(' ').normalize('NFKC').toLocaleLowerCase();return words.every(word=>text.includes(word))})
}
/** Shuffle occurrences, not identities: repeated songs remain repeated. */
export function shufflePlaylist<T>(tracks:readonly T[],random= Math.random):T[]{
 const next=[...tracks];for(let i=next.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}return next
}
