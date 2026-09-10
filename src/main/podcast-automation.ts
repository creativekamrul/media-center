import {experienceSchema} from '../shared/experience'
import {progressKey} from '../shared/timeline'
import type {Store} from './store'
import type {Downloads} from './downloads'
import type {Player} from './player'
import type {InboxEpisode} from '../shared/daily'
export class PodcastAutomation {
 private timer:ReturnType<typeof setInterval>;private first:ReturnType<typeof setTimeout>;private busy=false;private stopped=false
 constructor(private store:Store,private downloads:Downloads,private player:Player,private inbox:()=>Promise<InboxEpisode[]>){this.timer=setInterval(()=>void this.run(),600000);this.timer.unref();this.first=setTimeout(()=>void this.run(),30000);this.first.unref()}
 async run(){if(this.busy||this.stopped)return;const rules=experienceSchema.parse(this.store.get('experience')??{}).podcastRules.filter(r=>r.enabled);if(!rules.length)return;this.busy=true;try{const episodes=await this.inbox();if(this.stopped)return;for(const rule of rules){const key='podcast-managed:'+JSON.stringify([rule.serverId,rule.showId]),managed=new Set(this.store.get<string[]>(key)??[]),rows=episodes.filter(e=>e.item.target.kind==='podcast-episode'&&e.item.target.serverId===rule.serverId&&e.item.target.showId===rule.showId).sort((a,b)=>(b.episode.publishedAt??0)-(a.episode.publishedAt??0));if(!rows.length)continue;const latest=rows.filter(e=>e.episode.downloaded&&(!rule.removeFinished||e.episode.progress?.status!=='finished')).slice(0,rule.keep),keep=new Set(latest.map(e=>progressKey(e.item.target))),entries=this.downloads.snapshot().entries;
 for(const entry of entries){if(!managed.has(entry.id))continue;const identity=progressKey(entry.item.target),row=rows.find(e=>progressKey(e.item.target)===identity),current=this.player.state.queue[this.player.state.queueIndex];if(!row||current&&this.player.state.status!=='idle'&&progressKey(current.target)===identity)continue;if(!keep.has(identity)){await this.downloads.action(entry.id,'remove');managed.delete(entry.id)}}
 for(const row of latest){if(this.stopped)return;const identity=progressKey(row.item.target);if(!this.downloads.snapshot().entries.some(e=>progressKey(e.item.target)===identity)){await this.downloads.add([row.item]);const entry=this.downloads.snapshot().entries.find(e=>progressKey(e.item.target)===identity);if(entry)managed.add(entry.id)}}this.store.set(key,[...managed])}this.store.set('podcastAutomationStatus',{at:Date.now(),message:'Automatic downloads checked.'})}catch{this.store.set('podcastAutomationStatus',{at:Date.now(),message:'Automatic downloads could not refresh. Check your servers and storage limit.'})}finally{this.busy=false}}
 stop(){this.stopped=true;clearInterval(this.timer);clearTimeout(this.first)}
}
