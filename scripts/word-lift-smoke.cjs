const assert=require('node:assert/strict')
const {resolve}=require('node:path')
module.exports=async function wordLiftSmoke({page,waitPlayback,artifacts}) {
 const seek=async value=>{await page.evaluate(value=>window.mediaCenter.command({action:'seek',value}),value);await waitPlayback(p=>p.status==='paused'&&Math.abs(p.position-value)<.05)}
 const appearance=async immersive=>page.getByRole('button',{name:immersive?'Appearance':'Lyrics appearance',exact:true}).click()
 await appearance(false)
 await page.getByLabel('Animation style',{exact:true}).selectOption('flow')
 await page.getByLabel('Smooth motion',{exact:true}).check()
 await page.getByRole('button',{name:'Save appearance',exact:true}).click()
 await page.getByRole('dialog',{name:'Lyrics appearance',exact:true}).waitFor({state:'hidden'})
 for (const immersive of [false,true]) {
  if(immersive) await page.getByRole('button',{name:'Immersive view',exact:true}).click()
  const scope=immersive?'.immersive-stage':'.standard-lyrics'
  // This fixture has only line timestamps at 0s, and real enhanced timing at 2s.
  await seek(.25)
  const line=page.locator(`${scope} .karaoke.active`)
  await page.waitForFunction(scope=>document.querySelector(`${scope} .karaoke.active`)?.dataset.timing==='estimated',scope)
  assert.equal(await line.locator('[data-karaoke]').count(),3)
  let centers
  for(const [position,index] of [[.25,0],[.95,1],[1.65,2]]) {
   await seek(position)
   await page.waitForFunction(({scope,index})=>{
    const nodes=[...document.querySelectorAll(`${scope} .karaoke.active [data-karaoke]`)]
    return nodes.length===3&&nodes.every((el,i)=>{
     const style=getComputedStyle(el),scale=Number(style.scale)
     if(style.translate!=='none')return false
     return i===index?el.dataset.wordState==='active'&&scale>.999:Math.abs(scale-1/1.18)<.001
    })
   },{scope,index})
   const boxes=await line.locator('[data-karaoke]').evaluateAll(nodes=>nodes.map(el=>{
    const r=el.getBoundingClientRect(),row=el.closest('button').getBoundingClientRect()
    return {x:r.x+r.width/2-row.x,y:r.y+r.height/2-row.y,width:r.width,layoutWidth:el.offsetWidth}
   }))
   if(centers) boxes.forEach((box,i)=>{
    assert.ok(Math.abs(box.x-centers[i].x)<.5&&Math.abs(box.y-centers[i].y)<.5,'Growing words retain the same center without jumping')
   })
   centers=boxes
   assert.ok(boxes[index].width/boxes[index].layoutWidth>.99,'Active word reaches its reserved enlarged size')
  }
  // Stable word boxes prevent wrapping/height jumps as a line becomes inactive.
  const before=await line.locator('[data-karaoke]').evaluateAll(nodes=>nodes.map(el=>el.offsetTop))
  await seek(3.5)
  await page.waitForFunction(scope=>document.querySelector(`${scope} .karaoke.active`)?.dataset.timing==='word',scope)
  assert.equal(await line.locator('[data-karaoke]').count(),2,'Enhanced timestamp chunks stay intact')
  const after=await page.locator(`${scope} .karaoke`).first().locator('[data-karaoke]').evaluateAll(nodes=>nodes.map(el=>el.offsetTop))
  assert.deepEqual(after,before,'Line wrapping must not change when activation moves on')
  await seek(.95)
  await page.emulateMedia({reducedMotion:'reduce'})
  assert.ok(await line.locator('[data-karaoke]').evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el).translate==='none'&&Math.abs(Number(getComputedStyle(el).scale)-1/1.18)<.001)))
  await page.emulateMedia({reducedMotion:'no-preference'})
  await appearance(immersive)
  await page.getByLabel('Smooth motion',{exact:true}).uncheck()
  await page.getByRole('button',{name:'Save appearance',exact:true}).click()
  await page.waitForFunction(scope=>[...document.querySelectorAll(`${scope} .karaoke.active [data-karaoke]`)].every(el=>getComputedStyle(el).translate==='none'&&Math.abs(Number(getComputedStyle(el).scale)-1/1.18)<.001),scope)
  await appearance(immersive)
  await page.getByLabel('Smooth motion',{exact:true}).check()
  await page.getByRole('button',{name:'Save appearance',exact:true}).click()
  await page.waitForFunction(scope=>Number(getComputedStyle(document.querySelector(`${scope} .karaoke.active [data-word-state=active]`)).scale)>.999,scope)
  await page.screenshot({path:resolve(artifacts,immersive?'immersive-word-emphasis.png':'normal-word-emphasis.png')})
 }
 await page.getByRole('button',{name:'Classic view',exact:true}).click()
 // Check that motion follows the running MPV clock, without another manual seek.
 await seek(.1)
 await page.evaluate(()=>window.mediaCenter.command({action:'toggle'}))
 await page.waitForFunction(()=>document.querySelector('.standard-lyrics .karaoke.active[data-timing=estimated] [data-karaoke]:nth-of-type(2)')?.dataset.wordState==='active')
 await page.evaluate(()=>window.mediaCenter.command({action:'toggle'}))
 const volume=page.getByRole('slider',{name:'Volume',exact:true})
 const previous=Number(await volume.inputValue())
 await volume.focus();await page.keyboard.press(previous<100?'ArrowRight':'ArrowLeft')
 const expected=previous<100?previous+1:previous-1
 await waitPlayback(p=>p.volume===expected)
 await page.waitForFunction(value=>document.querySelector('.volume-value')?.textContent===`${value}%`,expected)
 assert.equal(await page.locator('.volume-value').textContent(),`${expected}%`)
 assert.equal(await volume.evaluate(el=>el.style.getPropertyValue('--volume-level')),`${expected}%`)
 await page.evaluate(value=>window.mediaCenter.command({action:'volume',value}),previous)
 console.log('Centered word emphasis: normal/immersive estimated words, real timings, stable wrapping, seek, playback, reduced motion and motion toggle passed.')
}
