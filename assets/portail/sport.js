// Sports & ASC : matchs et résultats, classement (calculé), équipes / ASC et actualités sportives.
// Données : flux public (contrat koki.sport.*, voir sport-contract.js) saisies dans Koki Connect Admin.
(function(){'use strict';
const S=KokiSportContract,C=KokiPortailCore,$=id=>document.getElementById(id);
const TITRE='⚽ Sports & ASC';
let generation=0,onglet='Matchs',choixCompetition='',choixPoule='';
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls);e.type='button';e.onclick=fn;return e;}
const actif=t=>$('portail-titre').textContent===t;
const heure=d=>new Date(d).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Dakar'});
const jour=d=>{const t=new Date(d).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'Africa/Dakar'});return t.charAt(0).toUpperCase()+t.slice(1);};
const jourCourt=d=>new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',timeZone:'Africa/Dakar'});

// Données publiées : équipes (id → fiche), matchs (avec date, terrain), actualités sportives (articles libres).
function donnees(feed){
 const visibles=feed.contenus.filter(x=>x.type===S.type&&C.visible(x));
 const equipes=new Map();for(const row of visibles){const v=S.decodeEquipe(row);if(v&&!v.archive)equipes.set(row.id,{...v,id:row.id,nom:row.titre,row});}
 const matchs=[];for(const row of visibles){const v=S.decodeMatch(row);if(v&&!v.archive&&equipes.has(v.domicile)&&equipes.has(v.exterieur))matchs.push({...v,id:row.id,row,date:row.evenement||row.publication,terrain:row.lieu||''});}
 matchs.sort((a,b)=>a.date.localeCompare(b.date));
 const actus=C.trier(visibles.filter(x=>!S.decodeEquipe(x)&&!S.decodeMatch(x)));
 return {equipes,matchs,actus};
}
// Logo : photo publiée, sinon pastille aux couleurs de l'équipe avec ses initiales.
function logo(e,taille='m'){
 const l=n('span',undefined,'sp-logo sp-logo-'+taille);
 if(e.row.image&&KokiPublicFeed.imagePermise(e.row.image)){const img=n('img');img.src=e.row.image;img.alt='';img.loading='lazy';l.append(img);}
 else{const [c1,c2]=e.couleurs;l.style.background=c2?'linear-gradient(135deg,'+c1+' 0 55%,'+c2+' 55% 100%)':c1;l.append(n('span',S.initiales(e.nom)));}
 return l;
}
function puce(statut){return n('span',statut==='En direct'?'● En direct':statut,'sp-statut sp-statut-'+({'À venir':'avenir','En direct':'direct','Terminé':'termine','Reporté':'reporte'}[statut]));}
function carteMatch(m,d){
 const dom=d.equipes.get(m.domicile),ext=d.equipes.get(m.exterieur),a=b('',()=>match(m.id),'sp-match'+(m.statut==='En direct'?' sp-match-direct':''));
 a.setAttribute('aria-label',dom.nom+' contre '+ext.nom+', '+(m.score_domicile!==null?m.score_domicile+' à '+m.score_exterieur+', ':'')+m.statut);
 const tete=n('span',undefined,'sp-match-tete');tete.append(n('span',m.competition+(m.poule?' · Poule '+m.poule:'')+(m.journee?' · '+m.journee:''),'sp-match-comp'),puce(m.statut));
 const ligne=(e,s,gagne)=>{const l=n('span',undefined,'sp-match-equipe'+(gagne?' sp-gagne':''));l.append(logo(e,'s'),n('span',e.nom,'sp-match-nom'),n('strong',s===null?'':String(s),'sp-match-score'));return l;};
 const fini=m.statut==='Terminé';
 a.append(tete,ligne(dom,m.score_domicile,fini&&m.score_domicile>m.score_exterieur),ligne(ext,m.score_exterieur,fini&&m.score_exterieur>m.score_domicile));
 a.append(n('span',(m.statut==='À venir'||m.statut==='Reporté'?jour(m.date)+' · '+heure(m.date):jourCourt(m.date))+(m.terrain?' · 📍 '+m.terrain:''),'sp-match-pied'));
 return a;
}
function vide(t){return n('p',t,'portail-meta sp-vide');}

