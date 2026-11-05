import {describe,expect,it} from 'vitest'
import {VisualPlayhead} from '../src/renderer/src/visual-playhead'

describe('Renderer visual playhead',()=>{
 it.each([{kind:'music',speed:1},{kind:'book',speed:1.5},{kind:'podcast',speed:2}])('interpolates $kind between telemetry samples at its playback speed',({speed})=>{
  const clock=new VisualPlayhead()
  clock.sample(10,speed,true,0)
  expect(clock.at(16)).toBeCloseTo(10+.016*speed)
  expect(clock.at(125)).toBeCloseTo(10+.125*speed)
  clock.sample(10+.25*speed,speed,true,250)
  expect(clock.at(266)).toBeCloseTo(10+.266*speed)
 })
 it('smooths small sample jitter but snaps forward and backward seeks',()=>{
  const clock=new VisualPlayhead()
  clock.sample(10,1,true,0)
  clock.sample(10.23,1,true,250)
  expect(clock.at(250)).toBeCloseTo(10.25)
  expect(clock.at(400)).toBeCloseTo(10.38)
  clock.sample(50,1,true,500);expect(clock.at(500)).toBe(50)
  clock.sample(2,1,true,600);expect(clock.at(600)).toBe(2)
 })
 it('stops immediately when paused or buffering and resumes from the new sample',()=>{
  const clock=new VisualPlayhead()
  clock.sample(10,1,true,0)
  clock.sample(10.1,1,false,100)
  expect(clock.at(5000)).toBe(10.1)
  clock.sample(10.1,2,true,5000)
  expect(clock.at(5250)).toBeCloseTo(10.6)
 })
 it('bounds extrapolation when telemetry stalls or a background tab wakes',()=>{
  const clock=new VisualPlayhead()
  clock.sample(10,1,true,0)
  expect(clock.at(750)).toBe(10.75)
  expect(clock.at(60000)).toBe(10.75)
  clock.sample(70,1,true,60000)
  expect(clock.at(60000)).toBe(70)
 })
})
