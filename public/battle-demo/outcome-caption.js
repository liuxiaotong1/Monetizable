/** Keep result copy independently collapsible without interrupting the 3D scene. */
export function configureOutcomeCaption(panel,locale='en'){
 if(!panel||panel.querySelector('.outcome-caption-toggle'))return;
 const copy=({en:['Hide result message','Show result','Result message'],fr:['Réduire le message','Voir le résultat','Message de résultat'],zh:['收起结算文字','展开结果','结算信息']}[locale]||['Hide result message','Show result','Result message']);
 const heading=panel.querySelector('h2');if(heading&&!heading.id)heading.id='outcome-caption-heading';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='outcome-caption-toggle';if(heading)toggle.setAttribute('aria-controls',heading.id);
 const update=collapsed=>{panel.classList.toggle('is-collapsed',collapsed);toggle.textContent=collapsed?`✦ ${copy[1]}`:'−';toggle.setAttribute('aria-label',collapsed?copy[1]:copy[0]);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.title=collapsed?copy[1]:copy[0];};
 toggle.addEventListener('click',event=>{event.stopPropagation();update(!panel.classList.contains('is-collapsed'));});
 panel.setAttribute('aria-label',copy[2]);panel.append(toggle);update(false);
}
