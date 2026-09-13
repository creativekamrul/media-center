const assert=require('node:assert/strict')
const {resolve}=require('node:path')
module.exports=async({desktop,page,artifacts})=>{
 const original=await page.evaluate(()=>window.mediaCenter.preferences())
 const defaults={appStyle:'default',density:'comfortable',translucency:false,surfaceStyle:'solid',colors:{},bodyFont:'segoe',headingFont:'georgia',lyricsFont:'segoe'}
 const base={...original,customCss:undefined,theme:'black-glass',appearance:{...defaults,...original.appearance,appStyle:'default',translucency:false}}
 let mini
 const select=async(id)=>{await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:`${id} style`,exact:true}).click()}
 const assertContrast=async(locator,label)=>{
  await locator.hover()
  const ratio=await locator.evaluate(el=>{
   const s=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d');ctx.canvas.width=ctx.canvas.height=1
   const lum=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const p=ctx.getImageData(0,0,1,1).data;return [p[0],p[1],p[2]].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0)}
   const a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)
  })
  assert.ok(ratio>=4.5,label+' contrast: '+ratio)
 }
 const styleOf=el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,border:s.borderWidth,shadow:s.boxShadow,background:s.backgroundColor}}
 try {
  await page.evaluate(p=>window.mediaCenter.savePreferences(p),base)
  await page.evaluate(async()=>{const api=window.mediaCenter,nav=(await api.libraries()).libraries.find(l=>l.kind==='music');await api.command({action:'volume',value:0});await api.play({queue:[{target:{kind:'music-track',serverId:nav.serverId,trackId:'app-style-fixture'},title:'Application styles · Test fixture',subtitle:'Fixture artist',duration:600}],index:0})})
  await page.waitForFunction(async()=>['playing','paused'].includes((await window.mediaCenter.playback()).status))
  await page.evaluate(()=>window.mediaCenter.command({action:'toggle'}))
  await page.getByRole('button',{name:'Home',exact:true}).click()
  // Removing the new attribute must have no visible effect on the original design.
  const selectors=['.nav-item.selected','.player-bar .main-play','.home-feature','.sidebar']
  const [before,without]=await page.evaluate(selectors=>{
   const snapshot=()=>selectors.map(s=>{const c=getComputedStyle(document.querySelector(s));return [c.borderRadius,c.borderWidth,c.boxShadow,c.background,c.padding]})
   // Compare within one animation frame: pointer/selection fades must not advance
   // between baseline and the exact same design without the style attribute.
   const before=snapshot();delete document.documentElement.dataset.appStyle;const without=snapshot();document.documentElement.dataset.appStyle='default';return [before,without]
  },selectors)
  assert.deepEqual(before,without,'Original is the existing design without overrides')
  await page.getByRole('button',{name:'Open mini player',exact:true}).click()
  mini=desktop.windows().find(w=>w!==page)||await desktop.waitForEvent('window')
  await mini.locator('.mini-controls .main-play').waitFor()
  // Unsaved style previews reach both windows, and leaving Settings reverts both.
  await select('Bold');await mini.waitForFunction(()=>document.documentElement.dataset.appStyle==='bold')
  assert.equal((await page.evaluate(()=>window.mediaCenter.preferences())).appearance.appStyle,'default')
  await page.getByRole('button',{name:'Home',exact:true}).click();await mini.waitForFunction(()=>document.documentElement.dataset.appStyle==='default')
  const fingerprints=[]
  for(const [id,name] of [['default','Original'],['soft','Soft'],['precision','Precision'],['outline','Outline'],['bold','Bold'],['retro','Retro'],['editorial','Editorial'],['neon','Neon'],['ribbon','Ribbon'],['frosted','Frosted']]){
   await select(name)
   assert.equal(await page.locator('.app-style-choice').count(),10)
   await page.locator('.app-style-picker').scrollIntoViewIfNeeded()
   if(['soft','editorial','neon','ribbon','frosted'].includes(id))await page.screenshot({animations:'disabled',path:resolve(artifacts,`application-style-picker-${id}.png`)})
   assert.ok(await page.locator('.app-style-choice').evaluateAll(cards=>cards.every(c=>c.getBoundingClientRect().height<190)),'Style choices are compact')
   if(id!=='default')await assertContrast(page.locator('.settings-rail button[aria-current=location]'),id+' settings selection')
   await page.getByRole('button',{name:'Save theme',exact:true}).click()
   await page.waitForFunction(id=>document.documentElement.dataset.appStyle===id,id)
   await mini.waitForFunction(id=>document.documentElement.dataset.appStyle===id,id)
   const saved=await page.evaluate(()=>window.mediaCenter.preferences())
   assert.equal(saved.appearance.appStyle,id);assert.equal(saved.theme,base.theme);assert.deepEqual(saved.appearance.colors,base.appearance.colors)
   await page.getByRole('button',{name:'Home',exact:true}).click()
   if(['precision','outline'].includes(id))assert.notEqual((await page.locator('.sidebar .nav-item.selected').evaluate(styleOf)).shadow,'none','Selected navigation uses its style marker')
   fingerprints.push(JSON.stringify(await page.locator('.player-bar .main-play').evaluate(styleOf)))
   assert.equal((await mini.locator('.mini-controls .main-play').evaluate(styleOf)).radius,(await page.locator('.player-bar .main-play').evaluate(styleOf)).radius)
   await mini.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(async()=>(await window.mediaCenter.playback()).status==='playing')
   await mini.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForFunction(async()=>(await window.mediaCenter.playback()).status==='paused')
   await page.screenshot({animations:'disabled',path:resolve(artifacts,`app-style-${id}-home.png`)})
   await mini.screenshot({animations:'disabled',path:resolve(artifacts,`app-style-${id}-mini.png`)})
   await page.getByRole('button',{name:'Open now playing',exact:true}).click()
   assert.equal(await page.locator('.expanded-art > .listen-actions > button').count(),2,'Only Play and Play next stay in the main action row')
   const more=page.locator('.expanded-art .more-options-trigger').first()
   if(id==='frosted'){
    const glass=await more.evaluate(el=>{const s=getComputedStyle(el),c=document.createElement('canvas').getContext('2d');c.fillStyle=s.backgroundColor;c.fillRect(0,0,1,1);return {alpha:c.getImageData(0,0,1,1).data[3],blur:s.backdropFilter,radius:s.borderRadius}})
    assert.ok(glass.alpha>0&&glass.alpha<100,'Frosted neutral controls are translucent');assert.ok(glass.blur.includes('blur(12px)'));assert.equal(glass.radius,'999px')
   }
   await more.click()
   if(id!=='default')await assertContrast(more,id+' open menu trigger')
   assert.equal(await page.locator('.more-options-panel:popover-open').getByRole('button',{name:'Add to queue',exact:true}).count(),1,'Queue is available once in More')
   const menu=page.locator('.more-options-panel:popover-open');await menu.waitFor()
   assert.equal(await menu.evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}),true)
   assert.ok(!['transparent','rgba(0, 0, 0, 0)'].includes((await menu.evaluate(styleOf)).background))
   await page.keyboard.press('Escape');assert.equal(await menu.count(),0)
   await page.getByRole('button',{name:'Immersive view',exact:true}).click()
   const view=page.getByRole('region',{name:'Immersive playing screen',exact:true})
   await view.getByRole('button',{name:'Appearance',exact:true}).click()
   const dialog=page.getByRole('dialog',{name:'Lyrics appearance',exact:true});await dialog.waitFor()
   if(id!=='default'){
    assert.equal((await dialog.evaluate(styleOf)).radius,await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--style-panel-radius').trim().replace('6px 28px 6px 28px','6px 28px')))
    assert.equal((await dialog.getByLabel('Immersive layout',{exact:true}).evaluate(styleOf)).radius,id==='frosted'?'14px':await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--style-control-radius').trim()))
   }
   await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
   await view.getByRole('button',{name:'Classic view',exact:true}).click()
   for(const width of [1024,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.locator('.workspace').evaluate(el=>el.scrollWidth>el.clientWidth),false)}
   await page.getByRole('button',{name:'Home',exact:true}).click()
  }
  assert.equal(new Set(fingerprints).size,10,'All styles have distinct control construction')
  await page.getByRole('button',{name:'Music',exact:true}).click()
  const tabs=page.locator('.concise-tabs')
  await page.evaluate(()=>window.mediaCenter.saveNavigation({action:'view-pins',viewPins:{music:['albums','songs','artists','playlists']}}))
  await page.waitForFunction(()=>document.querySelectorAll('.pinned-tab-list > button').length===4)
  await require('./view-navigation.cjs')(page,'Recently played','button')
  assert.equal(await tabs.getByRole('button',{name:'Recently played',exact:true}).getAttribute('aria-pressed'),'true')
  assert.equal(await page.getByRole('dialog',{name:'Customize views',exact:true}).count(),0,'Saving pins closes the customization dialog')
  assert.equal(await tabs.getByRole('button',{name:'Recently played',exact:true}).evaluate(el=>el===document.activeElement),true,'Focus follows the selected view out of the menu')
  assert.equal(await tabs.locator('.pinned-tab-list > button').count(),5,'Pinning another view preserves the original four')
  await require('./view-navigation.cjs')(page,'Playlists','button')
  await page.getByRole('button',{name:'Home',exact:true}).click()
  // A saved style survives reload and works with a custom light palette without forcing transparency.
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appStyle==='frosted')
  for(const appStyle of ['soft','precision','outline','bold','retro','editorial','neon','ribbon','frosted']){
   await page.evaluate(({base,appStyle})=>window.mediaCenter.savePreferences({...base,appearance:{...base.appearance,appStyle,colors:{background:'#fafafa',panel:'#eeeeee',text:'#181818',muted:'#555555',accent:'#2044aa'}}}),{base,appStyle})
   await page.waitForFunction(id=>document.documentElement.dataset.appStyle===id,appStyle)
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.translucency),'false')
   if(appStyle==='frosted')assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).color),'rgb(24, 24, 24)','Frosted inherits the custom foreground for headings and card labels')
   if(await page.locator('.card-favorite').count())assert.equal(await page.locator('.card-favorite').first().evaluate(el=>getComputedStyle(el).color===getComputedStyle(el).backgroundColor),false)
   await assertContrast(page.locator('.sidebar .nav-item.selected'),appStyle+' light selected navigation')
   await page.screenshot({animations:'disabled',path:resolve(artifacts,`app-style-${appStyle}-light.png`)})
  }
  console.log('Application styles passed: Original unchanged, nine distinct alternatives, preview/cancel/save/reload, themes, mini synchronization, popovers, dialogs and responsive layouts.')
 }finally{
  if(mini&&!mini.isClosed())await mini.getByRole('button',{name:'Close mini player',exact:true}).click()
  await page.evaluate(p=>window.mediaCenter.savePreferences(p),original)
  await page.setViewportSize({width:1440,height:940})
 }
}
