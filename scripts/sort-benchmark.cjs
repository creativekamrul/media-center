const assert=require('node:assert/strict')
const {writeFileSync,mkdirSync}=require('node:fs')
const {performance}=require('node:perf_hooks')
const {resolve}=require('node:path')
const tracks=Array.from({length:15000},(_,i)=>`Song ${(i*7919)%15000} Artist ${i%71}`)
const measure=compare=>{const data=tracks.slice(),start=performance.now();data.sort(compare);return {ms:performance.now()-start,data}}
const before=measure((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}))
const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'})
const after=measure(collator.compare)
assert.deepEqual(after.data,before.data)
const result={tracks:tracks.length,beforeMs:Math.round(before.ms),afterMs:Math.round(after.ms),speedup:Number((before.ms/after.ms).toFixed(1)),sameOrder:true}
mkdirSync(resolve('artifacts'),{recursive:true});writeFileSync(resolve('artifacts','sort-benchmark.json'),JSON.stringify(result,null,2));console.log(result)
