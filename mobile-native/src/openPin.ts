import {router} from 'expo-router';
import {playback,spoken} from './library';
import type {Pin} from './pins';
export async function openPin(p:Pin){if(p.route==='/mixes'){router.push({pathname:'/mixes',params:{id:p.id}});return}if(p.kind==='track'&&p.route!=='/jellyfin'){await playback.play(p.account,[p.id]);router.push('/player');return}if(p.kind==='episode'){if(!p.showId)throw Error('This episode is missing its show identity. Pin it again from its show.');await spoken.play(p.account,'episode',p.showId,p.id);router.push('/player');return}router.push({pathname:p.route,params:{account:p.account,id:p.id,kind:p.kind,title:p.title,cover:p.cover??''}})}
