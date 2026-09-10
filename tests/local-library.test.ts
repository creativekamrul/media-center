import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {mkdtemp,mkdir,writeFile,rm,symlink,unlink,rename} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {LocalFiles} from '../src/main/local'
import {LocalLibrary} from '../src/main/local-library'
import type {Store} from '../src/main/store'
import {localQuerySchema} from '../src/shared/local-library'
describe('Indexed local collection',()=>{
 let path:string,local:LocalFiles,library:LocalLibrary,values:Map<string,unknown>
 beforeEach(async()=>{path=await mkdtemp(join(tmpdir(),'media-library-test-'));values=new Map();const store={get:(k:string)=>values.get(k),set:(k:string,v:unknown)=>values.set(k,v),history:()=>[]} as unknown as Store;local=new LocalFiles(store);library=new LocalLibrary(store,local)})
 afterEach(async()=>{vi.restoreAllMocks();if(!path.startsWith(join(tmpdir(),'media-library-test-')))throw Error('Unexpected path');await rm(path,{recursive:true,force:true})})
 it('indexes nested tags, separates album artists, preserves track order and rescans removed files',async()=>{
  await mkdir(join(path,'Nested'));await writeFile(join(path,'Nested','one.mp3'),'fixture');await writeFile(join(path,'two.mp3'),'fixture')
  vi.spyOn(local,'metadata').mockImplementation(async(_root,id)=>({id,name:id,title:id,artist:id.includes('one')?'A':'B',album:'Same title',duration:60,size:7,modified:1,hasCover:false,trackNumber:1}))
  const root=await local.add(path),query=localQuerySchema.parse({rootId:root.id,view:'albums',page:0,search:''})
  const albums=await library.query(query);expect(albums.trackCount).toBe(2);expect(albums.groups).toHaveLength(2)
  const detail=await library.query({...query,group:albums.groups[0].id});expect(detail.tracks).toHaveLength(1)
  await unlink(join(path,'two.mp3'));expect((await library.query({...query,refresh:true})).trackCount).toBe(1)
 })
 it('keeps favorites and playlists source-specific and rejects traversal',async()=>{
  await writeFile(join(path,'one.wav'),'fixture');const root=await local.add(path);await library.favorite(root.id,'one.wav',true)
  await library.playlist({action:'create',rootId:root.id,name:'My list',files:['one.wav','one.wav']})
  const query=localQuerySchema.parse({rootId:root.id,view:'favorites',page:0,search:''});expect((await library.query(query)).tracks[0].favorite).toBe(true)
  const list=await library.query({...query,view:'playlists'});expect((await library.query({...query,view:'playlists',group:list.groups[0].id})).tracks).toHaveLength(2)
  await expect(library.playlist({action:'create',rootId:root.id,name:'Bad',files:['../outside.mp3']})).rejects.toThrow()
  local.remove(root.id);await expect(library.query(query)).rejects.toThrow('Choose a local source')
 })
 it('does not follow a directory junction outside the approved root or loop within it',async()=>{
  await mkdir(join(path,'allowed'));await mkdir(join(path,'outside'));await writeFile(join(path,'outside','private.wav'),'fixture');await writeFile(join(path,'allowed','own.wav'),'fixture')
  await symlink(join(path,'outside'),join(path,'allowed','escape'),'junction');await symlink(join(path,'allowed'),join(path,'allowed','loop'),'junction')
  const root=await local.add(join(path,'allowed'));const result=await library.query(localQuerySchema.parse({rootId:root.id,view:'songs',page:0,search:''}));expect(result.tracks.map(t=>t.id)).toEqual(['own.wav']);expect(result.warnings.length).toBeGreaterThan(0)
 })
 it('follows file identity after a rename and edits playlists without losing duplicate order',async()=>{
  await writeFile(join(path,'before.wav'),'fixture');const root=await local.add(path);await library.query(localQuerySchema.parse({rootId:root.id,view:'songs',page:0,search:''}));await library.favorite(root.id,'before.wav',true);await library.playlist({action:'create',rootId:root.id,name:'Old',files:['before.wav','before.wav']});await rename(join(path,'before.wav'),join(path,'after.wav'));await library.index(root.id,true);expect(values.get('local-favorites:'+root.id)).toEqual(['after.wav']);const lists=values.get('local-playlists:'+root.id) as {id:string;files:string[]}[];expect(lists[0].files).toEqual(['after.wav','after.wav']);await library.playlist({action:'update',rootId:root.id,id:lists[0].id,name:'New',files:['after.wav']});expect(values.get('local-playlists:'+root.id)).toEqual([{id:lists[0].id,name:'New',files:['after.wav']}])
 })

})
