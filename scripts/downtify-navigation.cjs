// Exercise the visible Listening Room routes instead of bypassing navigation state.
module.exports=page=>async function navigate(name){
 const drawer=page.locator('.dt-drawer-host').filter({has:page.getByRole('heading',{name:'Library care',exact:true})});
 if(await drawer.count())await drawer.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('navigation',{name:'Downtify views'}).getByRole('button',{name:'Listening room',exact:true}).click();
 if(['Songs','Albums','Artists','Playlists'].includes(name)){
  await page.getByRole('navigation',{name:'Downtify destinations'}).getByRole('button',{name:'Your collection',exact:false}).click();
  await page.getByRole('button',{name:'Browse '+name,exact:true}).click();
 }else if(name==='Discover')await page.getByRole('button',{name:'Browse discovery',exact:true}).click();
 else if(name==='Manage'||name==='Downloads'){
  await page.getByRole('button',{name:'Downtify tools',exact:true}).click();
  await page.getByRole('button',{name:name==='Manage'?'Library care':'Server downloads',exact:true}).click();
 }else if(name!=='Home')await page.getByRole('navigation',{name:'Downtify destinations'}).getByRole('button',{name:name==='Monitor'?'Following':name,exact:false}).click();
};
