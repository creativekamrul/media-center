import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {join} from 'node:path'
import {installedFontNameSchema} from '../shared/appearance'

const run=promisify(execFile)
let pending:Promise<string[]>|undefined
// Fixed, read-only Windows query. Only validated family names cross the bridge.
const script=`[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Drawing
$fontCollection = New-Object System.Drawing.Text.InstalledFontCollection
try { ConvertTo-Json -Compress -InputObject @($fontCollection.Families | ForEach-Object { $_.Name } | Sort-Object -Unique) } finally { $fontCollection.Dispose() }`
export function parseInstalledFonts(output:string):string[]{
 const parsed:unknown=JSON.parse(output.replace(/^\uFEFF/,''))
 if(!Array.isArray(parsed)||parsed.length>4096)throw new Error('Invalid font list')
 return [...new Set(parsed.flatMap(value=>{const result=installedFontNameSchema.safeParse(value);return result.success?[result.data]:[]}))].sort((a,b)=>a.localeCompare(b))
}
export async function installedFonts():Promise<string[]>{
 if(process.platform!=='win32')return []
 if(!pending)pending=(async()=>{
  try{
   const {stdout}=await run(join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:15000,maxBuffer:1024*1024,encoding:'utf8'})
   return parseInstalledFonts(stdout)
  }catch{pending=undefined;throw new Error('Installed fonts could not be read. You can still choose a font preset.')}
 })()
 return pending
}
