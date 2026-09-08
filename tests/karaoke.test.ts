import {describe,it,expect} from 'vitest'
import {parseLrc,lyricFill} from '../src/shared/lyrics'
describe('Enhanced LRC timing',()=>{
  it('keeps real word timing and extends the final word to the next line',()=>{
    const lines=parseLrc('[00:10]<00:10>First <00:11.50>word\n[00:15]Next line')
    expect(lines[0].text).toBe('First word')
    expect(lines[0].words).toEqual([{time:10,end:11.5,text:'First '},{time:11.5,end:15,text:'word'}])
  })
  it('uses a single inline tag as a line offset without making up words',()=>{
    expect(parseLrc('[00:10]<00:11.25>A whole line')[0]).toEqual({time:11.25,text:'A whole line'})
  })
  it('preserves explicit final boundaries, repeats, and metadata offsets',()=>{
    const lines=parseLrc('[offset:-500]\n[00:10][00:20]<00:10>One <00:11>two<00:12>\n[00:25]Next')
    expect(lines[0].words?.at(-1)).toEqual({time:10.5,end:11.5,text:'two'})
    expect(lines[1].words?.at(-1)).toEqual({time:20.5,end:21.5,text:'two'})
  })
  it('falls back to a line sweep for malformed or absent word timing',()=>{
    expect(parseLrc('[00:10]<00:12>Wrong <00:11>order')[0].words).toBeUndefined()
    expect(parseLrc('[00:10]Plain line')[0].words).toBeUndefined()
    expect(lyricFill(12,10,14)).toBe(50);expect(lyricFill(9,10,14)).toBe(0);expect(lyricFill(15,10,14)).toBe(100)
    expect(lyricFill(10,10,10)).toBe(100)
  })
})