async function accueil(){
 const g=++generation,box=KokiPortail.ouvrir(TITRE);box.append(n('p','Chargement…','portail-meta'));
 let d;try{d=donnees(await KokiPublicFeed.charger());}catch{if(g!==generation||!actif(TITRE))return;box.replaceChildren(n('p','Connexion indisponible. Réessayez dans un instant.','portail-note'),b('Réessayer',accueil,'sp-bouton'));return;}
 if(g!==generation||!actif(TITRE))return;box.replaceChildren();
 // Bandeau : match en direct, sinon prochain match, sinon dernier résultat.
 const direct=d.matchs.filter(m=>m.statut==='En direct'),prochain=d.matchs.find(m=>m.statut==='À venir'&&Date.parse(m.date)>=Date.now()-3*3600000),dernier=[...d.matchs].reverse().find(m=>m.statut==='Terminé');
 const hero=n('section',undefined,'sp-hero');hero.append(n('p','KOKI CONNECT · SPORTS & ASC','sp-hero-sur'),n('h3',direct.length?'En direct à Koki':prochain?'Prochain match':dernier?'Dernier résultat':'Sports à Koki','sp-hero-titre'));
 const vedette=direct[0]||prochain||dernier;if(vedette)hero.append(carteMatch(vedette,d));else hero.append(n('p','Les matchs des navétanes et les résultats des ASC s’afficheront ici.','sp-hero-texte'));
 const tabs=n('div',undefined,'sp-onglets');tabs.setAttribute('role','tablist');const zone=n('div',undefined,'sp-zone');
 const ONGLETS=[['Matchs','📅'],['Classement','🏆'],['Équipes','👕'],['Actus','📰']];
 function rendre(){tabs.replaceChildren(...ONGLETS.map(([o,i])=>{const t=b('',()=>{onglet=o;rendre();},'sp-onglet');t.append(n('span',i,'sp-onglet-icone'),n('span',o));t.setAttribute('role','tab');t.setAttribute('aria-selected',String(onglet===o));return t;}));
  zone.replaceChildren(...({Matchs:vueMatchs,Classement:vueClassement,'Équipes':vueEquipes,Actus:vueActus}[onglet])(d,rendre));}
 box.append(hero,tabs,zone);rendre();
}
function vueMatchs(d){
 const out=[];const direct=d.matchs.filter(m=>m.statut==='En direct');
 const avenir=d.matchs.filter(m=>m.statut==='À venir'||m.statut==='Reporté'),termines=d.matchs.filter(m=>m.statut==='Terminé').reverse();
 if(direct.length){out.push(n('h3','● En direct','sp-titre sp-titre-direct'));const l=n('div',undefined,'sp-liste');l.append(...direct.map(m=>carteMatch(m,d)));out.push(l);}
 out.push(n('h3','📅 À venir','sp-titre'));if(avenir.length){let j='';const l=n('div',undefined,'sp-liste');for(const m of avenir){const k=jour(m.date);if(k!==j){j=k;l.append(n('p',k,'sp-jour'));}l.append(carteMatch(m,d));}out.push(l);}else out.push(vide('Aucun match programmé pour le moment.'));
 out.push(n('h3','✅ Résultats','sp-titre'));if(termines.length){const l=n('div',undefined,'sp-liste');l.append(...termines.slice(0,30).map(m=>carteMatch(m,d)));out.push(l);}else out.push(vide('Aucun résultat publié.'));
 return out;
}
function vueClassement(d,rendre){
 const comps=S.competitions(d.matchs);if(!comps.length)return [vide('Le classement apparaîtra avec les premiers matchs publiés.')];
 if(!comps.some(c=>c.nom===choixCompetition)){choixCompetition=comps[0].nom;choixPoule='';}
 const comp=comps.find(c=>c.nom===choixCompetition);if(comp.poules.length&&!comp.poules.includes(choixPoule))choixPoule=comp.poules[0];if(!comp.poules.length)choixPoule='';
 const out=[];const puces=n('div',undefined,'sp-puces');
 if(comps.length>1)for(const c of comps){const p=b(c.nom,()=>{choixCompetition=c.nom;choixPoule='';rendre();},'sp-puce');p.setAttribute('aria-pressed',String(c.nom===choixCompetition));puces.append(p);}
 for(const p of comp.poules){const x=b('Poule '+p,()=>{choixPoule=p;rendre();},'sp-puce sp-puce-poule');x.setAttribute('aria-pressed',String(p===choixPoule));puces.append(x);}
 if(puces.childNodes.length)out.push(puces);
 out.push(n('h3','🏆 '+comp.nom+(choixPoule?' · Poule '+choixPoule:''),'sp-titre'));
 const rows=S.classement(d.matchs,d.equipes,{competition:comp.nom,poule:choixPoule});
 const t=n('table',undefined,'sp-table');const th=n('thead');const tr=n('tr');for(const [h,l] of [['#','Rang'],['Équipe','Équipe'],['J','Joués'],['G','Gagnés'],['N','Nuls'],['P','Perdus'],['Diff','Différence de buts'],['Pts','Points']]){const c=n('th',h);c.scope='col';c.title=l;tr.append(c);}th.append(tr);t.append(th);
 const tb=n('tbody');for(const r of rows){const e=d.equipes.get(r.id);const l=n('tr',undefined,r.rang===1&&r.j?'sp-premier':'');const nom=n('td',undefined,'sp-table-equipe');const lien=b('',()=>equipe(r.id),'sp-lien-equipe');lien.append(logo(e,'xs'),n('span',r.nom));nom.append(lien);
  l.append(n('td',String(r.rang),'sp-rang'),nom,n('td',String(r.j)),n('td',String(r.g)),n('td',String(r.n)),n('td',String(r.p)),n('td',(r.diff>0?'+':'')+r.diff),n('td',String(r.pts),'sp-pts'));tb.append(l);}
 t.append(tb);const wrap=n('div',undefined,'sp-table-wrap');wrap.append(t);out.push(wrap,n('p','Classement calculé automatiquement à partir des résultats publiés : victoire 3 points, nul 1 point, défaite 0. Départage : différence de buts, puis buts marqués.','portail-meta'));
 return out;
}
function vueEquipes(d){
 const xs=[...d.equipes.values()].sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));if(!xs.length)return [vide('Les équipes et ASC de Koki apparaîtront ici.')];
 const g=n('div',undefined,'sp-equipes');for(const e of xs){const c=b('',()=>equipe(e.id),'sp-equipe');c.append(logo(e,'l'),n('strong',e.nom),n('span',[e.discipline,e.quartier].filter(Boolean).join(' · '),'sp-equipe-info'));g.append(c);}return [g];
}
function vueActus(d){
 if(!d.actus.length)return [vide('Aucune actualité sportive publiée pour le moment.')];
 const g=n('div',undefined,'sp-actus');for(const x of d.actus){const a=b('',()=>KokiPortail.detail(x),'sp-actu');
  if(x.image&&KokiPublicFeed.imagePermise(x.image)){const img=n('img');img.src=x.image;img.alt='';img.loading='lazy';a.append(img);}else a.append(n('span','⚽','sp-actu-icone'));
  const t=n('span',undefined,'sp-actu-texte');t.append(n('span',(x.categorie||'Sport')+' · '+jourCourt(x.publication),'sp-actu-meta'),n('strong',x.titre),n('span',x.resume,'sp-actu-resume'));a.append(t);g.append(a);}
 return [g];
}

