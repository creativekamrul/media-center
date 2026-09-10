import {z} from 'zod'

export const coverIdSchema=z.union([z.string().uuid(),z.string().regex(/^itunes:[1-9][0-9]{0,15}$/)])
/** Public album art only; never accept authenticated server or arbitrary image URLs. */
export function appleArtwork(value:string):string|undefined {
 try {
  const u=new URL(value)
  if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^is[1-5]-ssl\.mzstatic\.com$/.test(u.hostname)&&/^\/image\/thumb\/[A-Za-z0-9_./%-]+\/(?:100|600)x(?:100|600)bb\.jpg$/.test(u.pathname))return u.href
 }catch{}
}
export function coverSource(value:string):boolean {
 return Boolean(appleArtwork(value))||/^https:\/\/coverartarchive\.org\/release\/[0-9a-f-]{36}\/front-500$/i.test(value)
}
