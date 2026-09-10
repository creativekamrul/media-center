import {useState} from 'react'
import type {Library} from '../../shared/types'
import {MusicBrowser} from './MusicBrowser'
import {LocalPage} from './LocalLibrary'
export function PlaylistsPage({libraries,error,revision}:{libraries:Library[];error:(s:string)=>void;revision:number}){
 const [source,setSource]=useState(libraries.length?'server':'local')
 const sourceControl=<select aria-label="Playlist source" value={source} onChange={e=>setSource(e.target.value)}><option value="server">Music servers</option><option value="local">Local folders</option></select>
 return <section className="playlists-page">{source==='server'?<MusicBrowser libraries={libraries} error={error} revision={revision} headerActions={sourceControl} playlistOnly/>:<LocalPage error={error} headerActions={sourceControl} playlistOnly/>}</section>
}