async function equipe(id){
 const g=++generation;let d;try{d=donnees(await KokiPublicFeed.charger());}catch{return;}if(g!==generation)return;const e=d.equipes.get(id);if(!e)return;
 const box=KokiPortail.ouvrir(e.nom);const [c1,c2]=e.couleurs;
 const tete=n('section',undefined,'sp-equipe-tete');tete.style.background='linear-gradient(135deg,'+c1+','+(c2||'#0b5a3c')+')';tete.append(logo(e,'xl'),n('h2',e.nom),n('p',[e.discipline,e.quartier,e.poule?'Poule '+e.poule:''].filter(Boolean).join(' · ')));box.append(tete);
 const comp=S.competitions(d.matchs.filter(m=>m.domicile===id||m.exterieur===id))[0];
 if(comp){const r=S.classement(d.matchs,d.equipes,{competition:comp.nom,poule:e.poule&&comp.poules.includes(e.poule)?e.poule:''}).find(x=>x.id===id);
  if(r){const s=n('div',undefined,'sp-stats');for(const [k,v] of [['Rang',r.rang+(r.rang===1?'er':'e')],['Points',r.pts],['Joués',r.j],['Buts',r.bp+' : '+r.bc]]){const c=n('div',undefined,'sp-stat');c.append(n('strong',String(v)),n('span',k));s.append(c);}box.append(s);
   if(r.forme.length){const f=n('div',undefined,'sp-forme');f.append(n('span','Forme : ','portail-meta'),...r.forme.map(x=>n('span',x,'sp-forme-'+x)));box.append(f);}}}
 const actions=n('div',undefined,'sp-actions');if(e.telephone){const a=n('a','📞 Contacter l’ASC','sp-bouton');a.href='tel:'+e.telephone.replace(/[^+0-9]/g,'');actions.append(a);}if(actions.childNodes.length)box.append(actions);
 if(e.description||e.president){const p=n('section',undefined,'sp-bloc');p.append(n('h3','À propos'));if(e.description)p.append(n('p',e.description));if(e.president)p.append(n('p','Président : '+e.president,'portail-meta'));box.append(p);}
 const ms=d.matchs.filter(m=>m.domicile===id||m.exterieur===id);
 if(ms.length){box.append(n('h3','📅 Matchs','sp-titre'));const l=n('div',undefined,'sp-liste');l.append(...[...ms].reverse().slice(0,20).map(m=>carteMatch(m,d)));box.append(l);}
 if(e.joueurs.length){const p=n('section',undefined,'sp-bloc');p.append(n('h3','👕 Effectif ('+e.joueurs.length+')'));const ul=n('ul',undefined,'sp-joueurs');for(const j of [...e.joueurs].sort((a,b)=>(a.numero??100)-(b.numero??100))){const li=n('li');li.append(n('span',j.numero===null?'–':String(j.numero),'sp-numero'),n('span',j.nom,'sp-joueur-nom'),n('span',j.poste,'sp-joueur-poste'));ul.append(li);}p.append(ul);box.append(p);}
}

