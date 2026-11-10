import {useAppVisibility} from './useAppVisibility';
import * as SplashScreen from 'expo-splash-screen';
import {LaunchScreen} from './LaunchScreen';
import {MixRefresh} from './MixRefresh';
import {CacheRules} from './CacheRules';
import {PodcastInboxChecks} from './PodcastInboxChecks';
import {PredictiveCacheChecks} from './PredictiveCacheChecks';
import type {OfflineRule} from './cacheRulesModel';
import type {Pin} from './pins';
import React,{createContext,useContext,useEffect,useState,useRef,useMemo,useCallback} from 'react';



import {accounts,preferences,playback,retainArtwork,invalidateLibrary,testAccount,message,type Account,type PlaybackState} from './library';

export const palettes={amoled:{bg:'#000000',panel:'#121212',text:'#f5f5f5',muted:'#aaaaaa',accent:'#98e2bd'},snow:{bg:'#ffffff',panel:'#f1f3f5',text:'#111820',muted:'#566170',accent:'#2868ba'},graphite:{bg:'#0b0c0e',panel:'#1b1e23',text:'#f0f1f3',muted:'#a2a8b1',accent:'#c0cad8'},sand:{bg:'#f5f0e7',panel:'#e9dfd0',text:'#30271d',muted:'#756552',accent:'#945127'},charcoal:{bg:'#101513',panel:'#202b25',text:'#eff3ef',muted:'#a5afa9',accent:'#80e5ac'},midnight:{bg:'#0e1421',panel:'#1e2b40',text:'#eff3fb',muted:'#a4b3cc',accent:'#9fbaff'},plum:{bg:'#18111c',panel:'#302137',text:'#f6eef8',muted:'#bdaac7',accent:'#d8a6ee'},paper:{bg:'#f0f2ed',panel:'#ffffff',text:'#17251d',muted:'#506458',accent:'#267747'}};

export type Palette={bg:string;panel:string;text:string;muted:string;accent:string};

export type Preferences={backgroundOfflineRules?:boolean;cacheAhead?:0|1|3|5;offlineRules?:OfflineRule[];pins?:Pin[];glassOpacity?:number;glassRefraction?:number;bookmarks?:{key:string;position:number;title:string;created:number;mediaTitle?:string;note?:string}[];colors?:Partial<Palette>;homeSections?:string[];playerBackdrop?:boolean;lyricsSize?:number;lyricsAlign?:'left'|'center';selected?:string;palette:keyof typeof palettes;material:'solid'|'blurred'|'frosted'|'glass';reduceMotion:boolean;likes:string[];[key:string]:unknown};

type State={flushPreferences:()=>Promise<void>;rehydrate:()=>Promise<void>;connectionErrors:Record<string,string>;health:Record<string,'checking'|'online'|'offline'>;connections:Account[];selected?:Account;prefs:Preferences;setPrefs:(p:Partial<Preferences>)=>void;reload:()=>Promise<void>;select:(id:string)=>void;refresh:number;refreshLibrary:()=>void;notice:string;setNotice:(v:string)=>void};

const Context=createContext<State>(null!);
const PlayerContext=createContext<PlaybackState>({});
export const usePlayer=()=>useContext(PlayerContext);

