import {describe,it,expect,vi} from 'vitest'
vi.mock('../src/main/store',()=>({Store:class{}}))
import {presence,defaultDiscordArtwork,discordDefaults,discordSchema,publicArtwork,rpcFrame} from '../src/main/discord'
import {emptyPlayback} from '../src/shared/types'
describe('Discord presence privacy and artwork',()=>{
  const playing={...emptyPlayback,status:'playing' as const,kind:'music-track' as const,title:'Track',subtitle:'Artist',position:30,duration:300,speed:1.5}
  const settings={...discordDefaults,enabled:true,applicationId:'123456789012345678'}
  it('requires opt-in for each media kind and hides idle and disabled activity',()=>{
    expect(presence(playing,discordDefaults)).toBeNull();expect(presence({...playing,kind:'audiobook'},settings)).toBeNull();expect(presence({...playing,kind:'podcast-episode'},settings)).toBeNull();expect(presence({...playing,kind:'local-file'},settings)).toBeNull();expect(presence({...playing,status:'idle'},settings)).toBeNull();expect(presence({...playing,status:'paused'},{...settings,showPaused:false})).toBeNull()
  })
  it('includes speed-adjusted timestamps while playing and omits them when paused or buffering',()=>{
    expect(presence(playing,settings,undefined,1000000)?.timestamps).toEqual({start:980,end:1180})
    expect(presence({...playing,status:'paused'},settings)?.timestamps).toBeUndefined();expect(presence({...playing,buffering:true},settings)?.timestamps).toBeUndefined()
  })
  it('only sends public Last.fm CDN artwork, never credentials or arbitrary server URLs',()=>{
    const art='https://lastfm.freetls.fastly.net/i/u/300x300/cover.png'
    expect(publicArtwork(art)).toBe(art);expect(presence(playing,settings,art)?.assets?.large_image).toBe(art)
    for(const url of ['https://private.test/cover?token=secret','file:///C:/music/cover.jpg','http://lastfm.freetls.fastly.net/image','https://lastfm.freetls.fastly.net/image?token=secret','https://user:pass@lastfm.freetls.fastly.net/image','https://lastfm.freetls.fastly.net.attacker.test/image']){expect(publicArtwork(url)).toBeUndefined();expect(presence(playing,settings,url)?.assets?.large_image).toBe(defaultDiscordArtwork)}
  })
  it('sends the current Last.fm CDN cover while rejecting lookalike hosts and unsafe URL variants',()=>{
    const art='https://lastfm-img.freetls.fastly.net/i/u/300x300/98a9460a6ebe178b5524ac41d5bbfda4.jpg'
    expect(presence(playing,settings,art)?.assets?.large_image).toBe(art)
    for(const url of [
      art.replace('https:','http:'),art.replace('.net/','.net.attacker.test/'),
      art.replace('lastfm-img.','other.'),art.replace('https://','https://user:pass@'),
      art.replace('.net/','.net:444/'),art+'?token=secret',art+'#fragment',
      art.replace('98a9460a6ebe178b5524ac41d5bbfda4','2a96cbd8b46e442fc41c2b86b821562f')
    ])expect(presence(playing,settings,url)?.assets?.large_image).toBe(defaultDiscordArtwork)
  })
  it('validates configuration without accepting a bot token',()=>{
    const {hasLastfmKey:_,...base}=discordDefaults
    expect(discordSchema.safeParse(base).success).toBe(true);expect(discordSchema.safeParse({...base,enabled:true}).success).toBe(false);expect(discordSchema.safeParse({...base,applicationId:'abc'}).success).toBe(false);expect(discordSchema.safeParse({...base,botToken:'no'}).success).toBe(false)
  })
  it('automatically supplies a public default for shared music without an API key or uploaded asset',()=>{
    for(const legacy of [undefined,false,true])expect(presence(playing,{...settings,defaultCoverAsset:legacy})?.assets?.large_image).toBe(defaultDiscordArtwork)
    expect(presence({...playing,kind:'local-file'},{...settings,local:true})?.assets?.large_image).toBe(defaultDiscordArtwork)
    expect(presence({...playing,kind:'audiobook'},{...settings,books:true})?.assets).toBeUndefined()
    expect(presence({...playing,kind:'podcast-episode'},{...settings,podcasts:true})?.assets).toBeUndefined()
    expect(presence({...playing,privateListening:true},settings)).toBeNull()
  })
  it('encodes little-endian IPC frames using byte length for Unicode titles',()=>{
    const value={title:'音楽'},frame=rpcFrame(1,value);expect(frame.readUInt32LE(0)).toBe(1);expect(frame.readUInt32LE(4)).toBe(Buffer.byteLength(JSON.stringify(value)));expect(JSON.parse(frame.subarray(8).toString())).toEqual(value)
  })
})
