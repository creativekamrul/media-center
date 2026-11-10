import React from 'react';

import Svg,{Path,Circle,Rect} from 'react-native-svg';

export type IconName='pin'|'up'|'home'|'explore'|'library'|'search'|'menu'|'settings'|'back'|'down'|'heart'|'close'|'plus'|'check'|'server'|'refresh'|'music'|'lyrics'|'queue'|'edit'|'trash'|'arrow'|'play'|'pause'|'next'|'previous'|'shuffle'|'repeat'|'volume'|'timer'|'download'|'book'|'video';

const paths:Partial<Record<IconName,string>>={pin:'m8 3 8 0-1 6 4 4H5l4-4ZM12 13v8',up:'m5 15 7-7 7 7',play:'m8 4 13 8-13 8Z',pause:'M8 5v14M16 5v14',next:'m5 5 10 7-10 7ZM19 5v14',previous:'m19 5-10 7 10 7ZM5 5v14',shuffle:'M3 5h3c5 0 7 14 12 14h3m-3-3 3 3-3 3M3 19h3c5 0 7-14 12-14h3m-3-3 3 3-3 3',repeat:'m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4M21 13v3a2 2 0 0 1-2 2H3',volume:'M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14',timer:'M9 2h6M12 8v5l3 2M19 5l2 2M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',book:'M12 5v16M3 3l9 2 9-2v16l-9 2-9-2Z',video:'M3 5h18v14H3Zm5 0v14M16 5v14M3 10h5m8 0h5M3 14h5m8 0h5',home:'M3 10 12 3 21 10V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',library:'M4 4v16M9 4v16M14 5l5 15M3 20h7',menu:'M4 6h16M4 12h12M4 18h16',back:'m14 5-7 7 7 7M7 12h14',down:'m5 9 7 7 7-7',heart:'M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z',close:'m6 6 12 12M6 18 18 6',plus:'M12 5v14M5 12h14',check:'m5 12 4 4L19 6',refresh:'M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 14-1l1 3M4 15l1 3a8 8 0 0 0 14-1',music:'M9 17V5l11-2v12M9 8l11-2M9 17c0 4-6 4-6 1 0-2 3-3 6-1ZM20 15c0 4-6 4-6 1 0-2 3-3 6-1Z',lyrics:'M5 4h14v13H9l-4 4ZM8 8h8M8 12h5',queue:'M4 5h16M4 10h16M4 15h9m4-1 4 3-4 3Z',edit:'m4 16 12-12 4 4L8 20H4ZM13 7l4 4',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',arrow:'m9 5 7 7-7 7',settings:'M4 6h16M4 12h16M4 18h16'};

export function Icon({name,size=23,color='#eff3ef',filled=false}:{name:IconName;size?:number;color?:string;filled?:boolean}){

 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden>

 {paths[name]&&<Path d={paths[name]} fill={name==='heart'&&filled?color:'none'}/>}

 {name==='search'&&<><Circle cx={10.5} cy={10.5} r={6.5}/><Path d="m16 16 5 5"/></>}

 {name==='explore'&&<><Circle cx={12} cy={12} r={9}/><Path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/></>}

 {name==='server'&&<><Rect x={3} y={3} width={18} height={7} rx={2}/><Rect x={3} y={14} width={18} height={7} rx={2}/><Path d="M7 6.5h.1M7 17.5h.1"/></>}

 {name==='settings'&&<><Circle cx={8} cy={6} r={2} fill="#101513"/><Circle cx={16} cy={12} r={2} fill="#101513"/><Circle cx={10} cy={18} r={2} fill="#101513"/></>}

 </Svg>

}

