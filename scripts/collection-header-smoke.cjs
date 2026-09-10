const assert = require('node:assert/strict')
const {resolve} = require('node:path')
module.exports = async (page,artifacts,name) => {
  const previous=page.viewportSize()
  for(const width of [1008,1440,1920]) {
    await page.setViewportSize({width,height:940})
    const hero=page.locator('.detail-hero').first()
    await hero.scrollIntoViewIfNeeded()
    assert.ok(await hero.locator('.action-label').evaluateAll(labels=>labels.every(el=>getComputedStyle(el).display!=='none')),'Header action labels remain visible at every width')
    await page.waitForFunction(()=>{const card=document.querySelector('.detail-hero'),art=card.querySelector(':scope > .art'),copy=card.querySelector('.detail-heading');return card.dataset.stacked==='true'||Math.abs(art.getBoundingClientRect().height-copy.getBoundingClientRect().height)<2})
    const art=await hero.locator(':scope > .art').boundingBox()
    assert.ok(Math.abs(art.width-art.height)<1,'Collection artwork frame stays square')
    const frame=await hero.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {top:r.top+parseFloat(s.borderTopWidth)+parseFloat(s.paddingTop),bottom:r.bottom-parseFloat(s.borderBottomWidth)-parseFloat(s.paddingBottom)}})
    const copy=await hero.locator('.detail-heading').boundingBox()
    assert.ok(Math.abs(art.y-frame.top)<2&&Math.abs(art.y+art.height-frame.bottom)<2,'Square artwork fills the entire inner header height')
    assert.ok(copy.x>=art.x+art.width+16,'Growing artwork cannot overlap the title or controls')
    assert.equal(await hero.evaluate(el=>el.scrollWidth>el.clientWidth),false,'Header has no horizontal overflow')
    const rows=await hero.locator('.detail-heading > .listen-actions, .detail-heading > .collection-management, .detail-heading > .local-playlist-management').evaluateAll(groups=>groups.map(group=>({bounds:group.getBoundingClientRect().toJSON(),buttons:[...group.children].filter(b=>b.tagName==='BUTTON').map(b=>b.getBoundingClientRect().toJSON())})))
    for(const {bounds,buttons} of rows) {
      const lines=new Map()
      for(const b of buttons) {const y=Math.round(b.y);if(!lines.has(y))lines.set(y,[]);lines.get(y).push(b);assert.ok(b.height>=42,'Header buttons keep usable targets')}
      for(const line of lines.values()) {
        assert.ok(Math.abs(line[0].left-bounds.left)<2,'Action row starts at the content edge')
        assert.ok(Math.abs(line.at(-1).right-bounds.right)<2,'Action row fills the available width')
      }
    }
    assert.ok((await hero.boundingBox()).height<520,'Responsive header remains compact')
    assert.equal(await page.locator('.workspace').evaluate(el=>el.scrollWidth>el.clientWidth),false)
    await page.screenshot({path:resolve(artifacts,`${name}-header-${width}.png`)})
  }
  await page.setViewportSize(previous)
}
