const assert=require('node:assert/strict')
const {createServer}=require('node:http')
const {resolve}=require('node:path')

module.exports=async({page,artifacts,serveWav})=>{
 const settle=async check=>{for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,50))}assert(check())}
 const calls=[];let offline=false,starred=false,rating=0,playlist=null
 const song=()=>({id:'song',title:'Second server audio · Test fixture',artist:'Second fixture artist',album:'Second server album · Test fixture',duration:600,coverArt:'second-cover',suffix:'wav',userRating:rating,...(starred?{starred:'2026-01-01'}:{})})
 const album=()=>({id:'album',name:'Second server album · Test fixture',artist:'Second fixture artist',songCount:1,coverArt:'second-cover',song:[song()],...(starred?{starred:'2026-01-01'}:{})})
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),endpoint=url.pathname.split('/').at(-1)
  let params=url.searchParams
  if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;params=new URLSearchParams(body)}
  calls.push({endpoint,params})
  if(offline){res.statusCode=503;return res.end('{}')}
  if(endpoint==='stream.view')return serveWav(req,res,600)
  if(endpoint==='getCoverArt.view'){res.setHeader('Content-Type','image/png');return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'))}
  const data={status:'ok',version:'1.16.1'}
  if(endpoint==='getMusicFolders.view')data.musicFolders={musicFolder:[{id:'1',name:'Test Music'}]}
  if(endpoint==='getAlbumList2.view')data.albumList2={album:Number(params.get('offset')||0)?[]:[album()]}
  if(endpoint==='search3.view')data.searchResult3={song:!Number(params.get('songOffset')||0)&&song().title.toLowerCase().includes((params.get('query')||'').toLowerCase())?[song()]:[]}
  if(endpoint==='getAlbum.view')data.album=album()
  if(endpoint==='getSong.view')data.song=song()
  if(endpoint==='star.view')starred=true
  if(endpoint==='unstar.view')starred=false
  if(endpoint==='setRating.view')rating=Number(params.get('rating'))
  if(endpoint==='getPlaylists.view')data.playlists={playlist:playlist?[playlist]:[]}
  if(endpoint==='getPlaylist.view')data.playlist=playlist
  if(endpoint==='createPlaylist.view'){playlist={id:'second-playlist',name:params.get('name')||playlist?.name,comment:'',public:false,songCount:params.getAll('songId').length,entry:params.getAll('songId').map(()=>song())};data.playlist=playlist}
  if(endpoint==='updatePlaylist.view')Object.assign(playlist,{name:params.get('name'),comment:params.get('comment'),public:params.get('public')==='true'})
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({'subsonic-response':data}))
 })
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 let second
 try{
  second=await page.evaluate(url=>window.mediaCenter.saveConnection({provider:'navidrome',name:'Second fixture server',url,username:'test-user',secret:'fixture-only'}),`http://127.0.0.1:${server.address().port}`)
  await page.reload();await page.getByRole('button',{name:'Music',exact:true}).click()
  const browser=page.locator('.music-browser'),picker=browser.getByRole('combobox',{name:'Music library',exact:true})
  const libraries=(await page.evaluate(()=>window.mediaCenter.libraries())).libraries.filter(l=>l.kind==='music')
  assert.equal(libraries.length,2)
  assert.notEqual(libraries[0].name,libraries[1].name)
  await picker.selectOption(`${second.id}:1`)
  await browser.getByRole('button',{name:/^Second server album/}).waitFor()
  assert.equal(await browser.locator('.music-card').count(),1)
  await picker.selectOption('all')
  await page.waitForFunction(()=>document.querySelectorAll('.music-browser .music-card').length===26)
  await page.screenshot({path:resolve(artifacts,'combined-music-libraries.png')})
  await page.setViewportSize({width:1024,height:800});assert((await picker.boundingBox()).width>100);await page.screenshot({path:resolve(artifacts,'combined-music-libraries-1024.png')});await page.setViewportSize({width:1440,height:940})
  await browser.getByRole('button',{name:/^Second server album/}).click()
  await browser.getByRole('heading',{name:'Second server album · Test fixture',exact:true}).waitFor()
  await browser.locator('.detail-hero').getByRole('button',{name:'Play selection',exact:true}).click()
  await page.waitForFunction(async id=>{const p=await window.mediaCenter.playback();return p.status==='playing'&&p.queue[p.queueIndex]?.target.serverId===id},second.id)
  await settle(()=>calls.some(c=>c.endpoint==='stream.view'));await settle(()=>calls.some(c=>c.endpoint==='getCoverArt.view'))
  await page.evaluate(()=>window.mediaCenter.command({action:'stop'}))
  await browser.getByRole('button',{name:'Back',exact:true}).click()
  await browser.getByRole('button',{name:'Songs',exact:true}).click()
  await browser.getByRole('button',{name:'Favorite Second server audio · Test fixture',exact:true}).click()
  await browser.getByRole('button',{name:'Unfavorite Second server audio · Test fixture',exact:true}).waitFor();assert.equal(starred,true)
  await browser.getByRole('combobox',{name:'Rating for Second server audio · Test fixture',exact:true}).selectOption('4')
  await page.waitForFunction(()=>document.querySelector('[aria-label="Rating for Second server audio · Test fixture"]')?.value==='4')
  await settle(()=>rating===4)
  assert.equal(await browser.getByRole('button',{name:'Add to playlist',exact:true}).isDisabled(),true)
  await browser.getByRole('textbox',{name:'Search music',exact:true}).fill('Second server audio')
  await page.waitForFunction(()=>document.querySelectorAll('.music-browser .song-row').length===1)
  assert.equal(await browser.getByRole('button',{name:'Add to playlist',exact:true}).isEnabled(),true)
  await browser.getByRole('textbox',{name:'Search music',exact:true}).fill('')
  await browser.getByRole('button',{name:'Playlists',exact:true}).click()
  assert.equal(await browser.getByRole('button',{name:'New playlist',exact:true}).isDisabled(),true)
  await browser.getByRole('combobox',{name:'Playlist destination',exact:true}).selectOption(second.id)
  await browser.getByRole('button',{name:'New playlist',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'New playlist',exact:true})
  await dialog.getByLabel('Name',{exact:true}).fill('Second-only fixture playlist')
  await dialog.getByRole('button',{name:'Save playlist',exact:true}).click()
  await browser.getByRole('button',{name:/Second-only fixture playlist/}).waitFor()
  assert.equal(playlist.name,'Second-only fixture playlist')
  await browser.getByRole('button',{name:'Songs',exact:true}).click()
  await browser.getByRole('checkbox',{name:'Select Second server audio · Test fixture',exact:true}).check()
  await browser.getByRole('button',{name:'Add to playlist',exact:true}).click()
  await page.getByRole('dialog',{name:'Add 1 tracks to a playlist',exact:true}).getByRole('button',{name:/Second-only fixture playlist/}).click()
  await page.getByRole('dialog',{name:'Add 1 tracks to a playlist',exact:true}).waitFor({state:'hidden'})
  assert.equal(playlist.entry[0].id,'song')
  // Clearing the normal catalog cache permits an actual failure/recovery request.
  offline=true;await page.evaluate(()=>window.mediaCenter.libraries())
  await browser.getByRole('button',{name:'Albums',exact:true}).click()
  await browser.getByRole('alert').filter({hasText:'Second fixture server: Could not load music.'}).waitFor()
  assert.equal(await browser.locator('.music-card').count(),25)
  offline=false;await browser.getByRole('button',{name:'Retry',exact:true}).click()
  await page.waitForFunction(()=>document.querySelectorAll('.music-browser .music-card').length===26)
  await require('./view-navigation.cjs')(page,'Recently played','button')
  await page.waitForFunction(()=>document.querySelectorAll('.music-browser .music-card').length===61)
  await browser.getByRole('button',{name:'Next',exact:true}).click()
  await page.waitForFunction(()=>document.querySelectorAll('.music-browser .music-card').length===5)
  assert.equal(await browser.getByRole('button',{name:'Next',exact:true}).isDisabled(),true)
  console.log('Multiple Navidrome libraries passed: distinct picker names, combined IDs, second-server native playback/artwork/favorites/rating, search, destination playlists, and partial failure/retry.')
 }finally{
  await page.evaluate(()=>window.mediaCenter.command({action:'stop'}))
  if(second)await page.evaluate(id=>window.mediaCenter.removeConnection(id),second.id)
  server.closeAllConnections();await new Promise(r=>server.close(r));await page.reload()
 }
}
