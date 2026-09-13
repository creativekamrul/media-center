// Navigate through the visible views or their shared overflow menu.
module.exports=async(page,name,role='tab')=>{
 const nav=page.locator('.concise-tabs:visible'),target=nav.getByRole(role,{name,exact:true})
 if(!await target.isVisible())await nav.getByRole('button',{name:'More views',exact:true}).click()
 await target.click()
}
