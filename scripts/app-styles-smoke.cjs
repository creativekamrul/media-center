// Current style catalog replaces the former independent theme/style matrix.
module.exports=async context=>{
 const original=await context.page.evaluate(()=>window.mediaCenter.preferences())
 try{await require('./consistency-pass-smoke.cjs')(context)}
 finally{await context.page.evaluate(p=>window.mediaCenter.savePreferences(p),original)}
}
