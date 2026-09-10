import {readFile,writeFile,stat,realpath} from 'node:fs/promises'
import {basename,dirname,extname,isAbsolute,relative,resolve} from 'node:path'
import {dialog,type BrowserWindow} from 'electron'
import type {LocalFiles} from './local'
import type {LocalLibrary} from './local-library'
import type {Store} from './store'
import type {LocalPlaylist} from '../shared/local-library'
export async function playlistFile(input:{rootId:string;action:'import'|'export';id?:string},local:LocalFiles,index:LocalLibrary,store:Store,window:BrowserWindow){
 const root=local.roots().find(r=>r.id===input.rootId);if(!root)throw Error('Choose a local source.')
 if(input.action==='export'){
  const list=(store.get<LocalPlaylist[]>(`local-playlists:${root.id}`)??[]).find(p=>p.id===input.id);if(!list)throw Error('Choose a playlist.')
  const d=await dialog.showSaveDialog(window,{title:'Export local playlist',defaultPath:list.name.replace(/[<>:"/\\|?*]/g,'_')+'.m3u8',filters:[{name:'M3U playlist',extensions:['m3u8']}]});if(d.canceled||!d.filePath)return null
  const paths=await Promise.all(list.files.map(id=>local.path(root.id,id)))
  await writeFile(d.filePath,'#EXTM3U\n'+paths.map(p=>relative(dirname(d.filePath!),p)||basename(p)).join('\n')+'\n','utf8');return{name:list.name,count:paths.length}
 }
 const d=await dialog.showOpenDialog(window,{title:'Import local M3U playlist',properties:['openFile'],filters:[{name:'M3U playlists',extensions:['m3u','m3u8']}]});if(d.canceled||!d.filePaths[0])return null
 const path=d.filePaths[0];if(!['.m3u','.m3u8'].includes(extname(path).toLowerCase())||(await stat(path)).size>2*1024*1024)throw Error('Choose an M3U playlist up to 2 MB.')
 const raw=await readFile(path,'utf8');if(raw.includes('\0'))throw Error('The playlist is not valid text.')
 const lines=raw.replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));if(!lines.length||lines.length>5000)throw Error('Playlists support 1–5,000 tracks.')
 const rootPath=await realpath(root.path),files:string[]=[]
 for(const line of lines){if(/^[a-z]+:\/\//i.test(line))throw Error('Only local files inside the selected source can be imported.');const absolute=isAbsolute(line)?line:resolve(dirname(path),line);const id=relative(rootPath,absolute);await local.path(root.id,id);files.push(id)}
 const name=basename(path,extname(path)).slice(0,200);await index.playlist({action:'create',rootId:root.id,name,files});return{name,count:files.length}
}