export function AppState({children}:{children:React.ReactNode}){
 const foreground=useAppVisibility();

 const [connections,setConnections]=useState<Account[]>([]),[prefs,set]=useState<Preferences>({palette:'charcoal',material:'solid',reduceMotion:false,likes:[]}),[ready,setReady]=useState(false),[player,setPlayer]=useState<PlaybackState>({}),[refresh,setRefresh]=useState(0),[notice,setNotice]=useState('');

 const [connectionErrors,setConnectionErrors]=useState<Record<string,string>>({});
 const [health,setHealth]=useState<Record<string,'checking'|'online'|'offline'>>({});

 useEffect(()=>{let live=true;connections.forEach(a=>{testAccount(a.id).then(()=>{if(live){setHealth(v=>({...v,[a.id]:'online'}));setConnectionErrors(v=>({...v,[a.id]:''}))}}).catch(e=>{if(live){setHealth(v=>({...v,[a.id]:'offline'}));setConnectionErrors(v=>({...v,[a.id]:message(e)}))}})});return()=>{live=false}},[connections,refresh]);

 const running=useRef(false),lastPlayer=useRef(''),queueVersion=useRef(-1);

 const reload=useCallback(async()=>{const list=await accounts();setConnections(list);set(p=>({...p,selected:list.some(a=>a.id===p.selected)?p.selected:list[0]?.id}))},[])

 useEffect(()=>{Promise.all([accounts(),preferences.read()]).then(([list,p])=>{setConnections(list);set({...p,palette:p.palette in palettes?p.palette:'charcoal',material:p.material==='glass'&&p.liquidGlassAcknowledged!==true?'frosted':['solid','blurred','frosted','glass'].includes(p.material)?p.material:'solid',reduceMotion:!!p.reduceMotion,likes:Array.isArray(p.likes)?p.likes.filter((x:unknown)=>typeof x==='string'):[],selected:list.some(a=>a.id===p.selected)?p.selected:list[0]?.id})}).catch(()=>setNotice('Could not read saved settings.')).finally(()=>setReady(true))},[]);

 const preferenceWrites=useRef(Promise.resolve());
 useEffect(()=>{if(ready&&foreground)void retainArtwork((prefs.pins??[]).filter(p=>p.route!=='/mixes').map(p=>({account:p.account,id:p.cover||p.id}))).catch(()=>{})},[ready,foreground,prefs.pins]);
 useEffect(()=>{if(ready)preferenceWrites.current=preferenceWrites.current.then(()=>preferences.write(prefs)).then(()=>{}).catch(()=>setNotice('Could not save settings.'))},[prefs,ready]);

 useEffect(()=>{if(!foreground)return;let live=true;const update=async()=>{if(running.current)return;running.current=true;try{const s=await playback.state(queueVersion.current);const serialized=JSON.stringify(s);if(live&&serialized!==lastPlayer.current){lastPlayer.current=serialized;queueVersion.current=s.queueVersion??-1;setPlayer(previous=>({...s,queue:s.queue??previous.queue}))}}catch{}finally{running.current=false}};void update();const timer=setInterval(()=>void update(),250);return()=>{live=false;clearInterval(timer)}},[foreground]);

 const flushPreferences=useCallback(async()=>{await preferenceWrites.current},[]);
 const rehydrate=useCallback(async()=>{await preferenceWrites.current;const [list,p]=await Promise.all([accounts(),preferences.read()]);setConnections(list);set({...p,palette:p.palette in palettes?p.palette:'charcoal',material:p.material==='glass'&&p.liquidGlassAcknowledged!==true?'frosted':['solid','blurred','frosted','glass'].includes(p.material)?p.material:'solid',reduceMotion:!!p.reduceMotion,likes:Array.isArray(p.likes)?p.likes.filter((x:unknown)=>typeof x==='string'):[],selected:list.some(a=>a.id===p.selected)?p.selected:list[0]?.id});invalidateLibrary();setRefresh(v=>v+1)},[]);
 const setPrefs=useCallback((p:Partial<Preferences>)=>set(v=>({...v,...p})),[]);
 const select=useCallback((id:string)=>set(v=>({...v,selected:id})),[]);
 const refreshLibrary=useCallback(()=>{invalidateLibrary();setRefresh(v=>v+1)},[]);
 const value=useMemo(()=>({flushPreferences,rehydrate,connectionErrors,health,connections,selected:connections.find(a=>a.id===prefs.selected),prefs,setPrefs,reload,select,refresh,refreshLibrary,notice,setNotice}),[flushPreferences,rehydrate,connectionErrors,health,connections,prefs,setPrefs,reload,select,refresh,refreshLibrary,notice]);
 useEffect(()=>{if(ready)void SplashScreen.hideAsync().catch(()=>{})},[ready]);
 if(!ready)return <LaunchScreen/>;

 return <Context.Provider value={value}><PlayerContext.Provider value={player}><CacheRules/><MixRefresh/><PodcastInboxChecks/><PredictiveCacheChecks/>{children}</PlayerContext.Provider></Context.Provider>;

}

export const useApp=()=>useContext(Context);

export const usePalette=():Palette=>{const {prefs}=useApp();const base=palettes[prefs.palette];return {...base,...Object.fromEntries(Object.entries(prefs.colors??{}).filter(([k,v])=>k in base&&typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)))};};

