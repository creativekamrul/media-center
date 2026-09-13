const assert=require('node:assert/strict');const {resolve}=require('node:path')
module.exports=async({desktop,page,artifacts})=>{
 const original=await page.evaluate(()=>window.mediaCenter.preferences()),screen=await page.evaluate(()=>window.mediaCenter.playingScreenPreferences())
 const nav=(await page.evaluate(()=>window.mediaCenter.libraries())).libraries.find(l=>l.kind==='music')
 const mix={id:require('node:crypto').randomUUID(),name:'Evening mix · fixture',description:'A selection from your music, ready whenever you are.',sources:[{kind:'navidrome',serverId:nav.serverId,libraryId:nav.id}],match:'all',groups:[],sort:'random',descending:false,limit:20,artistLimit:0}
 let mini
 try{
  await page.getByRole('button',{name:'Home',exact:true}).click()
  const notify=state=>desktop.evaluate(({BrowserWindow},state)=>BrowserWindow.getAllWindows()[0].webContents.send('updates:state',state),state)
  await notify({currentVersion:'1.3.1',status:'available',version:'9.9.9'})
  const notice=page.getByRole('status',{name:'Application update'});await notice.waitFor()
  await notice.getByRole('button',{name:'View update',exact:true}).click();await page.getByRole('region',{name:'App updates',exact:true}).waitFor()
  await notice.getByRole('button',{name:'Dismiss update notification',exact:true}).click();await notice.waitFor({state:'hidden'})
  await page.getByRole('button',{name:'Home',exact:true}).click();assert.equal(await notice.count(),0)
  await notify({currentVersion:'1.3.1',status:'up-to-date'});assert.equal(await notice.count(),0)
  await page.evaluate(mix=>window.mediaCenter.personalChange({action:'mix-save',mix}),mix)
  await page.getByRole('button',{name:'Open mini player',exact:true}).click();mini=desktop.windows().find(w=>w!==page)||await desktop.waitForEvent('window')
  await mini.locator('.mini-drag').waitFor()
  for(const style of ['default','soft','precision','outline','bold','retro','editorial','neon','ribbon']){
   await page.evaluate(({original,style})=>window.mediaCenter.savePreferences({...original,theme:'black-glass',appearance:{density:'comfortable',colors:{},bodyFont:'segoe',headingFont:'georgia',lyricsFont:'segoe',surfaceStyle:'solid',...original.appearance,appStyle:style,translucency:false}}),{original,style})
   await mini.waitForFunction(s=>document.documentElement.dataset.appStyle===s,style)
   assert.ok(await mini.locator('.mini-drag').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('button,.mini-brand')].every(b=>b.getBoundingClientRect().bottom<=r.bottom-4)}),'Mini header divider stays below controls: '+style)
   await page.getByRole('button',{name:'Music',exact:true}).click();await require('./view-navigation.cjs')(page,'Albums','button')
   const card=page.locator('.music-card').filter({has:page.locator('.card-favorite')}).first();await card.waitFor()
   assert.ok(await card.evaluate(el=>{const a=el.querySelector('.art').getBoundingClientRect(),b=el.querySelector('.card-favorite').getBoundingClientRect();return b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom}),'Favorite stays inside artwork: '+style)
   await page.getByRole('button',{name:'Library tools',exact:true}).click();await require('./view-navigation.cjs')(page,'Custom mixes')
   assert.equal(await page.getByRole('button',{name:'More tools',exact:true}).count(),1)
   const c=page.locator('.custom-mix-card').filter({hasText:mix.name});await c.waitFor()
   assert.equal(await c.getByRole('button',{name:'Duplicate',exact:true}).count(),0)
   const more=c.getByRole('button',{name:'More options',exact:true});const r=await more.boundingBox();assert.ok(r.width>=132&&r.height>=44)
   await more.click();await c.getByRole('button',{name:`Delete mix ${mix.name}`,exact:true}).waitFor();await page.keyboard.press('Escape')
   if(['default','retro','neon'].includes(style)){await c.screenshot({animations:'disabled',path:resolve(artifacts,`refined-mix-${style}.png`)});await mini.screenshot({animations:'disabled',path:resolve(artifacts,`refined-mini-${style}.png`)})}
  }
  await page.evaluate(async({nav,screen})=>{const a=window.mediaCenter;await a.savePlayingScreenPreferences({...screen,background:'artwork',animation:'focus',fontSize:40});await a.play({queue:[{target:{kind:'music-track',serverId:nav.serverId,trackId:'song'},title:'A little room to listen',subtitle:'Fixture artist',cover:'fixture',duration:600}],index:0});await a.command({action:'toggle'});await a.lyricEdit({key:JSON.stringify([nav.serverId,'music-track','song']),text:Array.from({length:30},(_,i)=>`[${String(Math.floor(i*5/60)).padStart(2,'0')}:${String(i*5%60).padStart(2,'0')}]A little space for the music, line ${i+1}`).join('\n')})},{nav,screen})
  await page.getByRole('button',{name:'Open now playing',exact:true}).click();await page.getByRole('button',{name:'Lyrics',exact:true}).click();await page.locator('.lyric-line').first().waitFor()
  for(const width of [1024,1440,1920]){
   await page.setViewportSize({width,height:940})
   assert.ok(await page.locator('.expanded-art').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('.listen-actions>button,.listen-actions>.more-options>.more-options-trigger')].every(el=>{const b=el.getBoundingClientRect();return b.right<=r.right+1&&b.bottom<=r.bottom+1&&b.left>=r.left})}),'Every artwork control fits the left column')
   const box=page.locator('.standard-lyrics .lyrics-scroll');await box.evaluate(el=>el.scrollTop=200)
   assert.equal(await page.locator('.now-content').evaluate(el=>el.scrollHeight>el.clientHeight+1),false,'Only the lyrics scroll')
   assert.ok((await box.boundingBox()).height>=240,'Lyrics keep useful reading space')
   assert.equal(await page.locator('.lyric-line').first().evaluate(el=>getComputedStyle(el).filter),'none','Classic lyrics remain sharp')
   assert.equal(await page.locator('.workspace').evaluate(el=>el.scrollWidth>el.clientWidth),false)
   await page.screenshot({animations:'disabled',path:resolve(artifacts,`refined-classic-lyrics-${width}.png`)})
  }
  await require('./lyric-tool.cjs')(page,'Timing & follow');const timing=page.getByRole('dialog',{name:'Lyric timing',exact:true});await timing.getByLabel('Lyric timing offset',{exact:true}).fill('1.25');await timing.getByRole('button',{name:'Close dialog',exact:true}).click()
  await page.getByRole('button',{name:'Lyrics tools',exact:true}).click();await page.getByText('Timing +1.25s',{exact:true}).waitFor();await page.keyboard.press('Escape')
  await page.locator('.standard-lyrics .lyric-line').nth(1).click();await page.waitForFunction(async()=>Math.abs((await window.mediaCenter.playback()).position-6.25)<.2)
  await require('./typography-controls-smoke.cjs')({desktop,page,artifacts,mini})
  console.log('Listening refinements passed: update notice, all-style favorite/header containment, mix menus, larger controls, single-scroll lyrics, timing and native seek.')
 }finally{
  if(mini&&!mini.isClosed())await mini.getByRole('button',{name:'Close mini player',exact:true}).click()
  await page.evaluate(async({original,screen,id})=>{await window.mediaCenter.savePreferences(original);await window.mediaCenter.savePlayingScreenPreferences(screen);await window.mediaCenter.personalChange({action:'mix-delete',id})},{original,screen,id:mix.id})
  await page.setViewportSize({width:1440,height:940})
 }
}
