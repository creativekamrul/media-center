import {afterEach,describe,it,expect,vi} from 'vitest'
import {CreatorPageCache} from '../src/main/creator-page-cache'
afterEach(()=>vi.useRealTimers())
describe('Creator library read cache',()=>{
 it('shares concurrent author/narrator scans but separates account/library/page keys',async()=>{const cache=new CreatorPageCache<string>(),load=vi.fn(async()=> 'books');await Promise.all([cache.get('account-a:books:0',load),cache.get('account-a:books:0',load)]);expect(load).toHaveBeenCalledTimes(1);await cache.get('account-b:books:0',load);await cache.get('account-a:other:0',load);await cache.get('account-a:books:1',load);expect(load).toHaveBeenCalledTimes(4)})
 it('does not cache a failed read, allowing immediate explicit retry',async()=>{const cache=new CreatorPageCache<string>(),load=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue('online');await expect(cache.get('books',load)).rejects.toThrow('offline');expect(await cache.get('books',load)).toBe('online');expect(load).toHaveBeenCalledTimes(2)})
 it('expires metadata and bounds retained pages',async()=>{vi.useFakeTimers();const cache=new CreatorPageCache<string>(1000,2),load=vi.fn(async()=> 'books');await cache.get('a',load);vi.advanceTimersByTime(1001);await cache.get('a',load);expect(load).toHaveBeenCalledTimes(2);await cache.get('b',load);await cache.get('c',load);await cache.get('a',load);expect(load).toHaveBeenCalledTimes(5)})
})
