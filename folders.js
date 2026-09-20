function folderNames(){
  return [...new Set([...(Array.isArray(prefs.categories)?prefs.categories:[]),...items.map(i=>i.category)].filter(c=>typeof c==='string'&&c.trim()).map(c=>c.trim()))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function folderOptions(selected){
  return [''].concat(folderNames()).map(c=>'<option value="'+esc(c)+'" '+(c===selected?'selected':'')+'>'+esc(c||'Sem pasta')+'</option>').join('');
}
function folderCatalog(list){
  return [''].concat(folderNames()).map(c=>{
    const rows=list.filter(i=>(i.category||'').trim()===c),open=query||activeFolder===c;
    return '<section class="folder" data-folder="'+esc(c)+'"><div class="folderHeading"><button class="folderToggle" data-folder-open="'+esc(c)+'" aria-expanded="'+!!open+'">'+esc(c||'Sem pasta')+' <small>'+rows.length+'</small></button><button class="folderMore" data-folder-menu="'+esc(c)+'" aria-label="Opções da pasta '+esc(c||'Sem pasta')+'">⋯</button></div>'+
      (open?'<div class="folderContents">'+[false,true].map(p=>{const group=rows.filter(i=>i.produced===p);return group.length?'<div class="catalogType">'+(p?'Produzidos':'Comprados')+'</div>'+group.map(productButton).join(''):''}).join('')+(rows.length?'':'<p class="emptyFolder">Pasta vazia</p>')+'</div>':'')+'</section>';
  }).join('');
}
function createFolder(){
  const root=document.querySelector('#modalRoot');
  root.innerHTML='<div class="backdrop"><form class="modal" id="folderForm"><div class="modalHead"><h2>Nova pasta</h2><button type="button" class="close" aria-label="Fechar">×</button></div><label class="field"><span>Nome da pasta</span><input id="folderName" required maxlength="80" autocomplete="off"></label><p id="folderError" role="alert"></p><footer><button class="primary" type="submit">Criar pasta</button></footer></form></div>';
  root.querySelector('.close').onclick=()=>root.innerHTML='';
  root.querySelector('input').focus();
  root.querySelector('form').onsubmit=e=>{
    e.preventDefault();const name=root.querySelector('input').value.trim();
    if(!name||folderNames().some(c=>c.toLocaleLowerCase()===name.toLocaleLowerCase())){root.querySelector('#folderError').textContent='Escolha um nome diferente para a pasta.';return}
    prefs.categories=[...folderNames(),name];activeFolder=name;persist();root.innerHTML='';render();toast('Pasta criada');
  };
}
function moveItem(id,folder){
  const item=items.find(i=>i.id===id);if(!item)return;
  if(folder&&!folderNames().includes(folder))return;
  item.category=folder;activeFolder=folder;cutItemId=null;persist();render();toast('Item movido para '+(folder||'Sem pasta'));
}
function moveDialog(id){
  const item=items.find(i=>i.id===id);if(!item)return;
  const root=document.querySelector('#modalRoot');
  root.innerHTML='<div class="backdrop"><section class="modal"><div class="modalHead"><h2>Mover '+esc(item.name)+'</h2><button class="close" aria-label="Fechar">×</button></div><label class="field"><span>Pasta de destino</span><select id="moveDestination">'+folderOptions(item.category)+'</select></label><footer><button class="primary" id="moveConfirm">Mover</button></footer></section></div>';
  root.querySelector('.close').onclick=()=>root.innerHTML='';
  root.querySelector('#moveConfirm').onclick=()=>{moveItem(id,root.querySelector('select').value);root.innerHTML=''};
}
function confirmDeletion(title,message,onConfirm){
  closeCatalog();
  const root=document.querySelector('#modalRoot'),previous=document.activeElement;
  root.innerHTML='<div class="backdrop"><section class="modal" role="alertdialog" aria-modal="true" aria-labelledby="deleteTitle" aria-describedby="deleteMessage"><div class="modalHead"><h2 id="deleteTitle">'+esc(title)+'</h2><button class="close" aria-label="Cancelar">×</button></div><p id="deleteMessage">'+esc(message)+'</p><footer><button id="cancelDelete">Cancelar</button><button class="delete" id="confirmDelete">Excluir</button></footer></section></div>';
  const close=()=>{root.innerHTML='';previous?.focus()};
  root.querySelector('.close').onclick=root.querySelector('#cancelDelete').onclick=close;
  root.querySelector('#confirmDelete').onclick=()=>{root.innerHTML='';onConfirm()};
  root.querySelector('.modal').onkeydown=e=>{
    if(e.key==='Escape'){e.preventDefault();close()}
    if(e.key==='Tab'){
      const buttons=[...root.querySelectorAll('button')],first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  };
  root.querySelector('#cancelDelete').focus();
}
function deleteProduct(id){
  const item=items.find(i=>i.id===id);if(!item)return;
  const usedBy=items.filter(i=>i.id!==id&&i.recipe.some(p=>p.itemId===id));
  const message=usedBy.length
    ?'Este item será removido também das receitas: '+usedBy.map(i=>i.name).join(', ')+'. Os custos dessas receitas serão recalculados. Esta ação não pode ser desfeita.'
    :'O produto será excluído. Os ingredientes cadastrados separadamente serão mantidos. Esta ação não pode ser desfeita.';
  confirmDeletion('Excluir “'+item.name+'”?',message,()=>{
    items=items.filter(i=>i.id!==id);
    items.forEach(i=>{i.recipe=i.recipe.filter(p=>p.itemId!==id)});
    if(selectedId===id)selectedId=items[0]?.id||null;
    if(cutItemId===id)cutItemId=null;
    persist();render();toast('Produto excluído');
  });
}
function deleteFolder(folder){
  if(!folder)return;
  confirmDeletion('Excluir a pasta “'+folder+'”?','Somente a pasta será excluída. Os produtos dentro dela serão mantidos em “Sem pasta”.',()=>{
    prefs.categories=folderNames().filter(c=>c!==folder);
    items.forEach(i=>{if((i.category||'').trim()===folder)i.category=''});
    if(activeFolder===folder)activeFolder='';
    persist();render();toast('Pasta excluída. Produtos mantidos.');
  });
}
function closeFolderMenu(){document.querySelector('#folderContext')?.remove()}
function folderMenu(target,x,y){
  closeFolderMenu();
  const product=target.closest('.product'),folder=target.closest('[data-folder]')?.dataset.folder??'';
  const menu=document.createElement('div');menu.id='folderContext';menu.className='folderContext';menu.setAttribute('role','menu');
  function action(label,fn,disabled=false){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.setAttribute('role','menuitem');b.onclick=()=>{closeFolderMenu();fn()};menu.append(b)}
  if(product){
    const id=product.dataset.id;
    action('Recortar',()=>{cutItemId=id;toast('Item recortado. Abra uma pasta e escolha Colar.')});
    action('Mover para…',()=>moveDialog(id));
    action('Excluir produto',()=>deleteProduct(id));
  }else{
    action('Colar aqui',()=>moveItem(cutItemId,folder),!items.some(i=>i.id===cutItemId));
    action('Nova pasta',createFolder);
    if(folder)action('Excluir pasta',()=>deleteFolder(folder));
  }
  if(cutItemId)action('Cancelar recorte',()=>{cutItemId=null;toast('Recorte cancelado')});
  document.body.append(menu);
  menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';
  menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
  menu.querySelector('button:not(:disabled)')?.focus();
}
document.addEventListener('click',e=>{
  if(suppressFolderClick&&e.target.closest('#sidebar')){e.preventDefault();e.stopImmediatePropagation();suppressFolderClick=false;return}
  const more=e.target.closest('[data-folder-menu]');
  if(more){folderMenu(more,e.clientX,e.clientY);return}
  const toggle=e.target.closest('[data-folder-open]');
  if(toggle){activeFolder=activeFolder===toggle.dataset.folderOpen?null:toggle.dataset.folderOpen;render();return}
  if(!e.target.closest('#folderContext'))closeFolderMenu();
},true);
document.addEventListener('contextmenu',e=>{
  if(!e.target.closest('#catalog'))return;
  e.preventDefault();folderMenu(e.target,e.clientX,e.clientY);
});
let folderHold,folderStart;
document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'||!e.target.closest('#catalog'))return;
  suppressFolderClick=false;folderStart={x:e.clientX,y:e.clientY};
  folderHold=setTimeout(()=>{suppressFolderClick=true;folderMenu(e.target,e.clientX,e.clientY)},550);
});
document.addEventListener('pointermove',e=>{if(folderStart&&Math.hypot(e.clientX-folderStart.x,e.clientY-folderStart.y)>10)clearTimeout(folderHold)});
for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>{clearTimeout(folderHold);folderStart=null});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFolderMenu()});
