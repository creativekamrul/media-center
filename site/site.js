const tabs=[...document.querySelectorAll('[role="tab"]')];
const panels=tabs.map(tab=>document.getElementById(tab.getAttribute('aria-controls')));
function selectTab(index,focus=false){
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;panels[i].setAttribute('role','tabpanel');panels[i].tabIndex=0});
  if(focus)tabs[index].focus();
}
document.querySelector('.gallery-tabs').hidden=false;
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectTab(index));
  tab.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();selectTab(next,true)});
});
selectTab(0);
const dialog=document.getElementById('image-dialog');
document.querySelectorAll('.zoom').forEach(button=>{button.hidden=false;button.addEventListener('click',()=>{const figure=button.closest('figure'),image=figure.querySelector('img'),preview=dialog.querySelector('img');preview.src=image.src;preview.alt=image.alt;dialog.querySelector('p').textContent=figure.querySelector('figcaption span').textContent;dialog.showModal()})});
dialog.querySelector('button').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
