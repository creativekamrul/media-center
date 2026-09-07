import type { ListeningRecap } from '../../shared/recap'
export const recapStyles = {aurora:{name:'Aurora',background:'#111b29',panel:'#19293a',accent:'#b6ebd5',second:'#b4b0f6'},sunset:{name:'Sunset',background:'#291c26',panel:'#3c2a31',accent:'#ffd2a4',second:'#e89fc5'},ink:{name:'Ink',background:'#141414',panel:'#252525',accent:'#eee9dd',second:'#bbb5aa'}} as const
export type RecapStyle = keyof typeof recapStyles
export const kindNames:Record<string,string>={'music-track':'Music',audiobook:'Books','podcast-episode':'Podcasts','local-file':'Local',radio:'Radio'}
export function renderRecap(data:ListeningRecap,style:RecapStyle):string {
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440
  const c=canvas.getContext('2d');if(!c)throw new Error('Image rendering is unavailable.')
  const p=recapStyles[style];c.fillStyle=p.background;c.fillRect(0,0,1080,1440)
  const glow=c.createRadialGradient(940,90,20,940,90,790);glow.addColorStop(0,p.second+'55');glow.addColorStop(1,p.background+'00');c.fillStyle=glow;c.fillRect(0,0,1080,1440)
  c.save();c.translate(930,230);for(let r=85;r<390;r+=18){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.strokeStyle=p.accent+'18';c.lineWidth=1;c.stroke()}c.restore()
  const text=(value:string,x:number,y:number,size:number,color='#f5f1ec',family='Segoe UI',weight=400,max=940)=>{c.font=`${weight} ${size}px ${family}`;c.fillStyle=color;let v=value;while(c.measureText(v).width>max&&v.length>1)v=Array.from(v).slice(0,-2).join('')+'…';c.fillText(v,x,y)}
  const line=(y:number)=>{c.fillStyle=p.accent+'30';c.fillRect(64,y,952,1)}
  const box=(x:number,y:number,w:number,h:number)=>{c.fillStyle=p.panel;c.beginPath();c.roundRect(x,y,w,h,24);c.fill()}
  const nice=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})
  text('MEDIA CENTER  /  LISTENING RECAP',64,76,19,p.accent,'Segoe UI',600)
  text('A little time.',64,166,72,'#fff8ee','Georgia');text('Entirely yours.',64,245,72,'#fff8ee','Georgia')
  text(`${nice(data.start)} — ${nice(data.end)}`,68,302,22,p.accent)
  const minutes=Math.floor(data.totalSeconds/60),tiny=data.totalSeconds<60
  text((tiny?Math.max(1,Math.round(data.totalSeconds)):minutes).toLocaleString(),58,475,144,p.accent,'Segoe UI',650,940)
  text(tiny?'SECONDS OF LISTENING':'MINUTES OF LISTENING',68,523,21,'#e4e8ed','Segoe UI',500)
  box(64,567,460,120);box(544,567,472,120)
  text(String(data.activeDays),88,625,42,p.accent,'Segoe UI',600);text(data.activeDays===1?'day with a soundtrack':'days with a soundtrack',88,661,19)
  text(String(data.uniqueItems),568,625,42,p.accent,'Segoe UI',600);text('different listens',568,661,19)
  text('Your most-listened.',64,747,35,'#fff8ee','Georgia')
  const format=(s:number)=>s<60?`${Math.round(s)}s`:`${Math.floor(s/60).toLocaleString()} min`
  data.top.forEach((t,i)=>{const y=800+i*71;text(String(i+1).padStart(2,'0'),64,y,23,p.accent,'Segoe UI',600,45);text(t.title,120,y,25,'#fff8ee','Segoe UI',600,705);text(`${kindNames[t.kind]??'Audio'} · ${t.subtitle}`,120,y+25,17,'#bfc8d3','Segoe UI',400,705);c.textAlign='right';text(format(t.seconds),1016,y,20,p.accent,'Segoe UI',500,170);c.textAlign='left'})
  line(1150);text('YOUR LISTENING MIX',64,1193,18,p.accent,'Segoe UI',600)
  let offset=64
  data.kinds.forEach((k,i)=>{const w=952*k.seconds/data.totalSeconds;c.fillStyle=[p.accent,p.second,'#80b7cd','#d8b78b','#c4bfd3'][i%5];c.fillRect(offset,1214,w,10);offset+=w})
  text(data.kinds.map(k=>`${kindNames[k.kind]??'Audio'} ${Math.round(k.seconds/data.totalSeconds*100)}%`).join('   ·   '),64,1258,19,'#e4e8ed','Segoe UI',400,952)
  text(`${data.finishedBooks} books finished  ·  ${data.finishedEpisodes} episodes finished`,64,1310,20,p.accent)
  line(1342);text('Your collection. Your own frequency.',64,1390,20,'#fff8ee','Georgia');c.textAlign='right';text('Recorded on this device',1016,1390,17,'#bfc8d3','Segoe UI',400,400)
  return canvas.toDataURL('image/png')
}
