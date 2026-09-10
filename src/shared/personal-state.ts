import type {QueueItem} from './types'
import {personalStateSchema,mediaKey,showKey,type PersonalState,type PersonalCommand,type Metadata} from './personal-library'
export function changePersonal(current:PersonalState,input:PersonalCommand):PersonalState{
 const state=structuredClone(current)
 switch(input.action){
 case 'mix-save':{const i=state.mixes.findIndex(m=>m.id===input.mix.id);if(i<0)state.mixes.push(input.mix);else state.mixes[i]=input.mix;break}
 case 'mix-delete':state.mixes=state.mixes.filter(m=>m.id!==input.id);break
 case 'shelf-save':{const shelf={...input.shelf,entries:input.shelf.entries.filter((r,i,a)=>a.findIndex(x=>mediaKey(x)===mediaKey(r))===i)};const i=state.shelves.findIndex(s=>s.id===shelf.id);if(i<0)state.shelves.push(shelf);else state.shelves[i]=shelf;break}
 case 'shelf-delete':state.shelves=state.shelves.filter(s=>s.id!==input.id);break
 case 'trip-save':{const i=state.trips.findIndex(s=>s.id===input.trip.id);if(i<0)state.trips.push(input.trip);else state.trips[i]=input.trip;break}
 case 'trip-delete':state.trips=state.trips.filter(s=>s.id!==input.id);break
 case 'show-save':state.shows[showKey(input.serverId,input.showId)]=input.prefs;break
 case 'metadata-save':if(input.metadata)state.metadata[mediaKey(input.ref)]=Object.fromEntries(Object.entries(input.metadata).filter(([,v])=>v!==''));else delete state.metadata[mediaKey(input.ref)];break
 case 'view-save':{const i=state.views.findIndex(v=>v.id===input.view.id);if(i<0)state.views.push(input.view);else state.views[i]=input.view;state.activeView=input.view.id;break}
 case 'view-delete':state.views=state.views.filter(v=>v.id!==input.id);if(state.activeView===input.id)state.activeView='default';break
 case 'view-select':if(input.id!=='default'&&!state.views.some(v=>v.id===input.id))throw Error('That saved view is no longer available.');state.activeView=input.id;break
 }
 if(Object.keys(state.metadata).length>5000||Object.keys(state.shows).length>1000)throw Error('Personal library limit reached. Remove unused customizations first.')
 return personalStateSchema.parse(state)
}
export function applyMetadata<T extends {title:string;subtitle?:string;artist?:string;album?:string;authors?:string[];narrators?:string[]}>(item:T,m?:Metadata):T{if(!m)return item;return {...item,...m,subtitle:m.artist??m.author??item.subtitle,authors:m.author?[m.author]:item.authors,narrators:m.narrator?[m.narrator]:item.narrators}}

/** Keep display overrides inside the strict playback transport shape. */
export function applyQueueMetadata(item:QueueItem,m?:Metadata):QueueItem {
 if(!m)return item
 return {...item,title:m.title??item.title,subtitle:m.artist??m.author??item.subtitle,...(m.album?{context:m.album}:{})}
}
