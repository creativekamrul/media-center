const assert = require('node:assert/strict')
const {resolve} = require('node:path')

module.exports = async function layoutSmoke(page, artifacts) {
  const theme = await page.evaluate(() => document.documentElement.dataset.theme)
  for (const width of [1008, 1440, 1920]) {
    await page.setViewportSize({width, height:940})
    await page.evaluate(t => { document.documentElement.dataset.theme = t }, width === 1440 ? 'forest' : 'charcoal')
    await page.getByRole('button', {name:'Home', exact:true}).click()
    await page.locator('.home-album-card').first().waitFor()
    await page.locator('.home-shelf-track[aria-label="Continue listening"] .resume-card').first().waitFor()
    const cards = await page.locator('.home-album-card, .home-shelf-track[aria-label="Continue listening"] .resume-card').evaluateAll(items => items.map(el => {
      const r = el.getBoundingClientRect()
      return {album:el.classList.contains('home-album-card'), width:r.width, height:r.height,
        overflow:el.scrollWidth > el.clientWidth,
        buttons:[...el.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b => { const r=b.getBoundingClientRect(); return {height:r.height,width:r.width,y:r.y} })}
    }))
    assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'The outer window must not scroll beyond the player')
    await page.evaluate(()=>window.scrollTo(0,100000))
    assert.equal(await page.evaluate(()=>window.scrollY),0)
    const playerBounds=await page.locator('.player-bar').boundingBox();assert.ok(Math.abs(playerBounds.y+playerBounds.height-940)<2,'Player stays at the window bottom')
    const cover=await page.locator('.player-bar .now-art').boundingBox()
    assert.ok(cover.width>=(width<=1180?64:72)&&cover.height===cover.width,'Bottom artwork stays larger and square')
    const volume=page.locator('.player-bar input[aria-label="Volume"]')
    const volumeBox=await volume.boundingBox()
    assert.ok(volumeBox.width>=80&&volumeBox.height>=28,'Volume has a visible track and usable target')
    assert.equal(await page.locator('.player-bar').evaluate(el=>el.scrollWidth>el.clientWidth),false,'Larger player controls fit at each window size')
    await page.screenshot({path:resolve(artifacts, `home-compact-${width}.png`)})
    assert.ok(cards.length >= 3, 'Check populated albums and spoken progress')
    for (const card of cards) {
      assert.ok(card.width <= (card.album ? 210 : 340), 'Sparse sections must not stretch cards')
      assert.ok(card.height <= (card.album ? 310 : 205), `Long titles must not create oversized cards: ${JSON.stringify(card)}`)
      assert.equal(card.overflow, false, 'Card content must fit its container')
      assert.ok(card.buttons.every(b => b.height >= 36 && b.width >= 36), 'Compact controls keep usable hit targets')
      assert.equal(card.buttons.length,card.album?1:2,'Cards expose Play and a compact overflow menu')
    }
    const grid=await page.locator('.home-shelf-track[aria-label="Continue listening"]').evaluate(el=>{const parent=el.getBoundingClientRect(),boxes=[...el.children].map(c=>c.getBoundingClientRect()),firstRow=boxes.filter(r=>Math.abs(r.top-boxes[0].top)<2);return{right:parent.right,rowRight:firstRow.at(-1).right,widths:boxes.map(r=>r.width),heights:boxes.map(r=>r.height)}})
    assert.ok(grid.rowRight>grid.right,'Continue listening is a horizontal shelf')
    assert.ok(await page.locator('.home-shelf-track').evaluateAll(items=>items.every(el=>getComputedStyle(el).scrollbarWidth==='none')),'Home shelves hide scrollbars while retaining arrow navigation')
    await page.getByRole('button',{name:'Next Continue listening',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('.home-shelf-track[aria-label="Continue listening"]').scrollLeft>0)
    // Wait for smooth scrolling and snapping to settle before testing the return trip.
    // Reversing at the first nonzero animation frame races Chromium's snap target.
    await page.waitForFunction(()=>{
      const el=document.querySelector('.home-shelf-track[aria-label="Continue listening"]'),now=performance.now()
      if(el.__testScrollLeft!==el.scrollLeft){el.__testScrollLeft=el.scrollLeft;el.__testScrollAt=now;return false}
      return now-el.__testScrollAt>350
    },undefined,{polling:50})
    await page.getByRole('button',{name:'Previous Continue listening',exact:true}).click()
    // Snap alignment can land exactly on the shelf's 2px inset. Match the UI's start edge.
    await page.waitForFunction(()=>document.querySelector('.home-shelf-track[aria-label="Continue listening"]').scrollLeft<=2&&document.querySelector('button[aria-label="Previous Continue listening"]').disabled)
    assert.equal(await page.getByRole('button',{name:'Previous Continue listening',exact:true}).isDisabled(),true)
    assert.ok(Math.max(...grid.widths)-Math.min(...grid.widths)<2,'Resume cards share equal column widths')
    assert.ok(Math.max(...grid.heights)-Math.min(...grid.heights)<2,'Short and long titles keep the same card height')
    assert.equal(await page.locator('.workspace').evaluate(el => el.scrollWidth > el.clientWidth), false)
    const more=page.locator('.home-shelf-track[aria-label="Continue listening"] .card-more').first()
    await more.click()
    await page.getByRole('button',{name:'Play next',exact:true}).waitFor()
    await page.locator('.card-action-popover:popover-open').getByRole('button',{name:'Listen later',exact:true}).click()
    await page.getByRole('dialog',{name:'Make time for a good listen',exact:true}).waitFor()
    await page.getByRole('button',{name:'Close dialog',exact:true}).click()
    await more.click()
    await page.getByRole('button',{name:'Listening stats',exact:true}).click()
    await page.getByRole('img',{name:'Listening time over the last 30 days'}).waitFor()
    assert.equal(await page.locator('.listening-bar').count(),30)
    assert.equal(await page.locator('.listening-bar').evaluateAll(bs=>bs.some(b=>Number(b.getAttribute('height'))>0)),false,'Empty stats must not invent activity')
    await page.locator('.listening-breakdown>summary').click()
    await page.getByRole('checkbox',{name:'Show quiet days'}).check()
    await page.getByRole('table').waitFor()
    assert.equal(await page.locator('.breakdown-scroll tbody tr').count(),30)
    assert.equal(await page.locator('.workspace').evaluate(el=>el.scrollWidth>el.clientWidth),false,'Breakdown must fit the content column')
    if(width===1440)await page.screenshot({path:resolve(artifacts,'stats-empty.png')})
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
