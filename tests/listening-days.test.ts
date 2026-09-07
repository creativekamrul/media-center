import {describe,it,expect} from 'vitest'
import {listeningDays} from '../src/shared/listening-days'
describe('listening chart calendar',()=>{
  it('keeps a single listening day in its calendar slot, rather than stretching it over the month',()=>{
    const row={day:'2026-09-08',seconds:125,music:100,books:25,podcasts:0,local:0}
    const days=listeningDays([row],new Date(2026,8,8))
    expect(days).toHaveLength(30);expect(days[0].day).toBe('2026-08-10');expect(days[29]).toEqual(row)
    expect(days.slice(0,29).every(d=>d.seconds===0)).toBe(true)
  })
  it('fills empty and leap-year calendars without inventing listening time',()=>{
    const days=listeningDays([],new Date(2024,2,1))
    expect(days[0].day).toBe('2024-02-01');expect(days[28].day).toBe('2024-02-29')
    expect(new Set(days.map(d=>d.day)).size).toBe(30);expect(days.every(d=>d.seconds===0)).toBe(true)
  })
})
