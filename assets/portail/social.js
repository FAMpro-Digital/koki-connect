(function(){'use strict';
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const button=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b;};
 const api=args=>{if(!window.KokiSocialAPI)return Promise.reject(Error('Chargement en cours. Réessayez.'));return window.KokiSocialAPI(args);};
 function error(host,e){host.replaceChildren(node('span',e.message));if(e.code==='LOGIN')host.append(button('Me connecter',()=>window.KokiPortail.profil()));}
 function publish(id,data){document.querySelectorAll('[data-social-like]').forEach(b=>{if(b.dataset.socialLike===id){b.textContent=(data.liked?'♥':'♡')+' J’aime · '+data.likes;b.setAttribute('aria-pressed',String(data.liked));}});}
 let summaryTimer;const summaryIds=new Set();
 function scheduleSummary(id){summaryIds.add(id);clearTimeout(summaryTimer);summaryTimer=setTimeout(async()=>{const ids=[...summaryIds];summaryIds.clear();for(let i=0;i<ids.length;i+=50){try{const rows=await window.KokiSocialSummary?.(ids.slice(i,i+50));for(const row of rows||[])publish(row.id,row);}catch{/* Une lecture échouée ne bloque pas les actions. */}}},80);}
 window.addEventListener('koki-auth-changed',()=>document.querySelectorAll('[data-social-like]').forEach(b=>scheduleSummary(b.dataset.socialLike)));
 function actions(x,open){
  const host=node('div');host.className='publication-actions';const status=node('span');status.setAttribute('role','status');
  const like=button('♡ J’aime',async()=>{like.disabled=true;status.replaceChildren();try{const current=await api({p_content:x.id});const data=await api({p_content:x.id,p_action:'like',p_liked:!current.liked});publish(x.id,data);}catch(e){error(status,e);}finally{like.disabled=false;}});like.dataset.socialLike=x.id;like.setAttribute('aria-pressed','false');
  host.append(like,button('💬 Commenter',open),status);scheduleSummary(x.id);return host;
 }
 async function comments(x,host){
  host.className='publication-comments';host.append(node('h3','Commentaires'));
  const status=node('p');status.setAttribute('role','status');
  const list=node('div'),form=node('form'),label=node('label','Votre commentaire'),input=node('textarea');
  input.id='commentaire-'+x.id;label.htmlFor=input.id;input.maxLength=2000;input.required=true;input.rows=3;input.placeholder='Partagez votre avis avec respect…';
  const submit=node('button','Publier');submit.type='submit';
  form.append(label,input,node('p','Votre commentaire sera public. Votre adresse e-mail ne sera pas affichée.'),submit);
  const more=button('Voir les commentaires précédents',()=>load(true));more.hidden=true;
  host.append(list,more,form,status);let offset=0;
  const render=(data,append=false)=>{publish(x.id,data);if(!append){list.replaceChildren();offset=0;}for(const row of data.comments){const article=node('article');article.append(node('strong',row.mine?'Vous':'Membre Koki Connect'),node('time',new Date(row.created_at).toLocaleString('fr-FR')),node('p',row.body));if(row.mine)article.append(button('Supprimer mon commentaire',async event=>{event.currentTarget.disabled=true;try{const fresh=await api({p_content:x.id,p_action:'delete',p_comment:row.id});render(fresh);}catch(e){error(status,e);event.target.disabled=false;}}));article.append(button('Signaler',async()=>{const reason=window.prompt('Pourquoi signalez-vous ce commentaire ? (3 à 500 caractères)');if(reason===null)return;if(reason.trim().length<3||reason.trim().length>500){status.textContent='Indiquez un motif de 3 à 500 caractères.';return;}try{await api({p_content:x.id,p_action:'report',p_comment:row.id,p_text:reason.trim()});status.textContent='Signalement transmis à la modération.';}catch(e){error(status,e);}}));list.append(article);}offset+=data.comments.length;if(!data.total)list.append(node('p','Aucun commentaire pour le moment.'));more.hidden=offset>=data.total;};
  async function load(append=false){more.disabled=true;try{render(await api({p_content:x.id,p_offset:append?offset:0}),append);}catch(e){error(status,e);status.append(button('Réessayer',()=>load(append)));}finally{more.disabled=false;}}
  form.onsubmit=async event=>{event.preventDefault();if(!input.value.trim())return;submit.disabled=true;status.replaceChildren();try{const data=await api({p_content:x.id,p_action:'comment',p_text:input.value.trim()});input.value='';render(data);status.textContent='Commentaire publié.';}catch(e){error(status,e);}finally{submit.disabled=false;}};
  await load();
 }
 function zoom(img){const dialog=node('dialog');dialog.className='publication-photo';dialog.setAttribute('aria-label','Photo en grand');const copy=node('img');copy.src=img.src;copy.alt=img.alt;if(img.dataset.imagePath)copy.onerror=async()=>{copy.onerror=null;try{const url=await window.KokiPublicFeed.renouvelerImage(img.dataset.imagePath);if(url)copy.src=url;}catch{}};const close=button('Fermer la photo',()=>dialog.close());dialog.append(close,copy);dialog.addEventListener('close',()=>dialog.remove());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});document.body.append(dialog);dialog.showModal();close.focus();}
 window.KokiSocial={actions,comments,zoom};
})();