async function match(id){
 const g=++generation;let d;try{d=donnees(await KokiPublicFeed.charger());}catch{return;}if(g!==generation)return;const m=d.matchs.find(x=>x.id===id);if(!m)return;
 const dom=d.equipes.get(m.domicile),ext=d.equipes.get(m.exterieur);const box=KokiPortail.ouvrir(dom.nom+' – '+ext.nom);
 const tab=n('section',undefined,'sp-tableau'+(m.statut==='En direct'?' sp-tableau-direct':''));tab.append(n('p',m.competition+(m.poule?' · Poule '+m.poule:'')+(m.journee?' · '+m.journee:''),'sp-tableau-comp'));
 const face=n('div',undefined,'sp-face');const cote=e=>{const c=b('',()=>equipe(e.id),'sp-face-equipe');c.append(logo(e,'l'),n('strong',e.nom));return c;};
 const centre=n('div',undefined,'sp-face-centre');centre.append(m.score_domicile===null?n('strong',heure(m.date),'sp-face-heure'):n('strong',m.score_domicile+' – '+m.score_exterieur,'sp-face-score'),puce(m.statut));
 face.append(cote(dom),centre,cote(ext));tab.append(face,n('p',jour(m.date)+' · '+heure(m.date)+(m.terrain?' · 📍 '+m.terrain:''),'sp-tableau-pied'));box.append(tab);
 if(m.commentaire){const p=n('section',undefined,'sp-bloc');p.append(n('h3','Le match'),n('p',m.commentaire));box.append(p);}
 const face2=d.matchs.filter(x=>x.id!==m.id&&x.statut==='Terminé'&&((x.domicile===m.domicile&&x.exterieur===m.exterieur)||(x.domicile===m.exterieur&&x.exterieur===m.domicile)));
 if(face2.length){box.append(n('h3','Confrontations précédentes','sp-titre'));const l=n('div',undefined,'sp-liste');l.append(...face2.reverse().slice(0,5).map(x=>carteMatch(x,d)));box.append(l);}
 const actions=n('div',undefined,'sp-actions');actions.append(b('🏆 Voir le classement',()=>{onglet='Classement';choixCompetition=m.competition;choixPoule=m.poule;accueil();},'sp-bouton sp-bouton-clair'));box.append(actions);
}

window.KokiSport=Object.freeze({accueil,equipe,match});
})();
