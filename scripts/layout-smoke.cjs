const assert = require('node:assert/strict')
const {resolve} = require('node:path')

module.exports = async function layoutSmoke(page, artifacts) {
  const theme = await page.evaluate(() => document.documentElement.dataset.theme)
  for (const width of [1008, 1440, 1920]) {
    await page.setViewportSize({width, height:940})
    await page.evaluate(t => { document.documentElement.dataset.theme = t }, width === 1440 ? 'forest' : 'charcoal')
    await page.getByRole('button', {name:'Home', exact:true}).click()
    await page.locator('.home-album-card').first().waitFor()
    await page.locator('.home-continue-grid .resume-card').first().waitFor()
    const cards = await page.locator('.home-album-card, .home-continue-grid .resume-card').evaluateAll(items => items.map(el => {
      const r = el.getBoundingClientRect()
      return {album:el.classList.contains('home-album-card'), width:r.width, height:r.height,
        overflow:el.scrollWidth > el.clientWidth,
        buttons:[...el.querySelectorAll('button')].map(b => { const r=b.getBoundingClientRect(); return {height:r.height,width:r.width,y:r.y} })}
    }))
    await page.screenshot({path:resolve(artifacts, `home-compact-${width}.png`)})
    assert.ok(cards.length >= 3, 'Check populated albums and spoken progress')
    for (const card of cards) {
      assert.ok(card.width <= (card.album ? 210 : 280), 'Sparse sections must not stretch cards')
      assert.ok(card.height <= (card.album ? 310 : 205), `Long titles must not create oversized cards: ${JSON.stringify(card)}`)
      assert.equal(card.overflow, false, 'Card content must fit its container')
      assert.ok(card.buttons.every(b => b.height >= 36 && b.width >= 36), 'Compact controls keep usable hit targets')
      if (!card.album) assert.ok(card.buttons.every(b => Math.abs(b.y-card.buttons[0].y)<2), 'Resume actions fit in one row')
    }
    assert.equal(await page.locator('.workspace').evaluate(el => el.scrollWidth > el.clientWidth), false)
    await page.getByRole('button', {name:'Listening notes', exact:true}).click()
    const search = page.getByRole('textbox', {name:'Search listening notes'})
    await search.waitFor()
    const box = await search.boundingBox()
    assert.ok(box.width >= 300 && box.height >= 40 && box.x + box.width <= width, 'Notes search must be readable and fit the window')
    await search.fill('A note to find')
    await search.fill('')
    if (width === 1008) await page.screenshot({path:resolve(artifacts, 'notes-compact.png')})
    await page.getByRole('button', {name:'Audiobooks', exact:true}).click()
    await page.locator('.continue-grid .resume-card').first().waitFor()
    assert.ok((await page.locator('.continue-grid .resume-card').first().boundingBox()).height <= 205, 'Library resume cards match the compact Home layout')
    if (width === 1440) await page.screenshot({path:resolve(artifacts, 'library-compact.png')})
  }
  await page.evaluate(t => { if(t) document.documentElement.dataset.theme=t; else delete document.documentElement.dataset.theme }, theme)
  await page.setViewportSize({width:1440,height:940})
  console.log('Layout checks: compact cards, readable search, both themes and three window sizes passed.')
}
