import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {networkInterfaces} from 'node:os'

// Serve only the exported review file, including when previewing on a phone.
const html=await readFile(new URL('./dist/Media-Center-Mobile.html',import.meta.url))
const lan=process.argv.includes('--lan')
const port=4173
const server=createServer((request,response)=>{
  if(request.url!=='/'||!['GET','HEAD'].includes(request.method)){
    response.writeHead(404).end()
    return
  }
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'})
  response.end(request.method==='HEAD'?undefined:html)
})
server.on('error',error=>{console.error(error.message);process.exitCode=1})
server.listen(port,lan?'0.0.0.0':'127.0.0.1',()=>{
  console.log('Desktop preview: http://127.0.0.1:'+port)
  if(lan)for(const entries of Object.values(networkInterfaces())){
    for(const address of entries??[])if(!address.internal&&address.family==='IPv4'){
      console.log('Phone on the same network: http://'+address.address+':'+port)
    }
  }
})
