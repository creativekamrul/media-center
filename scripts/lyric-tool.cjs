module.exports=async(page,name)=>{
 const button=page.getByRole('button',{name,exact:true})
 if(!await button.isVisible())await page.getByRole('button',{name:'Lyrics tools',exact:true}).click()
 await button.click()
}
