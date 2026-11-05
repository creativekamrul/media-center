const assert=require('node:assert/strict');const {resolve}=require('node:path');const {writeFileSync}=require('node:fs')
module.exports=async({page,artifacts})=>{
 for(const section of ['Music','Audiobooks','Podcasts','Local music','Jellyfin','Home']){
  await page.locator('.sidebar').getByRole('button',{name:section,exact:true}).click()
  for(const width of [2560,1008]){
   await page.setViewportSize({width,height:940})
   const result=await page.locator('main.library-workspace').evaluate(el=>{const r=el.getBoundingClientRect(),w=el.parentElement.getBoundingClientRect(),s=getComputedStyle(el);const child=el.querySelector('.spoken-browser,.jf-hub');return {difference:w.width-r.width,overflow:el.scrollWidth-el.clientWidth,inner:child?Math.abs(child.getBoundingClientRect().width-(el.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight))):0}})
   assert.ok(result.difference<20&&result.overflow<2&&result.inner<2,`${section} fills the workspace without overflow: ${JSON.stringify(result)}`)
   await page.screenshot({path:resolve(artifacts,`full-width-${section.replaceAll(' ','-')}-${width}.png`)})
  }
 }
 for(const section of ['Music','Audiobooks','Podcasts']){
  await page.locator('.sidebar').getByRole('button',{name:section,exact:true}).click()
  if(section==='Music')await page.getByRole('button',{name:'Albums',exact:true}).last().click()
  await page.locator(section==='Music'?'.music-card':'.spoken-browser .media-card').first().click()
  await page.locator('.detail-hero').waitFor()
  for(const width of [1440,1008]){
   await page.setViewportSize({width,height:940})
   await page.waitForTimeout(150)
   const hero=page.locator('.detail-hero'),art=await hero.locator(':scope>.art').boundingBox()
   assert.ok(art.width<=261,'Artwork stays bounded independently of long text')
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow')
   assert.ok(await hero.locator('.detail-heading').evaluate(el=>{const r=el.getBoundingClientRect();return r.right<=innerWidth}),'Heading fits')
   await page.screenshot({path:resolve(artifacts,`collection-design-${section}-${width}.png`)})
   assert.ok(await hero.locator('.listen-actions>.primary svg').first().isVisible(),'Primary playback icon remains visible at narrow widths')
   const row=page.locator(section==='Music'?'.song-row:not(.table-heading)':section==='Podcasts'?'.episode-card':'.chapter-row').first()
   await row.scrollIntoViewIfNeeded()
   await page.screenshot({path:resolve(artifacts,`collection-rows-${section}-${width}.png`)})
   await page.locator('.workspace').evaluate(el=>el.scrollTop=0)
  }
 }
 await page.setViewportSize({width:1440,height:940})
 const saved=await page.evaluate(async()=>{const a=window.mediaCenter,library=(await a.libraries()).libraries.find(l=>l.kind==='music');return a.playlistSave({serverId:library.serverId,name:'Collection layout fixture',comment:'A long playlist for layout verification',public:false,songIds:Array(3000).fill('song')})})
 await page.locator('.sidebar').getByRole('button',{name:'Music',exact:true}).click()
 await page.getByRole('button',{name:'Playlists',exact:true}).last().click()
 const openedAt=Date.now()
 await page.getByRole('button',{name:/Collection layout fixture/}).first().click()
 await page.locator('.collection-page').waitFor()
 const loadMs=Date.now()-openedAt
 assert.equal(await page.locator('.song-row:not(.table-heading)').count(),100,'Large playlists render one bounded page')
 await page.locator('.row-tools .more-options-trigger').first().click()
 const menu=page.locator('.more-options-panel')
 await menu.getByText('Rating',{exact:true}).focus()
 await page.keyboard.press('Enter')
 await page.keyboard.press('ArrowDown')
 assert.equal(await page.evaluate(()=>document.activeElement.textContent),'No rating','Keyboard enters the expanded rating choices')
 await page.keyboard.press('Escape')
 assert.ok(await page.locator('.row-tools .more-options-trigger').first().evaluate(el=>el===document.activeElement),'Escape restores row menu focus')
 const frameGaps=await page.evaluate(async()=>{const el=document.querySelector('.workspace'),gaps=[];let last=performance.now();for(let i=0;i<30;i++){el.scrollTop=i*110;await new Promise(requestAnimationFrame);const now=performance.now();gaps.push(now-last);last=now}el.scrollTop=0;return gaps})
 writeFileSync(resolve(artifacts,'library-performance.json'),JSON.stringify({fixtureTracks:3000,renderedRows:100,openMilliseconds:loadMs,scrollFrames:frameGaps.length,medianFrameMs:frameGaps.sort((a,b)=>a-b)[15],maxFrameMs:Math.max(...frameGaps),note:'Isolated fixture measurement; not a benchmark of remote servers.'},null,2))
 for(const width of [1920,1440,1008]){
  await page.setViewportSize({width,height:940});await page.locator('.workspace').evaluate(el=>el.scrollTop=0)
  const bounds=await page.locator('.collection-page').boundingBox(),workspace=await page.locator('.workspace').boundingBox()
  assert.ok(Math.abs(bounds.width-workspace.width)<20,'Collection canvas uses the full workspace width')
  assert.ok(await page.locator('.workspace').evaluate(el=>el.scrollWidth<=el.clientWidth),'Row tools stay inside the workspace')
  const hero=await page.locator('.detail-hero').boundingBox(),toolbar=await page.locator('.song-section>.library-action-panel').boundingBox()
  assert.ok(toolbar.y-hero.y-hero.height<16,'Header flows directly into track controls')
  const back=await page.locator('.collection-page>.back').boundingBox(),library=await page.locator('.collection-page>.library-heading').boundingBox()
  await page.locator('.collection-page>.back').hover()
  assert.ok(await page.locator('.collection-page>.back').evaluate(el=>{const s=getComputedStyle(el);return parseFloat(s.borderRadius)<=12&&parseFloat(s.paddingLeft)>=10}),'Back has a padded rectangular hover target')
  assert.ok(Math.abs(back.y-library.y)<4,'Back and library controls share one row')
  if(width>1100){const heading=await page.locator('.track-list-heading .column-format').boundingBox(),cell=await page.locator('.song-row:not(.table-heading) .column-format').first().boundingBox();assert.ok(Math.abs(heading.x-cell.x)<2,'Playlist column labels align with their values')}
  await page.screenshot({path:resolve(artifacts,`collection-unified-playlist-${width}.png`)})
 }
 console.log('Collection design passed: music, audiobook and podcast details at wide and narrow desktop widths.')
}
