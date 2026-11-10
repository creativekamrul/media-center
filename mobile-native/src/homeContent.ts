export type HomeContentKind='album'|'playlist'|'track'|'book'|'show';
/** Native history calls music tracks "music"; that is not an album or a spoken item. */
export function homeContentKind(provider:string,kind:unknown):HomeContentKind {
 if(provider==='audiobookshelf'){
  if(kind==='book'||kind==='show')return kind;
  throw Error('Unsupported spoken item on Home. Open its library to refresh it.');
 }
 if(provider!=='navidrome'&&provider!=='downtify')throw Error('Open this item from its media library.');
 if(kind==='music'||kind==='track')return 'track';
 if(kind==='album'||kind==='playlist')return kind;
 throw Error('Unsupported music item on Home. Open its library to refresh it.');
}
