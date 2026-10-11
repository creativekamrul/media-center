import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({app:{},screen:{getCursorScreenPoint:vi.fn(),getDisplayMatching:()=>({scaleFactor:1})}}))
import {screen,type BrowserWindow} from 'electron'
import {VideoHost} from '../src/main/video-host'
describe('native video activity',()=>{
 it('ignores movement in another app and repeated stationary points',()=>{
  let focused=true
  const window={isDestroyed:()=>false,isFocused:()=>focused,getBounds:()=>({x:0,y:0,width:800,height:600}),getContentBounds:()=>({x:0,y:0,width:800,height:600}),getContentSize:()=>[800,600],webContents:{getZoomFactor:()=>1}} as unknown as BrowserWindow
  const host=new VideoHost(()=>window)
  host.update({x:0,y:0,width:800,height:600,visible:true})
  vi.mocked(screen.getCursorScreenPoint).mockReturnValue({x:100,y:100})
  expect(host.pointerActive()).toBe(true)
  expect(host.pointerActive()).toBe(false)
  focused=false;vi.mocked(screen.getCursorScreenPoint).mockReturnValue({x:200,y:200})
  expect(host.pointerActive()).toBe(false)
  focused=true;expect(host.pointerActive()).toBe(true)
  vi.mocked(screen.getCursorScreenPoint).mockReturnValue({x:1000,y:1000})
  expect(host.pointerActive()).toBe(false)
  host.update({x:0,y:0,width:800,height:600,visible:false})
  vi.mocked(screen.getCursorScreenPoint).mockReturnValue({x:100,y:100})
  expect(host.pointerActive()).toBe(false)
 })
})
