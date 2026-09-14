const assert=require('node:assert/strict');const {resolve}=require('node:path')
module.exports=async({desktop,page,artifacts})=>{
 const saved=await page.evaluate(()=>window.mediaCenter.preferences())
 const themes=['forest','charcoal','glass','midnight','ocean','rose','lavender','ember','coffee','nord','monochrome','aubergine','black-glass'],styles=['default','soft','precision','outline','bold','retro','editorial','neon','ribbon','frosted']
 const select=async(theme,appStyle)=>{await page.evaluate(p=>window.mediaCenter.savePreferences(p),{...saved,customCss:undefined,theme,appearance:{...saved.appearance,colors:{},appStyle}});await page.waitForFunction(({theme,appStyle})=>document.documentElement.dataset.theme===theme&&document.documentElement.dataset.appStyle===appStyle,{theme,appStyle})}
 try{
  await page.evaluate(async()=>{const a=window.mediaCenter,nav=(await a.libraries()).libraries.find(l=>l.kind==='music');await a.command({action:'volume',value:0});await a.play({queue:[{target:{kind:'music-track',serverId:nav.serverId,trackId:'transport-fixture'},title:'Player polish · Test fixture',subtitle:'Fixture artist',duration:600}],index:0})})
  await page.getByRole('button',{name:'Open now playing',exact:true}).click()
  let fingerprint
  for(const theme of themes)for(const style of styles){
   await select(theme,style)
   const current=await page.locator('.now-view-button').evaluateAll(els=>els.map(el=>{const c=getComputedStyle(el);return [el.textContent,c.color,c.backgroundColor,c.borderRadius,c.borderColor,c.font,c.padding,c.height,c.boxShadow]}))
   assert.equal(current.length,3)
   if(!fingerprint)fingerprint=current
   assert.deepEqual(current,fingerprint,theme+'/'+style+' keeps the same Now Playing controls')
  }
  await page.getByRole('button',{name:'Lyrics',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:'Lyrics',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 238, 238)')
  await page.screenshot({path:resolve(artifacts,'fixed-player-pills.png')})
  await page.getByRole('button',{name:'Immersive view',exact:true}).click()
  assert.equal(await page.getByText('A LITTLE CLOSER TO THE MUSIC',{exact:true}).count(),0)
  for(const width of [1008,1440]){await page.setViewportSize({width,height:940});assert(await page.locator('.immersive-header-actions').evaluate(el=>el.getBoundingClientRect().right<=innerWidth))}
  await page.getByRole('button',{name:'Classic view',exact:true}).click();await page.getByRole('button',{name:'Home',exact:true}).click()
  await page.locator('.home-album-card button.card-play').first().waitFor()
  for(const theme of themes)for(const style of styles){
   await select(theme,style)
   const colors=await page.locator('.home-album-card button.card-play').first().evaluate(el=>{const c=getComputedStyle(el),svg=getComputedStyle(el.querySelector('svg'));return [c.color,c.backgroundColor,svg.color]})
   assert.deepEqual(colors,['rgb(255, 255, 255)','rgb(23, 26, 29)','rgb(255, 255, 255)'],theme+'/'+style+' artwork overlay contrast')
   if(theme==='black-glass'&&style==='frosted'){await page.waitForFunction(()=>getComputedStyle(document.querySelector('.sidebar .nav-item.selected')).boxShadow==='none');await page.locator('.home-album-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:resolve(artifacts,'frosted-home-overlay-contrast.png')})}
  }
  await select('black-glass','frosted')
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.sidebar .nav-item.selected')).boxShadow==='none')
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('.settings-rail').getByRole('button',{name:'Appearance',exact:true}).click()
  assert.deepEqual(await page.locator('.css-import').evaluate(el=>{const s=getComputedStyle(el);return [s.borderTopWidth,s.borderBottomWidth]}),['0px','0px'])
  assert.equal(await page.locator('.appearance-editor').evaluate(el=>getComputedStyle(el).borderBottomWidth),'0px')
  await page.locator('.css-import').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(artifacts,'settings-single-divider.png')})
  console.log('Player polish passed: fixed neutral pills and readable artwork overlays across all 130 combinations, clean Frosted navigation, no immersive tagline, single Settings divider.')
 }finally{await page.evaluate(async saved=>{await window.mediaCenter.command({action:'stop'});await window.mediaCenter.savePreferences(saved)},saved);await page.setViewportSize({width:1440,height:940})}
}
