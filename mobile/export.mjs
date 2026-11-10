// A review copy that can be opened from disk without a server or SDK.
import {readFileSync,writeFileSync} from 'node:fs'
const dir=new URL('./dist/',import.meta.url)
const read=path=>readFileSync(new URL(path,dir),'utf8')
let html=read('index.html')
html=html.replace(/<script[^>]* src="([^"]+)"[^>]*><\/script>/,(_,path)=>'<script type="module">'+read(path).replace(/<\/script/gi,'<\\/script')+'</script>')
html=html.replace(/<link[^>]* rel="stylesheet"[^>]* href="([^"]+)"[^>]*>/,(_,path)=>'<style>'+read(path)+'</style>')
for(const family of ['dm-sans','sora']){
  const license=readFileSync(new URL('../node_modules/@fontsource-variable/'+family+'/LICENSE',import.meta.url),'utf8')
  html=html.replace('</head>',()=>'<script type="text/plain" data-font-license="'+family+'">'+license+'</script></head>')
}
writeFileSync(new URL('Media-Center-Mobile.html',dir),html)
