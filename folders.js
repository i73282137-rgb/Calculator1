// Folder paths remain strings so existing backups and synchronization stay compatible.
const folderExpansion = new Map();
let copiedFolder = null;
const folderPalette={gray:'Cinza',rose:'Rosa',peach:'Pêssego',yellow:'Amarelo',mint:'Verde',blue:'Azul',lavender:'Lavanda'};
function folderColor(path){const c=prefs.folderColors?.[path];return Object.hasOwn(folderPalette,c)?c:'gray'}
function setFolderColor(path,color){
  if(!Object.hasOwn(folderPalette,color))return;
  prefs.folderColors={...(prefs.folderColors||{}),[path]:color};persist();render();
}
function chooseFolderColor(path){
  const root=document.querySelector('#modalRoot');
  root.innerHTML='<div class="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="colorTitle"><div class="modalHead"><h2 id="colorTitle">Cor de '+esc(folderLabel(path)||'Sem pasta')+'</h2><button class="close" aria-label="Fechar">×</button></div><div class="folderSwatches">'+Object.entries(folderPalette).map(([key,label])=>'<button type="button" class="folderSwatch" data-color="'+key+'" aria-pressed="'+(folderColor(path)===key)+'"><span aria-hidden="true"></span>'+label+'</button>').join('')+'</div></section></div>';
  const close=()=>root.innerHTML='';
  root.querySelector('.close').onclick=close;
  root.querySelector('.close').focus();
  root.querySelector('.modal').onkeydown=e=>{if(e.key==='Escape')close()};
  root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{setFolderColor(path,b.dataset.color);close()});
}
const folderParent = path => path.includes('/') ? path.slice(0,path.lastIndexOf('/')) : '';
const folderLabel = path => path.slice(path.lastIndexOf('/')+1);
const folderWithin = (path,parent) => path===parent || path.startsWith(parent+'/');
function folderNames(){
  const names=new Set();
  [...(Array.isArray(prefs.categories)?prefs.categories:[]),...items.map(i=>i.category)]
    .filter(c=>typeof c==='string'&&c.trim()).forEach(c=>{
      const parts=c.trim().split('/');
      for(let n=1;n<=parts.length;n++)names.add(parts.slice(0,n).join('/'));
    });
  return [...names].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function revealFolder(path){
  activeFolder=path;
  for(let p=path;p;p=folderParent(p))folderExpansion.set(p,true);
  if(!path)folderExpansion.set('',true);
}
function folderOptions(selected,rootLabel='Sem pasta',exclude=''){
  return [''].concat(folderNames().filter(c=>!exclude||!folderWithin(c,exclude)))
    .map(c=>'<option value="'+esc(c)+'" '+(c===selected?'selected':'')+'>'+esc(c?c.split('/').join(' › '):rootLabel)+'</option>').join('');
}
function folderCatalog(list){
  const names=folderNames();
  function branch(path,depth){
    const children=path===null?names.filter(c=>!folderParent(c)):names.filter(c=>folderParent(c)===path);
    if(path===null)return children.map(c=>branch(c,0)).join('');
    const rows=list.filter(i=>(i.category||'').trim()===path);
    const hasMatch=rows.length||list.some(i=>path&&folderWithin(i.category||'',path));
    if(query&&path&&!hasMatch)return '';
    const open=!!query||(folderExpansion.has(path)?folderExpansion.get(path):(activeFolder===path||!!(path&&activeFolder&&folderWithin(activeFolder,path))));
    const nested=path?children:[];
    return '<section class="folder '+(open?'is-open':'')+'" data-color="'+folderColor(path)+'" data-folder="'+esc(path)+'"><div class="folderHeading '+(activeFolder===path?'selectedFolder':'')+'">'+
      '<button class="folderToggle" data-folder-open="'+esc(path)+'" aria-expanded="'+!!open+'" title="'+esc(path||'Sem pasta')+'"><svg class="folderChevron" aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m7.5 5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="folderName">'+esc(path?folderLabel(path):'Sem pasta')+'</span><small>'+rows.length+'</small></button>'+
      '<button class="folderMore" data-folder-menu="'+esc(path)+'" aria-label="Opções de '+esc(path||'Sem pasta')+'">⋯</button></div>'+
      '<div class="folderReveal" '+(!open?'inert':'')+' aria-hidden="'+!open+'"><div class="folderClip"><div class="folderContents">'+rows.map(productButton).join('')+
      nested.map(c=>branch(c,depth+1)).join('')+(!rows.length&&!nested.length?'<p class="emptyFolder">Pasta vazia</p>':'')+'</div></div></div></section>';
  }
  return branch('',0)+branch(null,0);
}
function createFolder(parent=''){
  if(typeof parent!=='string')parent='';
  folderDialog(null,parent);
}
function renameFolder(path){folderDialog(path,folderParent(path))}
function folderDialog(original,parent){
  const root=document.querySelector('#modalRoot');
  root.innerHTML='<div class="backdrop"><form class="modal" id="folderForm" role="dialog" aria-modal="true" aria-labelledby="folderTitle"><div class="modalHead"><h2 id="folderTitle">'+(original?'Renomear pasta':parent?'Nova subpasta':'Nova pasta')+'</h2><button type="button" class="close" aria-label="Fechar">×</button></div>'+
    '<label class="field"><span>Nome da pasta</span><input id="folderName" required maxlength="80" autocomplete="off" value="'+esc(original?folderLabel(original):'')+'"></label>'+
    '<p id="folderError" role="alert"></p><footer><button type="button" class="cancel">Cancelar</button><button class="primary" type="submit">'+(original?'Salvar':'Criar pasta')+'</button></footer></form></div>';
  const close=()=>root.innerHTML='';
  root.querySelector('.close').onclick=root.querySelector('.cancel').onclick=close;
  root.querySelector('input').focus();
  root.querySelector('form').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close()}};
  root.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    try{
      const name=root.querySelector('#folderName').value.trim();
      const path=saveFolder(original,name,parent);
      close();render();toast(original?'Pasta atualizada':'Pasta criada');
    }catch(error){root.querySelector('#folderError').textContent=error.message}
  };
}
function saveFolder(original,name,parent){
  name=name.trim();
  if(!name||name.includes('/'))throw Error('Digite um nome sem a barra /.');
  const names=folderNames();
  if(parent&&!names.includes(parent))throw Error('A pasta de destino não existe mais.');
  if(original&&!names.includes(original))throw Error('Esta pasta não existe mais.');
  if(original&&parent&&folderWithin(parent,original))throw Error('Uma pasta não pode ficar dentro dela mesma.');
  const path=parent?parent+'/'+name:name;
  if(names.some(c=>c!==original&&c.toLocaleLowerCase()===path.toLocaleLowerCase()))throw Error('Já existe uma pasta com esse nome nesta localização.');
  const remap=p=>original&&folderWithin(p,original)?path+p.slice(original.length):p;
  prefs.categories=original?names.map(remap):[...names,path];
  if(original){
    prefs.folderColors=Object.fromEntries(Object.entries(prefs.folderColors||{}).map(([p,c])=>[remap(p),c]));
    items.forEach(i=>{i.category=remap(i.category||'')});
    const expansion=[...folderExpansion];folderExpansion.clear();
    expansion.forEach(([p,v])=>folderExpansion.set(remap(p),v));
  }
  revealFolder(path);persist();return path;
}
function moveItem(id,folder){
  const item=items.find(i=>i.id===id);if(!item)return;
  if(folder&&!folderNames().includes(folder))return;
  item.category=folder;revealFolder(folder);cutItemId=null;persist();render();toast('Item movido para '+(folder||'Sem pasta'));
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
  confirmDeletion('Excluir a pasta “'+folderLabel(folder)+'”?','Esta pasta e suas subpastas serão removidas. Todos os produtos serão mantidos em “Sem pasta”.',()=>{
    prefs.categories=folderNames().filter(c=>!folderWithin(c,folder));
    prefs.folderColors=Object.fromEntries(Object.entries(prefs.folderColors||{}).filter(([p])=>!folderWithin(p,folder)));
    items.forEach(i=>{if(folderWithin((i.category||'').trim(),folder))i.category=''});
    for(const path of folderExpansion.keys())if(folderWithin(path,folder))folderExpansion.delete(path);
    if(activeFolder&&folderWithin(activeFolder,folder))revealFolder('');
    persist();render();toast('Pastas excluídas. Produtos mantidos.');
  });
}
function copyFolder(path){
  if(!path||!folderNames().includes(path))return;
  copiedFolder={
    root:path,
    paths:folderNames().filter(c=>folderWithin(c,path)),
    colors:Object.fromEntries(Object.entries(prefs.folderColors||{}).filter(([p])=>folderWithin(p,path))),
    products:structuredClone(items.filter(i=>folderWithin(i.category||'',path)))
  };
  toast('Pasta copiada. Abra o menu do destino e escolha Colar pasta.');
}
function pasteFolder(parent=''){
  if(!copiedFolder)return;
  const names=folderNames();
  if(parent&&!names.includes(parent))throw Error('A pasta de destino não existe mais.');
  const base=folderLabel(copiedFolder.root),prefix=parent?parent+'/':'';
  let path=prefix+base,n=1;
  while(names.some(c=>c.toLocaleLowerCase()===path.toLocaleLowerCase())){
    path=prefix+base+(n===1?' (cópia)':' (cópia '+n+')');n++;
  }
  const remap=p=>path+p.slice(copiedFolder.root.length);
  const ids=new Map(copiedFolder.products.map(i=>[i.id,crypto.randomUUID()]));
  const products=structuredClone(copiedFolder.products).map(i=>({
    ...i,id:ids.get(i.id),category:remap(i.category),
    recipe:(i.recipe||[]).map(p=>({...p,itemId:ids.get(p.itemId)||p.itemId}))
  }));
  if(products.some(i=>i.recipe.some(p=>!ids.has(p.itemId)&&!products.some(x=>x.id===p.itemId)&&!items.some(x=>x.id===p.itemId))))
    throw Error('Um ingrediente externo foi excluído depois da cópia. Copie a pasta novamente.');
  prefs.categories=[...names,...copiedFolder.paths.map(remap)];
  prefs.folderColors={...(prefs.folderColors||{}),...Object.fromEntries(Object.entries(copiedFolder.colors||{}).map(([p,c])=>[remap(p),c]))};
  items.push(...products);revealFolder(path);persist();render();toast('Pasta colada');
  return path;
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
    action('Subpasta',()=>createFolder(folder));
    if(folder)action('Renomear pasta',()=>renameFolder(folder));
    action('Cor da pasta',()=>chooseFolderColor(folder));
    if(folder)action('Copiar pasta',()=>copyFolder(folder));
    action('Colar pasta',()=>{try{pasteFolder(folder)}catch(error){toast(error.message)}},!copiedFolder);
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
  if(toggle){
    const path=toggle.dataset.folderOpen,open=toggle.getAttribute('aria-expanded')!=='true';
    folderExpansion.set(path,open);activeFolder=path;
    const section=toggle.closest('.folder'),reveal=section.querySelector(':scope > .folderReveal');
    toggle.setAttribute('aria-expanded',String(open));section.classList.toggle('is-open',open);
    reveal.inert=!open;reveal.setAttribute('aria-hidden',String(!open));
    document.querySelectorAll('.selectedFolder').forEach(h=>h.classList.remove('selectedFolder'));
    toggle.closest('.folderHeading').classList.add('selectedFolder');
    return;
  }
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
