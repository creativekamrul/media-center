const assert = require('node:assert/strict')
const {mkdirSync,copyFileSync,writeFileSync} = require('node:fs')
const {resolve,join} = require('node:path')
const {spawn,spawnSync} = require('node:child_process')
const root=resolve('artifacts/installer-process-test'),sibling=root+'-sibling',app='Media Center.exe'
for(const directory of [root,sibling])mkdirSync(directory,{recursive:true})
const powershell=join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe')
const run=(directory,mode='Check')=>spawnSync(powershell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('build/installer-processes.ps1'),'-InstallDirectory',directory,'-ExecutableName',app,'-Mode',mode],{encoding:'utf8',windowsHide:true,timeout:25000})
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function main(){
  const empty=join(root,'fresh-'+Date.now());assert.equal(run(empty).status,0,'Fresh installs do not match other running processes')
  const blocked=join(root,'not-a-folder');writeFileSync(blocked,'fixture');const failure=run(blocked);assert.equal(failure.status,20);assert.match(failure.stdout,/could not prepare/)
  for(const directory of [root,sibling])copyFileSync(process.execPath,join(directory,app))
  const other=spawn(join(sibling,app),['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'})
  let ours
  try{
    await wait(350);assert.equal(run(root).status,0,'A sibling path sharing the prefix is not this installation')
    ours=spawn(join(root,app),['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'})
    await wait(350);assert.equal(run(root).status,10,'The exact installed executable is detected')
    const close=run(root,'Close');assert.equal(close.status,0,close.stdout+close.stderr)
    assert.equal(run(root).status,0);assert.doesNotThrow(()=>process.kill(other.pid,0),'Closing the installation preserves the sibling process')
    if(process.env.MEDIA_CENTER_NSIS_HARNESS){
      ours=spawn(join(root,app),['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});await wait(350)
      const result=spawnSync(process.env.MEDIA_CENTER_NSIS_HARNESS,[],{windowsHide:true,stdio:'ignore',timeout:30000});assert.equal(result.status,0,'Compiled NSIS hook succeeds');assert.equal(run(root).status,0,'32-bit NSIS detects and closes the 64-bit fixture through native PowerShell');assert.doesNotThrow(()=>process.kill(other.pid,0))
    }
    console.log('Installer checks passed: fresh folder, write failure, exact process path, sibling isolation and bounded close.')
  }finally{ours?.kill();other.kill()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
