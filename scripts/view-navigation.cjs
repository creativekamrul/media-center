// Pin a hidden view through the real customization dialog, then navigate to it.
module.exports=async(page,name,role='tab')=>{
 const nav=page.locator('.concise-tabs:visible'),target=nav.getByRole(role,{name,exact:true})
 if(!await target.count()){
  await nav.getByRole('button',{name:/^Customize (views|tools)$/}).click()
  const dialog=page.getByRole('dialog',{name:/^Customize (views|tools)$/})
  await dialog.getByRole('checkbox',{name:`Pin ${name}`,exact:true}).check()
  await dialog.getByRole('button',{name:'Save tabs',exact:true}).click()
  await dialog.waitFor({state:'hidden'})
 }
 await target.click()
}
