const assert=require('node:assert/strict')
const {resolve}=require('node:path')
module.exports=async function themeSmoke(page,artifacts){
 const original=await page.evaluate(()=>window.mediaCenter.preferences())
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 await page.locator('.theme-grid').waitFor()
 assert.equal(await page.locator('.theme-swatch').count(),12)
 for(const name of ['Glass','Midnight','Ocean','Rose','Lavender','Ember','Coffee','Nord','Monochrome','Aubergine']){
  await page.getByRole('button',{name,exact:true}).click()
  await page.getByRole('button',{name:'Save audio preferences',exact:true}).click()
  await page.waitForFunction(id=>document.documentElement.dataset.theme===id,name.toLowerCase())
  assert.equal((await page.evaluate(()=>window.mediaCenter.preferences())).theme,name.toLowerCase())
 }
 await page.getByRole('button',{name:'Glass',exact:true}).click()
 await page.getByRole('button',{name:'Save audio preferences',exact:true}).click()
 await page.getByRole('button',{name:'Home',exact:true}).click()
 await page.locator('.home-continue-grid').waitFor()
 assert.equal(await page.locator('.workspace').evaluate(el=>el.scrollWidth>el.clientWidth),false)
 assert.ok(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).backdropFilter.includes('blur')))
 await page.screenshot({path:resolve(artifacts,'theme-glass.png')})
 await page.evaluate(p=>window.mediaCenter.savePreferences(p),original)
}
