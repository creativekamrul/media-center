const assert=require('node:assert/strict')
const {resolve}=require('node:path')
module.exports=async({page,artifacts})=>{
 const saved=await page.evaluate(()=>window.mediaCenter.experience()),appearance=await page.evaluate(()=>window.mediaCenter.preferences())
 const defaults={music:['albums','songs','artists','playlists'],local:['songs','albums','artists','playlists'],tools:['mixes','shelves','offline','people']}
 const names=async()=>page.locator('.pinned-tab-list>button').allTextContents()
 const open=async()=>{await page.locator('.view-customize').click();return page.getByRole('dialog',{name:/^Customize (views|tools)$/})}
 const save=async dialog=>{await dialog.getByRole('button',{name:'Save tabs',exact:true}).click();await dialog.waitFor({state:'hidden'})}
 try{
  for(const [scope,pins] of Object.entries(defaults))await page.evaluate(({scope,pins})=>window.mediaCenter.saveNavigation({action:'view-pins',viewPins:{[scope]:pins}}),{scope,pins})
  await page.getByRole('button',{name:'Music',exact:true}).click();await page.getByRole('button',{name:'Albums',exact:true}).click()
  assert.deepEqual(await names(),['Albums','Songs','Artists','Playlists'])
  let dialog=await open()
  assert.equal(await dialog.getByRole('checkbox',{checked:true}).count(),4)
  await dialog.getByRole('checkbox',{name:'Pin Favorites',exact:true}).check()
  await dialog.getByRole('button',{name:'Move Favorites up',exact:true}).click()
  await dialog.getByRole('button',{name:'Move Favorites up',exact:true}).click()
  await dialog.getByRole('button',{name:'Move Favorites up',exact:true}).click()
  await dialog.getByRole('button',{name:'Move Favorites up',exact:true}).click()
  await save(dialog)
  assert.deepEqual(await names(),['Favorites','Albums','Songs','Artists','Playlists'])
  await page.reload();await page.getByRole('button',{name:'Music',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.pinned-tab-list>.active')?.textContent==='Favorites')
  dialog=await open();await dialog.getByRole('checkbox',{name:'Pin Albums',exact:true}).uncheck();await save(dialog)
  await page.waitForFunction(()=>document.querySelector('.pinned-tab-list>.active')?.textContent==='Favorites')
  assert.deepEqual(await names(),['Favorites','Songs','Artists','Playlists'])
  await page.reload();await page.getByRole('button',{name:'Music',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pinned-tab-list>.active')?.textContent==='Favorites');assert.deepEqual(await names(),['Favorites','Songs','Artists','Playlists'])
  dialog=await open();await dialog.getByRole('checkbox',{name:'Pin Radio',exact:true}).check();await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
  assert.equal((await names()).includes('Radio'),false)
  dialog=await open()
  for(const name of ['Songs','Artists','Playlists'])await dialog.getByRole('checkbox',{name:`Pin ${name}`,exact:true}).uncheck()
  assert.equal(await dialog.getByRole('checkbox',{name:'Pin Favorites',exact:true}).isDisabled(),true)
  await dialog.getByRole('button',{name:'Reset defaults',exact:true}).click();await save(dialog)
  // The current Favorites view becomes Albums after resetting the four defaults.
  await page.waitForFunction(()=>document.querySelector('.pinned-tab-list>.active')?.textContent==='Albums')
  assert.deepEqual(await names(),['Albums','Songs','Artists','Playlists'])
  await page.getByRole('button',{name:'Songs',exact:true}).focus();await page.keyboard.press('ArrowRight')
  assert.equal(await page.getByRole('button',{name:'Artists',exact:true}).getAttribute('aria-pressed'),'true')
  for(const [section,scope,extra] of [['Local music','local','Folders'],['Library tools','tools','Library health']]){
   await page.getByRole('button',{name:section,exact:true}).click();dialog=await open()
   assert.equal(await dialog.getByRole('checkbox',{checked:true}).count(),4)
   await dialog.getByRole('checkbox',{name:`Pin ${extra}`,exact:true}).check();await save(dialog)
   await page.getByRole('tab',{name:extra,exact:true}).click()
   const pins=(await page.evaluate(()=>window.mediaCenter.experience())).navigation.viewPins
   assert.equal(pins[scope].length,5);assert.deepEqual(pins.music,defaults.music)
  }
  // A stale Settings draft must not overwrite pins saved through the separate navigation action.
  await page.evaluate(saved=>window.mediaCenter.saveExperience(saved),saved)
  assert.equal((await page.evaluate(()=>window.mediaCenter.experience())).navigation.viewPins.tools.length,5)
  await page.getByRole('button',{name:'Music',exact:true}).click();dialog=await open()
  for(const check of await dialog.getByRole('checkbox').all())await check.check()
  await save(dialog)
  await page.emulateMedia({reducedMotion:'reduce'})
  for(const style of ['default','soft','precision','outline','bold','retro','editorial','neon','ribbon','frosted']){
   await page.evaluate(({appearance,style})=>window.mediaCenter.savePreferences({...appearance,theme:'black-glass',appearance:{...appearance.appearance,appStyle:style}}),{appearance,style})
   await page.waitForFunction(s=>document.documentElement.dataset.appStyle===s,style)
   await page.setViewportSize({width:1024,height:800})
   const geometry=await page.locator('.concise-tabs').evaluate(el=>{const c=el.querySelector('.view-customize').getBoundingClientRect(),r=el.getBoundingClientRect(),l=el.querySelector('.pinned-tab-list');return {right:c.right,parent:r.right,left:c.left,listRight:l.getBoundingClientRect().right,scrolls:l.scrollWidth>l.clientWidth,height:c.height}})
   assert(geometry.right<=geometry.parent+1&&geometry.right>=geometry.parent-10);assert(geometry.left>=geometry.listRight);assert(geometry.scrolls);assert(geometry.height>=36)
   assert.equal(await page.locator('.pinned-tab-list').evaluate(el=>getComputedStyle(el).scrollbarWidth),'none')
   const previous=page.getByRole('button',{name:'Previous pinned views',exact:true}),next=page.getByRole('button',{name:'Next pinned views',exact:true})
   assert.equal(await previous.isDisabled(),true);await next.click();await page.waitForFunction(()=>document.querySelector('.pinned-tab-list').scrollLeft>0)
   await previous.click();await page.waitForFunction(()=>document.querySelector('.pinned-tab-list').scrollLeft<=2)
   if(['default','frosted','outline'].includes(style))await page.screenshot({path:resolve(artifacts,`pinned-views-${style}-1024.png`)})
   dialog=await open();assert.equal(await dialog.getByRole('checkbox',{checked:true}).count(),11)
   if(style==='default')await page.screenshot({path:resolve(artifacts,'pinned-views-editor.png')})
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
   assert.equal(await page.locator('.view-customize').evaluate(el=>el===document.activeElement),true)
  }
  console.log('Pinned views passed: default four, pin/unpin/reorder/reset/cancel, active fallback, keyboard, reload persistence, all three independent sections, stale Settings saves, and a fixed right-side control with homepage arrows and no scrollbar in ten styles.')
 }finally{
  await page.emulateMedia({reducedMotion:'no-preference'})
  for(const [scope,pins] of Object.entries(defaults))await page.evaluate(({scope,pins})=>window.mediaCenter.saveNavigation({action:'view-pins',viewPins:{[scope]:pins}}),{scope,pins:saved.navigation.viewPins[scope]??pins})
  await page.evaluate(appearance=>window.mediaCenter.savePreferences(appearance),appearance);await page.setViewportSize({width:1440,height:940})
 }
}
