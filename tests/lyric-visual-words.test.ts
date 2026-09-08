import {describe, expect, it} from 'vitest'
import {lyricVisualWords} from '../src/renderer/src/lyricVisualWords'
import {parseLrc} from '../src/shared/lyrics'

describe('Flow visual word fallback', () => {
  it('distributes a line by word length without modifying provider data', () => {
    const line = {time: 10, text: 'One  longer word'}
    const words = lyricVisualWords(line, 23, true)!
    expect(words).toEqual([
      {text: 'One  ', time: 10, end: 13},
      {text: 'longer ', time: 13, end: 19},
      {text: 'word', time: 19, end: 23},
    ])
    expect(line).toEqual({time: 10, text: 'One  longer word'})
  })
  it('preserves real timing, including timed multiword chunks and silent gaps', () => {
    const line = parseLrc('[00:10]<00:11>First two <00:14>last<00:15>')[0]
    expect(lyricVisualWords(line, 20, true)).toBe(line.words)
    expect(lyricVisualWords(line, 20, false)).toBe(line.words)
    expect(line.words?.[0].time).toBe(11)
    expect(line.words?.at(-1)?.end).toBe(15)
  })
  it('keeps the line sweep for other styles and invalid/empty intervals', () => {
    const line = {time: 10, text: 'Two words'}
    expect(lyricVisualWords(line, 20, false)).toBeUndefined()
    for (const end of [9, 10, NaN, Infinity]) expect(lyricVisualWords(line, end, true)).toBeUndefined()
    expect(lyricVisualWords({time: 0, text: '   '}, 10, true)).toBeUndefined()
  })
  it('retains Unicode, punctuation and whitespace and bounds every estimate', () => {
    for (const text of ['  तू साथ है,  ', 'তুমি পাশে আছো', 'こんにちは', 'A 🎵 moment']) {
      const words = lyricVisualWords({time: 2, text}, 7, true)!
      expect(words.map(word => word.text).join('')).toBe(text)
      expect(words[0].time).toBe(2)
      expect(words.at(-1)?.end).toBe(7)
      words.forEach((word, i) => {
        expect(word.end).toBeGreaterThan(word.time)
        if (i) expect(word.time).toBe(words[i - 1].end)
      })
    }
  })
})
