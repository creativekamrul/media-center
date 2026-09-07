const assert=require('node:assert/strict')
const {resolve}=require('node:path')
module.exports=async function lyricsSmoke({desktop,page,waitPlayback,artifacts}){
 await desktop.evaluate(()=>{globalThis.__lyricsFetch=globalThis.fetch;globalThis.__lyricsMode='synced';globalThis.__lyricsRequests=[];globalThis.fetch=async(input,options)=>{const url=new URL(String(input));if(url.hostname!=='lrclib.net')return globalThis.__lyricsFetch(input,options);globalThis.__lyricsRequests.push({url:String(url),headers:options.headers});return new Response(JSON.stringify({duration:600,instrumental:globalThis.__lyricsMode==='instrumental',plainLyrics:'Original fixture text for this test.',syncedLyrics:globalThis.__lyricsMode==='synced'?'[00:00.00]First test line\n[00:02.00]Second test line\n[00:04.00]Third test line':null}))}})
 try{
  await page.getByRole('button',{name:'Lyrics',exact:true}).click()
  await page.getByRole('button',{name:'Second test line',exact:true}).waitFor()
  await page.evaluate(async()=>{const p=await window.mediaCenter.playback();if(p.status==='playing')await window.mediaCenter.command({action:'toggle'})})
  await page.getByRole('button',{name:'Second test line',exact:true}).click()
  await waitPlayback(p=>p.status==='paused'&&Math.abs(p.position-2)<.1)
  assert.equal(await page.getByRole('button',{name:'Second test line',exact:true}).getAttribute('aria-current'),'true')
  await page.screenshot({path:resolve(artifacts,'lyrics-synced.png')})
  const requests=await desktop.evaluate(()=>globalThis.__lyricsRequests);assert.equal(requests.length,1);assert.ok(!JSON.stringify(requests).includes('test-token'));assert.ok(!JSON.stringify(requests).includes('test-password'))
  await page.evaluate(()=>window.mediaCenter.lyrics({}));assert.equal(await desktop.evaluate(()=>globalThis.__lyricsRequests.length),1)
  await desktop.evaluate(()=>{globalThis.__lyricsMode='plain'})
  await page.getByRole('button',{name:'Refresh lyrics',exact:true}).click()
  await page.getByText('Plain lyrics · timing unavailable',{exact:true}).waitFor()
  await desktop.evaluate(()=>{globalThis.__lyricsMode='instrumental'})
  await page.getByRole('button',{name:'Refresh lyrics',exact:true}).click()
  await page.getByText('Instrumental — no lyrics for this track.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Queue',exact:true}).click()
 }finally{await desktop.evaluate(()=>{globalThis.fetch=globalThis.__lyricsFetch;delete globalThis.__lyricsFetch;delete globalThis.__lyricsMode;delete globalThis.__lyricsRequests})}
}
