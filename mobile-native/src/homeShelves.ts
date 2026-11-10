import {browse,listeningHistory,type Account,type Entry} from './library';
export async function homeItems(account:Account,title:string,likes:string[],offset=0):Promise<{items:Entry[];more:boolean}>{
 if(title==='Most played'||title==='Recently played'){const rows=(await listeningHistory(title==='Most played'?'most':'recent')).filter(t=>t.account===account.id&&(!t.kind||t.kind==='music'));return {items:rows,more:false}}
 if(title==='Favorites'){
  if(account.type==='downtify'){const ids=likes.filter(k=>k.startsWith(account.id+':')).map(k=>k.slice(account.id.length+1));if(!ids.length)return {items:[],more:false};const r=await browse(account.id,'getFavoriteTracks',{ids:JSON.stringify(ids)});return {items:r.starred2?.song??[],more:false}}
  const r=await browse(account.id,'getStarred2');return {items:r.starred2?.song??[],more:false};
 }
 if(title==='Playlists'){const r=await browse(account.id,'getPlaylists');return {items:r.playlists?.playlist??[],more:false}}
 const r=await browse(account.id,'getAlbumList2',{type:title==='Rediscover'?'random':'newest',size:'40',offset:String(offset)});const items=r.albumList2?.album??[];return {items,more:items.length===40};
}
