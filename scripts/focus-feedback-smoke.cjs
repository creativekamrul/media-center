const assert=require('node:assert/strict')

// Disposable CSS fixtures in the isolated Electron test profile, never playable media.
module.exports=async function({page}){
 await page.evaluate(()=>{
  const fixture=document.createElement('div');fixture.id='focus-feedback-fixture'
  Object.assign(fixture.style,{position:'fixed',zIndex:'99999',top:'100px',left:'100px',width:'300px',padding:'20px',background:'var(--bg)'})
  fixture.innerHTML='<article class="media-card"><button type="button">QA focus card</button></article><label class="search"><input aria-label="QA focus search"/></label>'
  document.body.append(fixture)
 })
 try{
  const root=page.locator('#focus-feedback-fixture'),button=root.getByRole('button'),input=root.getByRole('textbox')
  await button.click()
  assert.equal(await root.locator('article').evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  await input.click()
  assert.equal(await root.locator('.search').evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  assert.equal(await input.evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  await button.click();await page.keyboard.press('Tab')
  assert.equal(await input.evaluate(el=>document.activeElement===el),true)
  assert.notEqual(await input.evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  console.log('Focus feedback passed: pointer cards/search have no frames; keyboard focus retained.')
 }finally{await page.locator('#focus-feedback-fixture').evaluate(el=>el.remove())}
}
