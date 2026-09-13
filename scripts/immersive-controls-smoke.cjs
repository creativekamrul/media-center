const assert=require('node:assert/strict');const {resolve}=require('node:path')
module.exports=async({desktop,page,artifacts})=>{
 const saved=await page.evaluate(()=>window.mediaCenter.playingScreenPreferences())
 const libraries=(await page.evaluate(()=>window.mediaCenter.libraries())).libraries
 const music=libraries.find(l=>l.kind==='music'),abs=libraries.find(l=>l.serverId!==music.serverId&&l.serverId!=='local')
 const wait=async predicate=>{for(let i=0;i<150;i++){if(predicate(await page.evaluate(()=>window.mediaCenter.playback())))return;await new Promise(r=>setTimeout(r,100))}throw Error('Playback condition timed out: '+predicate)}
 const volume=async n=>{await page.evaluate(n=>window.mediaCenter.command({action:'volume',value:n}),n);await page.waitForFunction(async n=>(await window.mediaCenter.playback()).volume===n,n)}
 try{
  await page.evaluate(async serverId=>{const a=window.mediaCenter;await a.command({action:'volume',value:0});await a.command({action:'repeat',value:'off'});if((await a.playback()).shuffle)await a.command({action:'shuffle'});await a.play({queue:[{target:{kind:'music-track',serverId,trackId:'transport-fixture'},title:'Immersive controls · Test fixture',subtitle:'Fixture artist',duration:600}],index:0})},music.serverId)
  await wait(p=>p.status==='playing');await page.evaluate(()=>window.mediaCenter.command({action:'toggle'}));await wait(p=>p.status==='paused')
  await page.getByRole('button',{name:'Home',exact:true}).click()
  const footer=page.locator('.player-bar'),barVolume=footer.locator('.volume-control')
  await volume(50);await barVolume.locator('svg').hover();await page.mouse.wheel(0,-100);await wait(p=>p.volume===55)
  await page.mouse.wheel(0,100);await wait(p=>p.volume===50)
  await volume(98);await barVolume.locator('output').hover();await page.mouse.wheel(0,-100);await wait(p=>p.volume===100)
  await volume(2);await page.mouse.wheel(0,100);await wait(p=>p.volume===0)
  await volume(50);for(let i=0;i<4;i++)await page.mouse.wheel(0,25);await wait(p=>p.volume===45)
  await volume(20);for(let i=0;i<5;i++)await page.mouse.wheel(0,-100);await wait(p=>p.volume===45)
  assert.equal(await barVolume.evaluate(el=>!el.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,ctrlKey:true,bubbles:true,cancelable:true}))),false,'Ctrl+wheel remains available for zoom')
  await page.getByRole('button',{name:'Open now playing',exact:true}).click();await page.getByRole('button',{name:'Immersive view',exact:true}).click()
  const view=page.getByRole('region',{name:'Immersive playing screen',exact:true})
  assert.equal(await footer.isVisible(),false);assert.equal(await page.getByRole('slider',{name:'Volume',exact:true}).count(),1)
  assert.ok(await view.evaluate(el=>Math.abs(el.getBoundingClientRect().bottom-innerHeight)<1),'Immersive view fills the former footer area')
  await view.getByRole('button',{name:'Toggle fullscreen',exact:true}).click();await page.locator('.window-titlebar').waitFor({state:'hidden'})
  await view.getByRole('button',{name:'Classic view',exact:true}).click();await page.locator('.window-titlebar').waitFor({state:'visible'})
  assert.equal(await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()),false)
  await page.getByRole('button',{name:'Immersive view',exact:true}).click()
  await view.getByRole('button',{name:'Toggle fullscreen',exact:true}).click();await page.locator('.window-titlebar').waitFor({state:'hidden'})
  await view.locator('.screen-track .artist-link').click();await view.waitFor({state:'hidden'});await page.locator('.window-titlebar').waitFor({state:'visible'})
  assert.equal(await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()),false)
  await page.getByRole('button',{name:'Open now playing',exact:true}).click();await page.getByRole('button',{name:'Immersive view',exact:true}).click()
  const wheel=view.locator('.volume-control');await wheel.hover();const scroll=await view.locator('.screen-track').evaluate(el=>el.scrollTop)
  await page.mouse.wheel(0,-100);await wait(p=>p.volume===50);assert.equal(await view.locator('.screen-track').evaluate(el=>el.scrollTop),scroll)
  await view.getByRole('slider',{name:'Volume',exact:true}).focus();await page.keyboard.press('ArrowLeft');await wait(p=>p.volume===49)
  await volume(0)
  const seek=view.getByRole('slider',{name:'Playback position',exact:true});const b=await seek.boundingBox();await page.mouse.click(b.x+7+(b.width-14)*.25,b.y+b.height/2);await wait(p=>p.status==='paused'&&Math.abs(p.position-150)<2)
  await view.getByRole('button',{name:'Shuffle',exact:true}).click();await wait(p=>p.shuffle===true);await view.getByRole('button',{name:'Shuffle',exact:true}).click();await wait(p=>!p.shuffle)
  for(const [from,to] of [['off','all'],['all','one'],['one','off']]){await view.getByRole('button',{name:'Repeat: '+from,exact:true}).click();await page.waitForFunction(async repeat=>(await window.mediaCenter.playback()).repeat===repeat,to)}
  await view.getByRole('combobox',{name:'Sleep timer',exact:true}).selectOption('15');await wait(p=>!!p.sleepAt);await view.getByRole('combobox',{name:'Sleep timer',exact:true}).selectOption('0');await wait(p=>!p.sleepAt)
  await view.getByRole('button',{name:'Open mini player',exact:true}).click();const mini=desktop.windows().find(w=>w!==page)||await desktop.waitForEvent('window');await mini.getByRole('button',{name:'Close mini player',exact:true}).click();assert.equal(await footer.isVisible(),false)
  for(const layout of ['studio','minimal','gallery']){
   await view.getByRole('button',{name:'Appearance',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Lyrics appearance',exact:true});await dialog.getByLabel('Immersive layout',{exact:true}).selectOption(layout);await dialog.getByRole('button',{name:'Save appearance',exact:true}).click()
   for(const [width,height] of [[1440,940],[1024,720]]){
    await page.setViewportSize({width,height});await view.getByRole('slider',{name:'Volume',exact:true}).scrollIntoViewIfNeeded();const r=await wheel.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width&&r.y+r.height<=height);assert.equal(await view.evaluate(el=>el.scrollWidth>el.clientWidth),false)
    await page.screenshot({path:resolve(artifacts,`immersive-controls-${layout}-${width}.png`)})
   }
  }
  for(const target of [{kind:'audiobook',serverId:abs.serverId,bookId:'book-one'},{kind:'podcast-episode',serverId:abs.serverId,showId:'show-one',episodeId:'episode-one'}]){
   await page.evaluate(target=>window.mediaCenter.play({queue:[{target,title:'Spoken controls · Test fixture',subtitle:'Fixture narrator'}],index:0}),target);await page.waitForFunction(async kind=>{const p=await window.mediaCenter.playback();return p.kind===kind&&p.status==='playing'},target.kind)
   await page.evaluate(()=>window.mediaCenter.command({action:'toggle'}));await wait(p=>p.status==='paused')
   await view.getByRole('combobox',{name:'Playback speed',exact:true}).selectOption('1.25');await wait(p=>p.speed===1.25)
   await view.getByRole('slider',{name:'Playback position',exact:true}).press('Home');await wait(p=>p.position<1)
   await view.getByRole('button',{name:'Forward 30 seconds',exact:true}).click();await wait(p=>Math.abs(p.position-30)<2)
   await view.getByRole('button',{name:'Back 15 seconds',exact:true}).click();await wait(p=>Math.abs(p.position-15)<2)
   await view.getByRole('combobox',{name:'Playback speed',exact:true}).selectOption('1')
  }
  await view.getByRole('button',{name:'Classic view',exact:true}).click();assert.equal(await footer.isVisible(),true);assert.equal(await footer.evaluate(el=>el.inert),false)
  console.log('Immersive controls passed: automatic fullscreen exit through Classic view and artist navigation, footer hidden/restored, full-height layouts, seek/shuffle/repeat/sleep/mini, wheel bounds and trackpad accumulation, and audiobook/podcast skip/speed.')
 }finally{await page.evaluate(saved=>window.mediaCenter.savePlayingScreenPreferences(saved),saved);await volume(0);await page.setViewportSize({width:1440,height:940})}
}
