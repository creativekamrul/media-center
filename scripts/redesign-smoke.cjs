const assert=require('node:assert/strict')
const {resolve}=require('node:path')
module.exports=async({page,artifacts})=>{
 const saved=await page.evaluate(()=>window.mediaCenter.preferences())
 const apply=async(theme,appStyle)=>{await page.evaluate(async({theme,appStyle})=>{const a=window.mediaCenter,p=await a.preferences();await a.savePreferences({...p,theme,appearance:{...p.appearance,appStyle,headingFont:'segoe'}})},{theme,appStyle});await page.reload();await page.locator('.sidebar').waitFor()}
 try{
  const timeline=page.locator('.player-bar').getByRole('slider',{name:'Playback position',exact:true});await timeline.waitFor();const timelineBounds=await timeline.boundingBox()
  await page.mouse.click(timelineBounds.x+7+(timelineBounds.width-14)*.25,timelineBounds.y+timelineBounds.height/2)
  await page.waitForFunction(async()=>{const p=await window.mediaCenter.playback();return Math.abs(p.position-p.duration*.25)<2})
  await timeline.press('Home');await page.waitForFunction(async()=>(await window.mediaCenter.playback()).position<1)
  for(const [theme,style] of [['black-glass','default'],['forest','frosted'],['liquid-glass','frosted']]){
   await apply(theme,style)
   for(const section of ['Home','Music','Audiobooks','Podcasts','Local music','Jellyfin','Library tools','Play queue','Listen later','Listening history','Settings']){
    await page.locator('.sidebar').getByRole('button',{name:section,exact:true}).click()
    await page.locator('.workspace').evaluate(el=>el.scrollTop=0)
    await page.screenshot({animations:'disabled',path:resolve(artifacts,`redesign-${theme}-${section.toLowerCase().replaceAll(' ','-')}.png`)})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme}/${section} horizontal overflow`)
    const workspace=await page.locator('.workspace').boundingBox(),footer=await page.locator('.player-bar').boundingBox(),seek=await page.locator('.player-bar .seek-track').boundingBox();assert.ok(workspace.y+workspace.height<=footer.y+1,'The player has reserved space below the page');assert.ok(seek.y>=footer.y&&seek.y+seek.height<=footer.y+footer.height,'Seek target fits inside the footer')
    if(section==='Music'){await page.locator('.workspace').evaluate(el=>el.scrollTop=el.scrollHeight);const last=await page.locator('.media-grid .music-card').last().boundingBox();assert.ok(last&&last.y+last.height<=footer.y-24,'The final album scrolls clear of the footer fade');if(theme==='black-glass')await page.screenshot({path:resolve(artifacts,'player-cleanup-library-bottom.png')})}
   }
  }
  await page.setViewportSize({width:1024,height:720})
  for(const section of ['Home','Music','Settings']){
   await page.locator('.sidebar').getByRole('button',{name:section,exact:true}).click()
   await page.screenshot({animations:'disabled',path:resolve(artifacts,`redesign-narrow-${section.toLowerCase()}.png`)})
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${section} narrow overflow`)
  }
  await page.evaluate(async()=>{const a=window.mediaCenter,p=await a.preferences();await a.savePreferences({...p,appearance:{...p.appearance,appStyle:'frosted',colors:{background:'#fafafa',panel:'#eeeeee',text:'#181818',muted:'#555555',accent:'#2444ad'}}})})
  await page.locator('.sidebar').getByRole('button',{name:'Music',exact:true}).click()
  const favorite=page.locator('.card-favorite').first();await favorite.waitFor()
  const contrastOf=el=>{const c=document.createElement('canvas').getContext('2d'),s=getComputedStyle(el);const lum=color=>{c.clearRect(0,0,1,1);c.fillStyle=color;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)};const a=lum(s.color),b=lum(s.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
  assert.ok(await favorite.evaluate(contrastOf)>=4.5,'Unhovered artwork actions remain readable with custom light colors')
  for(const selector of ['.library-heading select','.library-toolbar select','.player-bar select']){const control=page.locator(selector).first();if(await control.count())assert.ok(await control.evaluate(contrastOf)>=4.5,selector+' remains readable with custom light colors')}
  await page.screenshot({animations:'disabled',path:resolve(artifacts,'redesign-light-artwork-actions.png')})
  console.log('Redesign passed: all sidebar destinations, dark/frosted/liquid materials, narrow-window navigation and light-palette artwork action contrast.')
 }finally{await page.evaluate(p=>window.mediaCenter.savePreferences(p),saved);await page.setViewportSize({width:1440,height:940})}
}
