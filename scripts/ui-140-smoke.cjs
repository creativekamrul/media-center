const assert=require('node:assert/strict');const {resolve}=require('node:path');const {readFileSync,existsSync}=require('node:fs')
module.exports=async({desktop,page,artifacts})=>{
 const saved=await page.evaluate(()=>window.mediaCenter.preferences()),playing=await page.evaluate(()=>window.mediaCenter.playingScreenPreferences())
 const file=resolve(artifacts,'exported-140-theme.css')
 const contrast=async locator=>{const values=await locator.evaluateAll(elements=>elements.map(el=>{
  const ctx=document.createElement('canvas').getContext('2d');ctx.canvas.width=ctx.canvas.height=1
  const paint=color=>{ctx.fillStyle=color;ctx.fillRect(0,0,1,1)}
  const lum=()=>[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
  paint(getComputedStyle(document.documentElement).getPropertyValue('--bg'));const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p)
  for(const p of chain)paint(getComputedStyle(p).backgroundColor)
  const bg=lum();paint(getComputedStyle(el).color);const fg=lum();return {text:el.textContent,ratio:(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)}
 }));for(const v of values)assert(v.ratio>=4.5,JSON.stringify(v))}
 const settings=async()=>{await page.locator('.sidebar').getByRole('button',{name:'Settings',exact:true}).click();await page.locator('.settings-rail').getByRole('button',{name:'Appearance',exact:true}).click()}
 const visibleCurrent=async selector=>{await page.waitForFunction(selector=>{const el=document.querySelector(selector);if(!el)return false;for(let p=el.parentElement;p;p=p.parentElement){if(!/(auto|scroll)/.test(getComputedStyle(p).overflowY)||p.scrollHeight<=p.clientHeight)continue;const a=el.getBoundingClientRect(),b=p.getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1}return false},selector)}
 try{
  await page.evaluate(async saved=>{await window.mediaCenter.savePreferences({...saved,customCss:undefined,theme:'midnight',appearance:{...saved.appearance,appStyle:'default',showHelp:true,colors:{}}})},saved)
  await settings();await page.getByRole('checkbox',{name:'Show page guidance',exact:true}).uncheck();await page.getByRole('button',{name:'Save theme',exact:true}).click()
  await page.reload();await settings();assert.equal(await page.getByRole('checkbox',{name:'Show page guidance',exact:true}).isChecked(),false)
  assert.equal(await page.locator('.theme-picker .guidance').isVisible(),false)
  await page.getByRole('checkbox',{name:'Show page guidance',exact:true}).check();await page.getByRole('button',{name:'Save theme',exact:true}).click()
  await desktop.evaluate(({dialog},file)=>{globalThis.__save140=dialog.showSaveDialog;globalThis.__open140=dialog.showOpenDialog;dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]})},file)
  await page.getByRole('button',{name:'Export current CSS',exact:true}).click()
  for(let i=0;i<100&&!existsSync(file);i++)await new Promise(r=>setTimeout(r,50))
  const css=readFileSync(file,'utf8');assert(css.includes('Media Center CSS snapshot'));assert(css.includes('--body-font:'));assert(css.length>100000)
  await page.getByRole('button',{name:'Import theme CSS',exact:true}).click();await page.waitForFunction(()=>document.getElementById('custom-theme-css')?.textContent.includes('Media Center CSS snapshot'))
  assert.equal(await page.locator('.workspace').evaluate(el=>el.scrollWidth>el.clientWidth),false)
  await page.getByRole('button',{name:'Export current CSS',exact:true}).click()
  await page.getByRole('button',{name:'Remove custom CSS',exact:true}).click();await page.getByRole('button',{name:'Save theme',exact:true}).click()
  const library=(await page.evaluate(()=>window.mediaCenter.libraries())).libraries.find(l=>l.kind==='music')
  await page.evaluate(async id=>{const a=window.mediaCenter;await a.command({action:'volume',value:0});await a.play({queue:Array.from({length:215},(_,i)=>({target:{kind:'music-track',serverId:id,trackId:'transport-fixture'},title:`Queue follow fixture ${i+1}`,subtitle:'Test fixture',duration:600})),index:85})},library.serverId)
  await page.getByRole('button',{name:'Open now playing',exact:true}).click();await visibleCurrent('.queue-row.current')
  const pagination=await page.locator('.queue-pagination').boundingBox(),header=await page.locator('.queue-content .section-title').boundingBox();assert(pagination.y>=header.y&&pagination.y<header.y+header.height)
  await page.evaluate(()=>window.mediaCenter.queueEdit({action:'jump',index:175}));await page.waitForFunction(()=>document.querySelector('.queue-row.current')?.textContent.includes('176'));await visibleCurrent('.queue-row.current')
  await page.screenshot({path:resolve(artifacts,'queue-follow-140.png')})
  await page.getByRole('button',{name:'Immersive view',exact:true}).click();await page.evaluate(playing=>window.mediaCenter.savePlayingScreenPreferences({...playing,layout:'studio'}),playing)
  // Open preferences through the live preview path, which also covers Save/Cancel.
  await page.getByRole('button',{name:'Appearance',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Lyrics appearance',exact:true})
  for(const background of ['snow','rain','ocean','ember']){
   await dialog.getByRole('combobox',{name:'Playing screen background',exact:true}).selectOption(background)
   await page.waitForFunction(b=>document.querySelector('.immersive-player')?.classList.contains('backdrop-'+b),background)
  }
  await dialog.getByRole('combobox',{name:'Playing screen background',exact:true}).selectOption('snow');await dialog.getByRole('checkbox',{name:'Smooth motion',exact:true}).check();await dialog.getByRole('button',{name:'Save appearance',exact:true}).click()
  await visibleCurrent('.screen-queue-item.current')
  assert.notEqual(await page.locator('.weather-field>i').first().evaluate(el=>getComputedStyle(el).animationName),'none')
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.weather-field>i').first().evaluate(el=>getComputedStyle(el).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'})
  await page.screenshot({path:resolve(artifacts,'snowfall-140.png')})
  await page.getByRole('button',{name:'Classic view',exact:true}).click()
  await page.locator('.sidebar').getByRole('button',{name:'Home',exact:true}).click()
  assert.equal(await page.locator('.sidebar .nav-item.selected').first().evaluate(el=>getComputedStyle(el).boxShadow),'none')
  await desktop.evaluate((_electron,image)=>{globalThis.__fetch140=globalThis.fetch;globalThis.fetch=async(input,init)=>{const url=new URL(String(input));if(url.hostname==='musicbrainz.org')throw TypeError('fixture fallback');if(url.hostname==='itunes.apple.com')return new Response(JSON.stringify({results:[{collectionId:1400140,collectionName:'Selectable release · Test fixture',artistName:'Fixture artist',artworkUrl100:'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fixture/cover.jpg/100x100bb.jpg'}]}));if(url.hostname==='is1-ssl.mzstatic.com')return new Response(Buffer.from(image,'base64'));return globalThis.__fetch140(input,init)}},readFileSync(resolve('out/renderer/assets/default-cover.png')).toString('base64'))
  await page.evaluate(id=>window.dispatchEvent(new CustomEvent('personal-open',{detail:{refs:[{kind:'album',serverId:id,id:'album',title:'Test fixture album'}],tab:'details'}})),library.serverId)
  const editor=page.getByRole('dialog',{name:'Make it yours',exact:true});await editor.getByRole('tab',{name:'Artwork',exact:true}).click()
  await editor.getByLabel('Find album artwork',{exact:true}).fill('Semantic card fixture');await editor.getByRole('button',{name:'Search covers',exact:true}).click();await editor.getByRole('button',{name:/Selectable release/}).click()
  await editor.getByRole('button',{name:'Use this cover',exact:true}).waitFor()
  const before=await page.evaluate(()=>window.mediaCenter.preferences())
  for(const theme of ['forest','charcoal','glass','midnight','ocean','rose','lavender','ember','coffee','nord','monochrome','aubergine','black-glass'])for(const appStyle of ['default','soft','precision','outline','bold','retro','editorial','neon','ribbon','frosted']){
   await page.evaluate(p=>window.mediaCenter.savePreferences(p),{...before,theme,appearance:{...before.appearance,appStyle}})
   await page.waitForFunction(({theme,appStyle})=>document.documentElement.dataset.theme===theme&&document.documentElement.dataset.appStyle===appStyle,{theme,appStyle})
   const geometry=await editor.evaluate(el=>{const tab=el.querySelector('[role=tab][aria-selected=true]'),card=el.querySelector('.result-card'),action=[...el.querySelectorAll('button')].find(b=>b.textContent==='Use this cover'),heading=el.querySelector('h3');const t=getComputedStyle(tab),c=getComputedStyle(card),a=getComputedStyle(action),h=getComputedStyle(heading);return {tabFill:t.backgroundColor,tabRadius:parseFloat(t.borderTopLeftRadius),cardRadius:parseFloat(c.borderTopLeftRadius),cardFill:c.backgroundColor,actionFill:a.backgroundColor,cardHeight:card.getBoundingClientRect().height,headingFill:h.backgroundColor}})
   assert.equal(geometry.tabFill,'rgba(0, 0, 0, 0)',theme+'/'+appStyle+' tab remains navigation')
   assert(geometry.tabRadius<=4);assert(geometry.cardRadius<=16&&geometry.cardRadius<geometry.cardHeight/2);assert.notEqual(geometry.cardFill,geometry.actionFill)
   assert.equal(geometry.headingFill,'rgba(0, 0, 0, 0)')
   await contrast(editor.locator('.result-card>:is(strong,span,small)'))
   if(theme==='midnight'&&appStyle==='frosted')await page.screenshot({path:resolve(artifacts,'frosted-editor-140.png')})
  }
  await editor.getByRole('button',{name:'Close dialog',exact:true}).click()
  await desktop.evaluate(()=>{globalThis.__lyricsFetch140=globalThis.fetch;globalThis.fetch=async(input,init)=>{const u=new URL(String(input));if(u.hostname==='lrclib.net')return new Response(JSON.stringify([{id:14001,trackName:'Alibi · Test fixture',artistName:'Fixture artist',albumName:'Fixture album',duration:200,plainLyrics:'Fixture lyrics for visual testing',syncedLyrics:'[00:00.00]Fixture lyrics for visual testing',instrumental:false},{id:14002,trackName:'Second result · Test fixture',artistName:'Another artist',albumName:'Fixture album',duration:200,plainLyrics:'Second fixture',syncedLyrics:null,instrumental:false}]));return globalThis.__lyricsFetch140(input,init)}})
  await page.getByRole('button',{name:'Open now playing',exact:true}).click();await page.getByRole('button',{name:'Lyrics',exact:true}).click()
  await page.getByRole('button',{name:'Lyrics tools',exact:true}).click();await page.getByRole('button',{name:'Find lyrics',exact:true}).click()
  const lyrics=page.getByRole('dialog',{name:'Find lyrics for this song',exact:true});await lyrics.getByRole('button',{name:'Search lyrics',exact:true}).click();await lyrics.locator('.lyric-result').first().click()
  for(const theme of ['forest','charcoal','glass','midnight','ocean','rose','lavender','ember','coffee','nord','monochrome','aubergine','black-glass'])for(const appStyle of ['default','soft','precision','outline','bold','retro','editorial','neon','ribbon','frosted']){
   await page.evaluate(p=>window.mediaCenter.savePreferences(p),{...before,theme,appearance:{...before.appearance,appStyle}})
   await page.waitForFunction(({theme,appStyle})=>document.documentElement.dataset.theme===theme&&document.documentElement.dataset.appStyle===appStyle,{theme,appStyle})
   await contrast(lyrics.locator('.lyric-result>:is(strong,span,small)'))
   await lyrics.locator('.lyric-result').first().hover();await contrast(lyrics.locator('.lyric-result>:is(strong,span,small)'))
   if(theme==='black-glass'&&appStyle==='frosted')await page.screenshot({path:resolve(artifacts,'lyrics-result-contrast-140.png')})
  }
  await lyrics.getByRole('button',{name:'Close dialog',exact:true}).click()
  console.log('Result contrast passed: titles, artists and metadata in selected/unselected and hovered artwork/lyrics results across 130 combinations.')
  console.log('Semantic UI passed: actual editor tabs, artwork result cards, action buttons and headings stay distinct across all 130 theme/style combinations.')
  console.log('1.4 checks passed: guidance persistence, CSS export/import, normal and immersive queue auto-follow across pages, compact pagination, four backgrounds and reduced motion.')
 }finally{
  await desktop.evaluate(({dialog})=>{if(globalThis.__fetch140)globalThis.fetch=globalThis.__fetch140;if(globalThis.__save140)dialog.showSaveDialog=globalThis.__save140;if(globalThis.__open140)dialog.showOpenDialog=globalThis.__open140})
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(async({saved,playing})=>{await window.mediaCenter.command({action:'stop'});await window.mediaCenter.savePreferences(saved);await window.mediaCenter.savePlayingScreenPreferences(playing)},{saved,playing});await page.reload()
 }
}
