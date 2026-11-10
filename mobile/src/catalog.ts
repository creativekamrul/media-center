export const releases=[
  {title:'Night Transit',artist:'Northline',source:'Navidrome',colors:['#123f43','#f28055','#f4d895','#547e70'],tracks:['Night Transit','Harbor Lights']},
  {title:'Slow Motion',artist:'Vera Moon',source:'Downtify',colors:['#c99b7a','#422c38','#e8c1a6','#815e6b'],tracks:['Slow Motion','Open Window']},
  {title:'Still Form',artist:'Vera Moon',source:'Downtify',colors:['#e2c5a2','#934c37','#f6d9ad','#653d33'],tracks:['Still Form','Clay Lines']},
  {title:'Low Water',artist:'Signal Hill',source:'Navidrome',colors:['#1e4550','#61888a','#c8d3b0','#244c48'],tracks:['Low Water','Distant Buoys']},
  {title:'Focus Flow',artist:'Mira Vale',source:'Downtify',colors:['#dc7854','#6e3540','#f4c978','#b74937'],tracks:['Focus Flow','After Sunrise']},
  {title:'Evening Drift',artist:'Low Atlas',source:'Navidrome',colors:['#314c49','#86a398','#e8d6a5','#546e67'],tracks:['Evening Drift','Field Notes']},
] as const
export const tracks=releases.flatMap((r,album)=>r.tracks.map((title,i)=>({id:album*2+i,title,album,artist:r.artist,seconds:256-album*11+i*14})))
export type Track=typeof tracks[number]
export const playlists=[
  {name:'Evening Drift',art:5,ids:[0,6,10,1]},
  {name:'Focus Flow',art:4,ids:[8,9,4,2]},
  {name:'Quiet Mornings',art:2,ids:[4,5,10]},
  {name:'Road Sessions',art:0,ids:[0,1,2,3,8]},
]
export const time=(s:number)=>Math.floor(s/60)+':'+String(Math.floor(s)%60).padStart(2,'0')
