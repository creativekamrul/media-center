import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalFiles, within } from '../src/main/local'
import type { Store } from '../src/main/store'
describe('read-only local folder source', () => {
  let root: string, local: LocalFiles
  beforeEach(async()=>{ root=await mkdtemp(join(tmpdir(),'media-center-local-')); const values=new Map(); local=new LocalFiles({get:(k:string)=>values.get(k),set:(k:string,v:unknown)=>values.set(k,v)} as unknown as Store) })
  afterEach(async()=>{ if (!root.startsWith(join(tmpdir(),'media-center-local-'))) throw Error('Unexpected test path'); await rm(root,{recursive:true,force:true}) })
  it('preserves folder structure, reads WAV format, and leaves media untouched',async()=>{
    await mkdir(join(root,'Album')); const wav=Buffer.alloc(44+192000); wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(192000,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(192000,40); await writeFile(join(root,'Album','01.wav'),wav); await writeFile(join(root,'notes.txt'),'not audio')
    const r=await local.add(root), top=await local.browse(r.id,'');expect(top.folders.map(f=>f.name)).toEqual(['Album']);expect(top.files).toHaveLength(0)
    const album=await local.browse(r.id,'Album');expect(album.files[0]).toMatchObject({name:'01.wav',duration:1,sampleRate:48000,bitDepth:16,size:wav.length});expect(album.files[0].error).toBeUndefined();local.remove(r.id);await expect(local.path(r.id,'Album/01.wav')).rejects.toThrow(/removed/)
  })
  it('rejects traversal, absolute paths, and sibling prefix tricks',async()=>{const r=await local.add(root);await expect(local.path(r.id,'../outside.mp3')).rejects.toThrow(/outside/);await expect(local.path(r.id,join(root,'test.mp3'))).rejects.toThrow(/Invalid/);expect(within(root,root+'-sibling')).toBe(false)})
})
