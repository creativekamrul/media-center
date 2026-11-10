import {browse,playback,jellyfin,downtifyDiscover,deviceLibrary,type Account,type Entry} from './library';
import {planLibraryRadio,type RadioSource,type RadioTrack} from './libraryRadioPlan';
/** Bounded saved-library radio. Discovery metadata supplies artists, never unsaved queue entries. */
let building=false;
export async function startLibraryRadio(accounts:Account[],account:string,seed:Entry,feedback:unknown,similarityId?:string){
 if(building)throw Error('A radio queue is already being built.');building=true;
 try{
  const before=await playback.state();const sources:RadioSource[]=accounts.filter(a=>['navidrome','downtify','jellyfin'].includes(a.type??'navidrome')).map(a=>({id:a.id,kind:a.type??'navidrome'} as RadioSource));sources.push({id:'device',kind:'device'});
  let local:ReturnType<typeof deviceLibrary.list>|undefined;
  const result=await planLibraryRadio(sources,{...seed,account},{similar:async(source)=>{
   if(source.kind==='jellyfin')return (await jellyfin.browse(source.id,'music-similar',seed.id)).items??[];
   if(source.kind==='downtify')return (await downtifyDiscover(source.id,'similar','',seed.id)).tracks;
   if(source.kind==='navidrome')return (await browse(source.id,'getSimilarSongs2',{id:similarityId??seed.id,count:'60'})).similarSongs2?.song??[];
   return [];
  },search:async(source,artist)=>{
   if(source.kind==='device'){local??=deviceLibrary.list();return (await local).files.filter(t=>(t.artist??'').toLocaleLowerCase().includes(artist.toLocaleLowerCase())).map(t=>({...t,account:'device'}))}
   if(source.kind==='jellyfin')return ((await jellyfin.browse(source.id,'search',artist)).items??[]).filter(t=>t.kind==='track');
   return (await browse(source.id,'search3',{query:artist,songCount:'40',albumCount:'0',artistCount:'0'})).searchResult3?.song??[];
  }},feedback);
  const after=await playback.state();
  if(before.queueVersion!==after.queueVersion||before.index!==after.index||before.loaded!==after.loaded)throw Error('Playback changed while radio was being built. Start radio again if you still want it.');
  await playback.mixed(result.tracks,0);return result;
 }finally{building=false}
}
export async function startArtistRadio(accounts:Account[],account:string,artistId:string,feedback:unknown){
 const source=accounts.find(a=>a.id===account);if(!source||source.type==='audiobookshelf')throw Error('Choose a music artist.');
 const albums=source.type==='jellyfin'?(await jellyfin.browse(account,'artist-albums',artistId)).items??[]:(await browse(account,'getArtist',{id:artistId})).artist?.album??[];
 for(const album of albums.slice(0,3)){let tracks:Entry[];try{tracks=source.type==='jellyfin'?((await jellyfin.browse(account,'items',album.id)).items??[]).filter(t=>t.kind==='track'):(await browse(account,'getAlbum',{id:album.id})).album?.song??[]}catch{continue}if(tracks[0])return startLibraryRadio(accounts,account,tracks[0],feedback,artistId)}
 throw Error('No playable saved tracks were found in this artist’s first three albums.');
}
export function radioNotice(result:{tracks:RadioTrack[];related:number;failed:number;limited:boolean}){return 'Library radio · '+result.tracks.length+' tracks'+(!result.related?' · same-artist fallback':result.failed?' · some sources unavailable':'')+(result.limited?' · first eight sources checked':'')}
