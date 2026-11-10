import {createReadCache} from './requestCache';
import {requireNativeModule} from 'expo-modules-core';
export type Account={authMode?:'apiKey'|'password';type?:'navidrome'|'downtify'|'audiobookshelf'|'jellyfin';id:string;name:string;url:string;username:string;allowHttp:boolean;version:string};
export type Entry={id:string;name?:string;title?:string;artist?:string;coverArt?:string;duration?:number;songCount?:number;saved?:boolean;genre?:string;genres?:string[];created?:string;addedAt?:number;year?:number;discNumber?:number;trackNumber?:number;track?:number;album?:string;albumCount?:number;suffix?:string;samplingRate?:number;bitDepth?:number};
interface LibraryModule {previewPlaylistFile():Promise<string>;linkPlaylistExport(token:string):Promise<boolean>;backupState():Promise<string>;retryBackupRecovery():Promise<boolean>;migrationFile(operation:string,password:string):Promise<string>;applyBackup(token:string):Promise<string>;finishBackupRestore():Promise<boolean>;discardBackup():Promise<boolean>;getMusicTransitions():Promise<string>;setMusicTransitions(raw:string):Promise<boolean>;mixSnapshot(action:string,raw:string):Promise<string>;playSpokenQueue(raw:string,start:number):Promise<boolean>;enqueueSpoken(account:string,kind:string,item:string,episode:string,title:string,next:boolean):Promise<boolean>;spokenQueueSession():Promise<string>;restoreSpokenQueueSession():Promise<boolean>;checkOfflineRules(force:boolean):Promise<string>;reviewOfflineProgress(key:string):Promise<string>;applyOfflineProgress(key:string,revision:string,choice:string):Promise<string>;podcastInbox(action:string,input:string):Promise<string>;takeSharedContent():Promise<string>;resolveSharedLink(account:string,url:string):Promise<string>;addListener(event:string,listener:()=>void):{remove:()=>void};seekTranscript(identity:string,position:number):Promise<boolean>;transcript(identity:string):Promise<string>;removeTranscript(identity:string):Promise<boolean>;retainArtwork(raw:string):Promise<boolean>;customAsset(operation:string,account:string,id:string,text:string):Promise<boolean>;removeCustomCover(account:string,id:string):Promise<boolean>;searchLyrics(identity:string,query:string):Promise<string>;probeAudio():Promise<string>;spokenSession():Promise<string>;removeCache(key:string):Promise<boolean>;playlistDraft(account:string,id:string):Promise<string>;saveServerPlaylist(account:string,raw:string):Promise<string>;verifyCache():Promise<string>;setCacheTemplate(value:string):Promise<boolean>;setCachePolicy(raw:string):Promise<boolean>;diagnostics():Promise<string>;getPlaybackPolicy():Promise<string>;setPlaybackPolicy(raw:string):Promise<boolean>;musicSession():Promise<string>;restoreMusicSession():Promise<boolean>;playMixed(items:string,start:number):Promise<boolean>;clearBrowseCache():Promise<boolean>;customLyrics(identity:string,text:string):Promise<boolean>;deviceLibrary():Promise<string>;saveRadio(title:string,url:string,http:boolean):Promise<boolean>;removeDeviceItem(id:string,station:boolean):Promise<boolean>;playDeviceItem(id:string,station:boolean):Promise<boolean>;chooseLocalFolder():Promise<boolean>;cacheSpoken(account:string,kind:string,item:string,episode:string):Promise<boolean>;enqueue(account:string,ids:string,next:boolean):Promise<boolean>;downtifySave(account:string,ids:string):Promise<number>;cacheControl(id:string,action:string):Promise<boolean>;cacheNetwork():Promise<boolean>;predictiveCache():Promise<number>;downtifyDiscover(account:string,mode:string,query:string,item:string):Promise<string>;jellyfinBrowse(account:string,mode:string,item:string,offset:number):Promise<string>;playJellyfin(account:string,item:string):Promise<string>;cacheJellyfinVideo(account:string,item:string):Promise<boolean>;playCachedVideo(key:string):Promise<boolean>;checkUpdate():Promise<string>;installUpdate():Promise<string>;getAudioOptions():Promise<string>;setAudioOptions(value:string):Promise<boolean>;listeningHistory(mode:string):Promise<string>;spokenBrowse(account:string,mode:string,item:string,offset:number):Promise<string>;spokenSeries(account:string,book:string,series:string,offset:number):Promise<string>;playSpoken(account:string,kind:string,item:string,episode:string,start:number):Promise<boolean>;chooseDownloadFolder():Promise<boolean>;downloads():Promise<string>;downloadTracks(account:string,ids:string,title:string):Promise<boolean>;playDownload(key:string):Promise<boolean>;lyrics():Promise<string>;favorite(account:string,id:string,value:boolean):Promise<boolean>;play(account:string,ids:string,index:number):Promise<boolean>;playbackState(version:number):Promise<string>;controlPlayback(action:string,value:number):Promise<boolean>;accounts():Promise<string>;saveAccount(input:string):Promise<string>;testAccount(id:string):Promise<string>;removeAccount(id:string):Promise<boolean>;browse(id:string,method:string,input:string):Promise<string>;cover(id:string,coverId:string,size:number):Promise<string>;getPreferences():Promise<string>;setPreferences(value:string):Promise<boolean>}
const native=requireNativeModule<LibraryModule>('MediaLibrary');
export type PodcastInboxRule={account:string;show:string;title:string;include:string;exclude:string;minSeconds:number;maxSeconds:number;limit:number;onlyUnplayed:boolean;enabled:boolean;autoCache:boolean;unmetered:boolean;lastChecked?:number;error?:string;key?:string};
export type PodcastInboxEntry={key:string;account:string;show:string;episode:string;kind:'episode';title:string;showTitle:string;coverArt:string;duration:number;publishedAt:number;addedAt:number;progressKnown:boolean;finished:boolean;position:number;reviewed:boolean;cacheState:''|'pending'|'queued';cacheError:string};
export type PodcastInboxState={rules:PodcastInboxRule[];items?:PodcastInboxEntry[];total?:number;busy:boolean;stopping:boolean;revision:number;error:string};
export type PodcastInboxAction='list'|'status'|'save-rule'|'remove-rule'|'reset-rule'|'review'|'remove'|'cache'|'clear-reviewed'|'check'|'stop';
export const podcastInbox={call:async(action:PodcastInboxAction,input:unknown={}):Promise<PodcastInboxState>=>JSON.parse(await native.podcastInbox(action,JSON.stringify(input)))};
export const accounts=async():Promise<Account[]>=>JSON.parse(await native.accounts());
export const saveAccount=async(input:Partial<Account>&{password:string;apiKey?:string}):Promise<Account>=>JSON.parse(await native.saveAccount(JSON.stringify(input)));
export const testAccount=(id:string)=>native.testAccount(id);
export const removeAccount=(id:string)=>native.removeAccount(id);
const reads=createReadCache<any>(30000,80,value=>JSON.stringify(value).length*2,16*1024*1024);
export const invalidateLibrary=()=>{reads.clear();void native.clearBrowseCache().catch(()=>{})};
export const browse=async(id:string,method:string,params:Record<string,string>={}):Promise<any>=>reads.read(JSON.stringify([id,method,params]),async()=>JSON.parse(await native.browse(id,method,JSON.stringify(params))));
export const preferences={read:async()=>JSON.parse(await native.getPreferences()),write:(value:unknown)=>native.setPreferences(JSON.stringify(value))};
const covers=createReadCache<string>(5*60*1000,64);
export const cover=(account:string,id:string,size=384)=>covers.read(JSON.stringify([account,id,size]),()=>native.cover(account,id,size));
export function clearCovers(){covers.clear()}
export function message(error:unknown){const text=error instanceof Error?error.message:'Something went wrong.';const clean=text.replace(/^Call to function '[^']+' has been rejected\.\s*/,'').replace(/^[\s\S]*?Caused by:\s*(?:[\w.$]+:\s*)?/,'');return clean||'Could not complete this request. Please try again.'}

export type PlayingTrack={fallbackFrom?:string;kind?:string;account:string;id:string;title:string;artist:string;album:string;coverArt:string;duration:number};
export type PlaybackState={musicTransitions?:MusicTransitions;crossfading?:boolean;transitionNotice?:string;compatibilityOutput?:boolean;queueVersion?:number;syncError?:string;loaded?:boolean;playing?:boolean;position?:number;duration?:number;error?:string;index?:number;repeat?:string;shuffle?:boolean;volume?:number;speed?:number;sleepUntil?:number;sleepAtEnd?:boolean;sourceFormat?:string;channels?:string;outputDriver?:string;processing?:AudioOptions;track?:PlayingTrack;queue?:PlayingTrack[];codec?:string;sampleRate?:string;outputRate?:string};
export const playback={mixed:(items:({account:string;id:string}&Partial<Entry>)[],index=0)=>native.playMixed(JSON.stringify(items.map(({account,id,title,artist,album,coverArt,duration})=>({account,id,title,artist,album,coverArt,duration}))),index),enqueue:(account:string,ids:string[],next=false)=>native.enqueue(account,JSON.stringify(ids),next),play:(account:string,ids:string[],index=0)=>native.play(account,JSON.stringify(ids),index),state:async(version=-1):Promise<PlaybackState>=>JSON.parse(await native.playbackState(version)),control:(action:string,value=0)=>native.controlPlayback(action,value)};

export const favorite=async(account:string,id:string,value:boolean)=>{const result=await native.favorite(account,id,value);reads.clear();return result};
export const lyrics=async():Promise<{synced?:string;plain?:string;instrumental?:boolean}>=>JSON.parse(await native.lyrics());

export type CacheJob={id:string;title:string;status:string;completed:number;total:number;current?:string;error?:string};
export type OfflineRuleStatus={busy:boolean;checks:{id:string;lastChecked:number;queued:number;error:string}[];message:string;lastBackground:number};
export const offlineRules={check:async(force=false):Promise<OfflineRuleStatus>=>JSON.parse(await native.checkOfflineRules(force))};
export type DownloadsState={ruleStatus?:OfflineRuleStatus;template?:string;policy?:CachePolicy;storedBytes?:number;jobs?:CacheJob[];folder?:string;busy:boolean;message:string;items:{key:string;title:string;artist:string;bytes:number;account?:string;kind?:string}[]};
export type PlaylistLinkPreview={token?:string;name?:string;tracks?:number};
export const downloads={linkPreview:async():Promise<PlaylistLinkPreview>=>JSON.parse(await native.previewPlaylistFile()),link:(token:string)=>native.linkPlaylistExport(token),video:(key:string)=>native.playCachedVideo(key),subscribe:(listener:()=>void)=>native.addListener('cacheChanged',listener),ahead:()=>native.predictiveCache(),remove:(key:string)=>native.removeCache(key),verify:()=>native.verifyCache(),template:(value:string)=>native.setCacheTemplate(value),policy:(value:CachePolicy)=>native.setCachePolicy(JSON.stringify(value)),control:(id:string,action:"pause"|"resume"|"cancel")=>native.cacheControl(id,action),unmetered:()=>native.cacheNetwork(),choose:()=>native.chooseDownloadFolder(),state:async():Promise<DownloadsState>=>JSON.parse(await native.downloads()),save:(account:string,ids:string[],title:string)=>native.downloadTracks(account,JSON.stringify(ids),title),play:(key:string)=>native.playDownload(key)};

export type SpokenEntry={id:string;kind:"library"|"book"|"show"|"episode";title:string;artist?:string;coverArt?:string;duration?:number;showId?:string};
export type SpokenQueueEntry={account:string;kind:'book'|'episode';item:string;episode:string;title:string};
export const spokenQueueSession={get:async():Promise<{queue?:SpokenQueueEntry[];index?:number;position?:number;updated?:number}>=>JSON.parse(await native.spokenQueueSession()),restore:()=>native.restoreSpokenQueueSession()};
export const spoken={queue:(items:SpokenQueueEntry[],start=0)=>native.playSpokenQueue(JSON.stringify(items),start),enqueue:(account:string,kind:'book'|'episode',item:string,episode='',title='',next=false)=>native.enqueueSpoken(account,kind,item,episode,title,next),cache:(account:string,kind:"book"|"episode",item:string,episode="")=>native.cacheSpoken(account,kind,item,episode),browse:async(account:string,mode:string,item="",offset=0):Promise<{items?:SpokenEntry[];total?:number;title?:string;artist?:string;coverArt?:string;series?:{id:string;title:string;sequence:string}[];chapters?:{title:string;start:number;end:number}[]} >=>JSON.parse(await native.spokenBrowse(account,mode,item,offset)),play:(account:string,kind:"book"|"episode",item:string,episode="",start=-1)=>native.playSpoken(account,kind,item,episode,start)};

export const listeningHistory=async(mode:"recent"|"most"):Promise<PlayingTrack[]>=>JSON.parse(await native.listeningHistory(mode));

export type ParametricBand={frequency:number;gain:number;q:number};
export type AudioOptions={silence?:"off"|"gentle"|"balanced"|"strong";parametric?:boolean;filters?:ParametricBand[];fallback?:number;speech?:boolean;replayGain:"no"|"track"|"album";preamp:number;eqPreamp:number;equalizer:boolean;bands:number[]};
export const audioOptions={get:async():Promise<AudioOptions>=>({replayGain:"no",preamp:0,eqPreamp:0,equalizer:false,bands:Array(10).fill(0),...JSON.parse(await native.getAudioOptions())}),set:(value:AudioOptions)=>native.setAudioOptions(JSON.stringify(value))};

export const updates={check:async():Promise<{available:boolean;name?:string;version?:string;installed?:string;message?:string;notes?:string;prerelease?:boolean}>=>JSON.parse(await native.checkUpdate()),install:()=>native.installUpdate()};

export type JellyfinEntry=Entry&{kind:string;overview?:string;year?:number;resume?:number;played?:boolean};
export const jellyfin={cacheVideo:(account:string,id:string)=>native.cacheJellyfinVideo(account,id),browse:async(account:string,mode:string,item="",offset=0):Promise<{items?:JellyfinEntry[];total?:number}&Partial<JellyfinEntry>>=>JSON.parse(await native.jellyfinBrowse(account,mode,item,offset)),play:(account:string,item:string)=>native.playJellyfin(account,item)};

export type DiscoveryEntry=Entry&{kind:string;year?:string;releaseType?:string};
export const downtifyDiscover=async(account:string,mode:string,query="",item=""):Promise<{tracks:Entry[];artists:DiscoveryEntry[];albums:DiscoveryEntry[];warning?:string}>=>JSON.parse(await native.downtifyDiscover(account,mode,query,item));

export const downtifySave=(account:string,ids:string[])=>native.downtifySave(account,JSON.stringify(ids));

export const deviceLibrary={list:async():Promise<{files:Entry[];stations:Entry[]} >=>JSON.parse(await native.deviceLibrary()),choose:()=>native.chooseLocalFolder(),saveRadio:(title:string,url:string,http:boolean)=>native.saveRadio(title,url,http),remove:(id:string,station:boolean)=>native.removeDeviceItem(id,station),play:(id:string,station:boolean)=>native.playDeviceItem(id,station)};

export const customLyrics=(identity:string,text:string)=>native.customLyrics(identity,text);

export type PlaybackPolicy={rewind:number;headset:'track'|'seek'|'disabled'};
export const playbackPolicy={get:async():Promise<PlaybackPolicy>=>({rewind:0,headset:'track',...JSON.parse(await native.getPlaybackPolicy())}),set:(p:PlaybackPolicy)=>native.setPlaybackPolicy(JSON.stringify(p))};
export const musicSession={get:async():Promise<{queue?:PlayingTrack[];index?:number;position?:number;updated?:number}>=>JSON.parse(await native.musicSession()),restore:()=>native.restoreMusicSession()};

export const diagnostics=()=>native.diagnostics();

export type CachePolicy={unmetered:boolean;charging:boolean;budget:number};

export type ServerPlaylistDraft={id:string;name:string;revision:string;entry?:Entry[];writable?:boolean;renameable?:boolean;reorderable?:boolean};
export const serverPlaylists={read:async(account:string,id:string):Promise<ServerPlaylistDraft>=>JSON.parse(await native.playlistDraft(account,id)),save:async(account:string,draft:{id?:string;name:string;revision?:string;ids:string[]})=>{const result=JSON.parse(await native.saveServerPlaylist(account,JSON.stringify(draft)));invalidateLibrary();return result}};

export type SpokenResume={account?:string;kind:'book'|'episode';item:string;episode:string;title:string;position:number;updated:number};
export const spokenSession=async():Promise<SpokenResume>=>JSON.parse(await native.spokenSession());

export const probeAudio=()=>native.probeAudio();
export const retainArtwork=(refs:{account:string;id:string}[])=>native.retainArtwork(JSON.stringify(refs));

export type LyricResult={id:number;title:string;artist:string;album:string;duration:number;synced?:string;plain?:string;instrumental?:boolean};
export const searchLyrics=async(identity:string,query:string):Promise<LyricResult[]>=>JSON.parse(await native.searchLyrics(identity,query));
export const customMedia={cover:(account:string,id:string)=>native.customAsset('cover',account,id,''),resetCover:(account:string,id:string)=>native.removeCustomCover(account,id),importLyrics:(identity:string)=>native.customAsset('import-lyrics','',identity,''),exportLyrics:(identity:string,text:string)=>native.customAsset('export-lyrics','',identity,text)};

export const transcript={seek:(identity:string,position:number)=>native.seekTranscript(identity,position),read:(identity:string)=>native.transcript(identity),remove:(identity:string)=>native.removeTranscript(identity),importFile:(identity:string)=>native.customAsset("import-transcript","",identity,"")};

export type SharedPayload={kind?:'text'|'link';value?:string;error?:string};
export type SharedResolution={kind:string;title:string;subtitle:string;coverArt:string;tracks:Entry[];albums:{url:string;title:string;coverArt:string;year:string}[];warning?:string};
export const sharedContent={take:async():Promise<SharedPayload>=>JSON.parse(await native.takeSharedContent()),listen:(callback:()=>void)=>native.addListener('sharedContent',callback),resolve:async(account:string,url:string):Promise<SharedResolution>=>JSON.parse(await native.resolveSharedLink(account,url))};

export type SeriesBook=SpokenEntry&{sequence:string;finished:boolean;progressKnown:boolean;current:boolean};
export const bookSeries=async(account:string,book:string,series:string,offset:number):Promise<{title:string;items:SeriesBook[];total:number}>=>JSON.parse(await native.spokenSeries(account,book,series,offset));

export type OfflineProgressReview={provider?:'jellyfin';key:string;title:string;duration:number;local:number;server:number;finished:boolean;updatedAt:number;revision:string};
export const offlineProgress={review:async(key:string):Promise<OfflineProgressReview>=>JSON.parse(await native.reviewOfflineProgress(key)),apply:(key:string,revision:string,choice:'local'|'server'):Promise<string>=>native.applyOfflineProgress(key,revision,choice)};

export const mixSnapshots={remove:async(id:string)=>{await native.mixSnapshot('remove',JSON.stringify({id}))},
 status:async():Promise<{items:import('./mixRefreshPlan').MixRefreshStatus[]}>=>JSON.parse(await native.mixSnapshot('status','{}')),
 get:async(id:string):Promise<{rows:import('./mixRules').MixCandidate[];updated:number;stale:boolean;error:string}>=>JSON.parse(await native.mixSnapshot('get',JSON.stringify({id}))),
 commit:async(recipe:import('./mixRules').MixRecipe,rows:import('./mixRules').MixCandidate[],period:number)=>{await native.mixSnapshot('commit',JSON.stringify({id:recipe.id,recipe,rows,period}))},
 failed:async(recipe:import('./mixRules').MixRecipe)=>{await native.mixSnapshot('failure',JSON.stringify({id:recipe.id,recipe}))},
};

export type MusicTransitions={gapless:boolean;crossfade:number};
export const musicTransitions={get:async():Promise<MusicTransitions>=>JSON.parse(await native.getMusicTransitions()),set:(value:MusicTransitions)=>native.setMusicTransitions(JSON.stringify(value))};

export type BackupPreview={verified?:boolean;canRestore?:boolean;token?:string;accounts?:number;history?:number;inbox?:number;assets?:number;exported?:boolean};
export const migrationBackup={file:async(operation:'backup-export'|'backup-preview',password:string):Promise<BackupPreview>=>JSON.parse(await native.migrationFile(operation,password)),apply:(token:string)=>native.applyBackup(token),finish:()=>native.finishBackupRestore(),discard:()=>native.discardBackup(),state:async():Promise<{recoveryError?:string}>=>JSON.parse(await native.backupState()),retryRecovery:()=>native.retryBackupRecovery()};
