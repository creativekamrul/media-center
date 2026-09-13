const assert=require('node:assert/strict');const {resolve}=require('node:path')
module.exports=async({desktop,page,artifacts})=>{
 const previous=await page.evaluate(()=>window.mediaCenter.playingScreenPreferences())
 const nav=(await page.evaluate(()=>window.mediaCenter.libraries())).libraries.find(l=>l.kind==='music')
 const item={target:{kind:'music-track',serverId:nav.serverId,trackId:'style-fixture'},title:'Color study · Test fixture',subtitle:'Fixture artist',duration:600,cover:'style-cover'}
 await desktop.evaluate(({nativeImage})=>{
  const bitmap=Buffer.alloc(96*96*4);for(let y=0;y<96;y++)for(let x=0;x<96;x++){const i=(y*96+x)*4;bitmap[i]=150+x;bitmap[i+1]=160-y;bitmap[i+2]=40+y;bitmap[i+3]=255}
  const png=nativeImage.createFromBitmap(bitmap,{width:96,height:96}).toPNG();global.__styleFetch=global.fetch
  global.fetch=async(input,init)=>{const u=new URL(String(input));if(u.pathname.includes('getCoverArt'))return new Response(png,{headers:{'content-type':'image/png'}});if(u.hostname==='lrclib.net')return new Response(JSON.stringify({duration:600,instrumental:false,plainLyrics:'A fixture for the listening view',syncedLyrics:'[00:00]A little closer to the music\n[00:10]Color all around you\n[00:20]One song at a time\n[00:30]A moment of your own\n[00:40]Let the evening unfold'}));return global.__styleFetch(input,init)}
 })
 try{
  await page.evaluate(async({previous,item})=>{const api=window.mediaCenter;await api.savePlayingScreenPreferences({...previous,background:'artwork',backdropDim:.15,layout:'studio',showMusicLyrics:true});await api.command({action:'volume',value:0});await api.play({queue:[item,{...item,title:'Next fixture'}],index:0})},{previous,item})
  await page.getByRole('button',{name:'Open now playing',exact:true}).click()
  // Earlier suites can cache a missing LRCLIB result for the fixture server's
  // shared metadata. Refresh it after native playback has loaded this fixture.
  await page.waitForFunction(async()=>['playing','paused'].includes((await window.mediaCenter.playback()).status))
  await page.evaluate(()=>window.mediaCenter.lyrics({refresh:true}))
  await page.locator('.expanded-player>.immersive-atmosphere img').waitFor()
  for(const tab of ['Queue','Lyrics']){
   await page.locator('.now-tabs').getByRole('button',{name:tab,exact:true}).click()
   const metrics=await page.locator('.expanded-player').evaluate(el=>{const root=el.getBoundingClientRect(),back=el.querySelector('.immersive-atmosphere').getBoundingClientRect();return {width:root.width,back:back.width,nested:el.querySelectorAll('.standard-lyrics-backdrop').length}})
   assert.ok(Math.abs(metrics.width-metrics.back)<2);assert.equal(metrics.nested,0,'No separate dark rectangle behind the lyrics');if(tab==='Lyrics'){await page.locator('.lyrics-scroll').waitFor();assert.deepEqual(await page.locator('.lyrics-scroll').evaluate(el=>{const s=getComputedStyle(el);return [s.boxShadow,s.backgroundColor,s.backgroundImage]}),['none','rgba(0, 0, 0, 0)','none'])}
   await page.screenshot({path:resolve(artifacts,`artwork-background-${tab.toLowerCase()}.png`)})
  }
  // Blur previews on the artwork only, cancels cleanly, and follows both player views.
  await page.getByRole('button',{name:'Lyrics appearance',exact:true}).click()
  const blurOptions=page.getByRole('dialog',{name:'Lyrics appearance',exact:true})
  await blurOptions.getByLabel('Artwork blur',{exact:true}).press('Home')
  assert.match(await page.locator('.expanded-player>.immersive-atmosphere>.art').evaluate(el=>getComputedStyle(el).filter),/blur\(0px\)/)
  assert.equal(await page.locator('.expanded-art>.art').evaluate(el=>getComputedStyle(el).filter),'none','Foreground artwork stays sharp')
  await blurOptions.getByRole('button',{name:'Save appearance',exact:true}).click()
  assert.equal((await page.evaluate(()=>window.mediaCenter.playingScreenPreferences())).artworkBlur,0)
  await page.getByRole('button',{name:'Lyrics appearance',exact:true}).click()
  await blurOptions.getByLabel('Artwork blur',{exact:true}).press('End')
  assert.match(await page.locator('.expanded-player>.immersive-atmosphere>.art').evaluate(el=>getComputedStyle(el).filter),/blur\(100px\)/)
  await page.keyboard.press('Escape')
  assert.match(await page.locator('.expanded-player>.immersive-atmosphere>.art').evaluate(el=>getComputedStyle(el).filter),/blur\(0px\)/)
  await page.getByRole('button',{name:'Immersive view',exact:true}).click()
  const view=page.getByRole('region',{name:'Immersive playing screen',exact:true})
  assert.match(await view.locator('.immersive-atmosphere>.art').evaluate(el=>getComputedStyle(el).filter),/blur\(0px\)/)
  for(const layout of ['minimal','gallery','studio']){
   await view.getByRole('button',{name:'Appearance',exact:true}).click();const options=page.getByRole('dialog',{name:'Lyrics appearance',exact:true});await options.getByLabel('Immersive layout',{exact:true}).selectOption(layout);await options.getByRole('button',{name:'Save appearance',exact:true}).click()
   assert.equal((await page.evaluate(()=>window.mediaCenter.playingScreenPreferences())).layout,layout)
   for(const [width,height] of [[1440,940],[1024,720]]){
    await page.setViewportSize({width,height});assert.equal(await view.evaluate(el=>el.scrollWidth>el.clientWidth),false)
    const art=await view.locator('.screen-cover').boundingBox(),stage=await view.locator('.immersive-stage').boundingBox();assert.ok(Math.abs(art.width-art.height)<2);assert.ok(stage.width>300)
    if(layout!=='studio'){assert.ok(art.x+art.width<=stage.x+2);assert.equal(await view.getByRole('region',{name:'Current queue',exact:true}).count(),0)}
    await page.screenshot({path:resolve(artifacts,`immersive-${layout}-${width}.png`)})
   }
   if(layout!=='studio'){
    await view.getByRole('button',{name:'Show queue',exact:true}).click();const queue=view.getByRole('region',{name:'Current queue',exact:true});await queue.waitFor();await queue.getByRole('button',{name:'Play queue item 2: Next fixture',exact:true}).click();assert.equal((await page.evaluate(()=>window.mediaCenter.playback())).queueIndex,1);await view.getByRole('button',{name:'Hide queue',exact:true}).click()
   }
  }
  await view.getByRole('button',{name:'Appearance',exact:true}).click();const options=page.getByRole('dialog',{name:'Lyrics appearance',exact:true});await options.getByLabel('Immersive layout',{exact:true}).selectOption('minimal');await options.getByRole('button',{name:'Cancel',exact:true}).click();assert.ok((await view.getAttribute('class')).includes('layout-studio'))
  await view.getByRole('button',{name:'Classic view',exact:true}).click()
  console.log('Immersive styles passed: full-canvas artwork on Queue/Lyrics, three responsive layouts, queue playback, saved choice, artwork blur preview/save/cancel and preview cancellation.')
 }finally{await desktop.evaluate(()=>{global.fetch=global.__styleFetch;delete global.__styleFetch});await page.evaluate(previous=>window.mediaCenter.savePlayingScreenPreferences(previous),previous);await page.setViewportSize({width:1440,height:940})}
}
