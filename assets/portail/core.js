(function(r){'use strict';
const types=['Actualités','Annonces','Publicités','Opportunités','Sports & ASC','Événements'];
const categories=['Actualité générale','Éducation','Sport','Jeunesse','Économie','Agriculture/élevage','Santé','Religion','Culture','Vie communautaire','Communiqué','Petite annonce','Avis important','Décès et cérémonies','Coupure eau/électricité','Objet perdu/trouvé','Emploi','Stage','Formation','Concours','Bourse','Financement','Appel à projets','Match à venir','Résultat','Compétition'];
function visible(x,now=Date.now()){return x.statut==='publié'&&Number.isFinite(Date.parse(x.publication))&&Date.parse(x.publication)<=now&&(x.type!=='Publicités'||(x.actif!==false&&(!x.fin||Date.parse(x.fin)>now)));}
function valider(x){if(!types.includes(x.type)||!['brouillon','publié'].includes(x.statut)||!x.titre.trim()||!x.resume.trim())throw Error('Complétez le type, le titre et le résumé.');if(!Number.isFinite(Date.parse(x.publication)))throw Error('Date de publication invalide.');if(x.fin&&(!Number.isFinite(Date.parse(x.fin))||Date.parse(x.fin)<=Date.parse(x.publication)))throw Error('La fin doit être après la publication.');if(x.type==='Événements'&&(!x.lieu.trim()||!Number.isFinite(Date.parse(x.evenement))))throw Error('Précisez la date et le lieu de l’événement.');return x;}
// Texte publié depuis l'admin : **gras** et *italique* (ou _italique_) rendus en vrai gras/italique au lieu des
// symboles. Construit seulement des nœuds texte, <strong> et <em> : aucun HTML du texte n'est interprété.
const RICHE=/\*\*([^*\n][^*]*?)\*\*|(?<![\w*])[*_]([^*_\s][^*_\n]*?)[*_](?![\w*])/g;
function morceaux(text){const t=String(text??''),out=[];let i=0,m;RICHE.lastIndex=0;while((m=RICHE.exec(t))){if(m.index>i)out.push({t:t.slice(i,m.index).replace(/\*\*/g,'')});out.push({t:m[1]??m[2],f:m[1]!==undefined?'strong':'em'});i=m.index+m[0].length;}if(i<t.length)out.push({t:t.slice(i).replace(/\*\*/g,'')});return out;}
function riche(tag,text,cls){const e=document.createElement(tag);if(cls)e.className=cls;for(const x of morceaux(text)){if(!x.f){e.append(x.t);continue;}const f=document.createElement(x.f);f.textContent=x.t;e.append(f);}return e;}
const sansMiseEnForme=text=>morceaux(text).map(x=>x.t).join('');
const api={types,morceaux,riche,sansMiseEnForme,categories,visible,valider,normaliser:x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),trier:xs=>[...xs].sort((a,b)=>Date.parse(b.publication)-Date.parse(a.publication))};r.KokiPortailCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
