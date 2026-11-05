const assert=require('node:assert/strict')
const {resolve}=require('node:path')
const {readFileSync,writeFileSync}=require('node:fs')
const ts=require('typescript')
module.exports=async({page,desktop,artifacts})=>{
 await page.evaluate(async()=>{const a=window.mediaCenter,s=await a.playback();if(s.status!=='playing')await a.command({action:'toggle'})})
 await page.waitForTimeout(2200)
 await page.evaluate(()=>window.mediaCenter.command({action:'stop'}))
 await page.locator('.sidebar').getByRole('button',{name:'Listening stats',exact:true}).click()
 await page.getByRole('button',{name:'Create my recap',exact:true}).click()
 await page.locator('.recap-preview img').waitFor()
 for(const name of ['Overview','Cinema','Journal']){
  await page.locator('.recap-style-choice').filter({hasText:name}).click()
  for(const width of [1440,1008]){
   await page.setViewportSize({width,height:940})
   await page.locator('.recap-section').evaluate(el=>el.scrollIntoView({block:'start'}))
   assert.ok(await page.locator('.workspace').evaluate(el=>el.scrollWidth<=el.clientWidth),'Recap fits available width')
   await page.screenshot({path:resolve(artifacts,`recap-refresh-${name}-${width}.png`)})
  }
 }
 const path=resolve(artifacts,'recap-refresh-export.png')
 await desktop.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:path})},path)
 await page.getByRole('button',{name:'Save PNG image',exact:true}).click()
 await page.getByText('Your recap image was saved.',{exact:true}).waitFor()
 const png=readFileSync(path);assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1440)
 // Render clearly labelled mixed-media fixtures through the actual canvas renderer.
 const code=ts.transpileModule(readFileSync('src/renderer/src/recap-art.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const images=await page.evaluate(async code=>{
  const exports={};new Function('exports',code)(exports);await document.fonts.ready
  const kinds=[{kind:'music-track',seconds:7200},{kind:'jellyfin-music',seconds:3600},{kind:'jellyfin-movie',seconds:14400},{kind:'jellyfin-episode',seconds:10800},{kind:'audiobook',seconds:1800},{kind:'podcast-episode',seconds:900}]
  const data={start:'2026-10-01',end:'2026-10-26',calendarDays:26,totalSeconds:38700,activeDays:12,uniqueItems:24,finishedBooks:1,finishedEpisodes:2,averageSeconds:1488,longestStreak:4,artists:[],comparison:{start:'2026-09-05',end:'2026-09-30',totalSeconds:0,changePercent:null,artists:[]},kinds,days:[{day:'2026-10-05',seconds:18000},{day:'2026-10-20',seconds:20700}],top:kinds.slice(0,5).map(k=>({title:'Fixture '+exports.kindNames[k.kind],subtitle:'Demo media · not user history',...k}))}
  return ['overview','cinema','journal'].map(style=>({style,png:exports.renderRecap(data,style,'ice','Mixed media · test fixture')}))
 },code)
 for(const image of images)writeFileSync(resolve(artifacts,`recap-mixed-${image.style}.png`),Buffer.from(image.png.split(',')[1],'base64'))
 await page.getByLabel('Recap start date',{exact:true}).fill('2000-01-01')
 assert.ok(await page.getByRole('button',{name:'Save PNG image',exact:true}).isDisabled(),'Date changes invalidate stale export')
 await page.locator('.sidebar').getByRole('button',{name:'Settings',exact:true}).click()
 assert.equal(await page.getByRole('checkbox',{name:'Share Jellyfin music, movies and TV',exact:true}).count(),1)
 console.log('Recap refresh passed: responsive design choices, real PNG export, date invalidation, mixed-media canvas fixtures, Jellyfin sharing control.')
}
