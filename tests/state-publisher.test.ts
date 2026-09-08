import {afterEach,describe,expect,it,vi} from 'vitest'
import {StatePublisher} from '../src/main/state-publisher'
afterEach(()=>vi.useRealTimers())
describe('Playback telemetry coalescing',()=>{
  it('limits a continuous burst and guarantees a trailing snapshot of the latest value',()=>{
    vi.useFakeTimers();let position=0
    const snapshots:number[]=[],publisher=new StatePublisher(()=>snapshots.push(position))
    for(let i=0;i<100;i++){position=i;publisher.publish(true);vi.advanceTimersByTime(10)}
    expect(snapshots).toEqual([0,24,49,74,99])
    position=101;publisher.publish(true);vi.advanceTimersByTime(249);expect(snapshots.at(-1)).toBe(99)
    vi.advanceTimersByTime(1);expect(snapshots.at(-1)).toBe(101)
  })
  it('publishes commands/errors immediately and cancels redundant pending snapshots',()=>{
    vi.useFakeTimers();const emit=vi.fn(),publisher=new StatePublisher(emit)
    publisher.publish(true);vi.advanceTimersByTime(10);publisher.publish(true);publisher.publish()
    expect(emit).toHaveBeenCalledTimes(2);vi.advanceTimersByTime(250);expect(emit).toHaveBeenCalledTimes(2)
    publisher.publish(true);publisher.publish(true);publisher.cancel();vi.advanceTimersByTime(250);expect(emit).toHaveBeenCalledTimes(3)
  })
})
