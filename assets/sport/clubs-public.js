// Clubs & Académies — pages publiques (onglet « Académies » de la rubrique Sport, page d'une académie).
// Lecture : RPC koki_sport_public (visiteurs). Le serveur ne renvoie que les académies actives et, pour les joueurs,
// uniquement ce que le responsable de l’académie a choisi d’afficher. Suivre / signaler : compte connecté (RPC koki_sport).
// Module masqué tant que config.json › modules.clubs ne vaut pas true.
(function(){'use strict';
const K=window.KokiClubsContract;
const state={visible:false,generation:0};
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls||'sp-bouton');e.type='button';e.onclick=fn;return e;}
const api=()=>window.KokiClubsAPI;
const jour=d=>new Date(d).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',timeZone:'Africa/Dakar'});
const heure=d=>new Date(d).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Dakar'});
function erreur(box,e,retry){box.replaceChildren(n('p',K.messageErreur(e),'portail-note'));if(retry)box.append(b('Réessayer',retry));}

function logo(club,urls,taille='m'){
 const l=n('span',undefined,'sp-logo sp-logo-'+taille);const u=club.logo_path&&urls.get(club.logo_path);
 if(u){const img=n('img');img.src=u;img.alt='';img.loading='lazy';l.append(img);}
 else{const [c1,c2]=club.couleurs||['#087a3d'];l.style.background=c2?'linear-gradient(135deg,'+c1+' 0 55%,'+c2+' 55% 100%)':c1;l.append(n('span',K.initiales(club.nom)));}
 return l;
}

// ───── Onglet « Académies » (liste) ─────
function vue(){
 const box=n('div',undefined,'kc-liste');const g=++state.generation;
 const entete=n('div',undefined,'kc-entete');entete.append(n('p','Les académies et clubs de Koki gèrent ici leurs équipes, matchs et actualités.','portail-meta'),
  b('🎓 Mon espace académie',()=>window.KokiClubSpace?.ouvrir(),'sp-bouton sp-bouton-clair'));
 const zone=n('div');zone.append(n('p','Chargement…','portail-meta koki-chargement'));box.append(entete,zone);
 (async()=>{try{const clubs=await api().lecture('clubs');if(g!==state.generation)return;
   const urls=await api().urls(clubs.map(c=>c.logo_path));zone.replaceChildren();
   if(!clubs.length){zone.append(n('p','Aucune académie n’est encore publiée.','portail-note'));return;}
   const l=n('div',undefined,'sp-liste');
   for(const c of clubs){const card=b('',()=>page(c.slug),'kc-carte');card.append(logo(c,urls));const t=n('span',undefined,'kc-carte-texte');
    t.append(n('strong',c.nom),n('span',[c.type,c.discipline,c.localite].filter(Boolean).join(' · '),'kc-meta'));if(c.resume)t.append(n('span',c.resume,'kc-resume'));
    t.append(n('span','👥 '+c.abonnes+' abonné'+(c.abonnes>1?'s':''),'kc-meta'));card.append(t);l.append(card);}
   zone.append(l);
  }catch(e){if(g===state.generation)erreur(zone,e,()=>zone.replaceWith(vue()));}})();
 return box;
}

// ───── Page d'une académie ─────
async function page(slug){
 const g=++state.generation;const box=KokiPortail.ouvrir('🎓 Académie');box.append(n('p','Chargement…','portail-meta koki-chargement'));
 let c;try{c=await api().lecture('club',{slug});}catch(e){if(g===state.generation)erreur(box,e,()=>page(slug));return;}
 if(g!==state.generation)return;
 const chemins=[c.logo_path,...c.encadrement.map(s=>s.photo_path),...c.joueurs.map(j=>j.photo_path),...c.galerie.map(m=>m.storage_path),...c.publications.flatMap(p=>p.medias.map(m=>m.storage_path))];
 const urls=await api().urls(chemins).catch(()=>new Map());if(g!==state.generation)return;
 box.replaceChildren(); // titre « 🎓 Académie » conservé : le renommer créerait une 2e étape d'historique
 // En-tête
 const hero=n('section',undefined,'sp-hero kc-hero');const h=n('div',undefined,'kc-hero-ligne');h.append(logo(c,urls,'l'));const ht=n('div');
 ht.append(n('p',[c.type,c.discipline].join(' · ').toUpperCase(),'sp-hero-sur'),n('h3',c.nom,'sp-hero-titre'),n('p',['📍 '+(c.localite||'Koki'),c.adresse].filter(Boolean).join(' · '),'sp-hero-texte'));h.append(ht);hero.append(h);
 const actions=n('div',undefined,'kc-actions');
 const suivre=b(c.je_suis?'✓ Abonné':'＋ Suivre',async()=>{suivre.disabled=true;try{if(!await api().session()){if(confirm('Connectez-vous pour suivre cette académie et recevoir ses actualités. Ouvrir la connexion ?'))KokiPortail.profil();return;}
   const r=await api().api(c.je_suis?'unfollow':'follow',{club_id:c.id});c.je_suis=r.suivi;c.abonnes+=r.suivi?1:-1;suivre.textContent=c.je_suis?'✓ Abonné':'＋ Suivre';compteur.textContent='👥 '+c.abonnes+' abonné'+(c.abonnes>1?'s':'');}
  catch(e){alert(K.messageErreur(e));}finally{suivre.disabled=false;}},'sp-bouton');
 const compteur=n('span','👥 '+c.abonnes+' abonné'+(c.abonnes>1?'s':''),'kc-meta kc-meta-clair');
 const url=K.lienPartage(location.origin,c.slug);
 const partager=n('a','Partager sur WhatsApp','sp-bouton sp-bouton-clair');partager.href=K.lienWhatsapp(K.messageWhatsapp(c,url));partager.target='_blank';partager.rel='noopener';
 actions.append(suivre,partager);
 if(c.telephone){const a=n('a','📞 Appeler','sp-bouton sp-bouton-clair');a.href='tel:'+c.telephone.replace(/[^+0-9]/g,'');actions.append(a);}
 if(c.whatsapp){const a=n('a','💬 WhatsApp','sp-bouton sp-bouton-clair');a.href=K.lienWhatsapp('Bonjour '+c.nom+',',c.whatsapp);a.target='_blank';a.rel='noopener';actions.append(a);}
 hero.append(compteur,actions);box.append(hero);

 const section=(titre,...contenu)=>{const s=n('section',undefined,'kc-section');s.append(n('h3',titre,'sp-titre'),...contenu);box.append(s);return s;};
 if(c.presentation)section('Présentation',n('p',c.presentation,'kc-texte'));
 if(c.historique)section('Notre histoire',n('p',c.historique,'kc-texte'));
 if(c.activites)section('Nos activités',n('p',c.activites,'kc-texte'));
 if(c.categories.length){const ul=n('div',undefined,'kc-puces');for(const k of c.categories)ul.append(n('span',k.nom+(k.effectif?' · '+k.effectif+' joueur'+(k.effectif>1?'s':''):''),'kc-puce'));section('Catégories',ul);}
 if(c.encadrement.length){const l=n('div',undefined,'kc-personnes');for(const s of c.encadrement){const p=n('div',undefined,'kc-personne');const u=s.photo_path&&urls.get(s.photo_path);
   const av=n('span',undefined,'sp-logo sp-logo-m kc-avatar-joueur');if(u){const i=n('img');i.src=u;i.alt='';av.append(i);}else av.append(n('span',K.initiales(s.prenom+' '+s.nom)));
   p.append(av,n('strong',s.prenom+' '+s.nom),n('span',s.fonction,'kc-meta'));l.append(p);}section('Encadrement',l);}
 // Matchs
 const avenir=c.matchs.filter(m=>['À venir','En direct','Reporté'].includes(m.statut)).reverse(),termines=c.matchs.filter(m=>m.statut==='Terminé');
 const carte=m=>{const a=n('article',undefined,'kc-match');const r=K.issue(m,c.nom);
  a.append(n('p',[m.categorie,m.competition,m.journee].filter(Boolean).join(' · '),'kc-meta'),n('p',m.domicile+'  '+K.scoreTexte(m)+'  '+m.exterieur,'kc-score'),
   n('p',jour(m.date_match)+' · '+heure(m.date_match)+(m.lieu?' · '+m.lieu:'')+(m.statut!=='Terminé'?' · '+m.statut:''),'kc-meta'));if(r)a.append(n('span',r,'kc-issue kc-issue-'+r.toLowerCase()));return a;};
 if(avenir.length){const l=n('div',undefined,'sp-liste');avenir.slice(0,6).forEach(m=>l.append(carte(m)));section('Prochains matchs',l);}
 if(termines.length){const l=n('div',undefined,'sp-liste');termines.slice(0,10).forEach(m=>l.append(carte(m)));section('Résultats',l);}
 for(const co of c.competitions.filter(x=>x.classement.some(r=>r.joues>0))){
  const t=n('table',undefined,'kc-classement');const th=n('thead'),trh=n('tr');for(const x of ['#','Équipe','J','G','N','P','Diff.','Pts'])trh.append(n('th',x));th.append(trh);t.append(th);const tb=n('tbody');
  co.classement.forEach((r,i)=>{const tr=n('tr');if(r.moi)tr.className='kc-moi';for(const v of [i+1,r.equipe,r.joues,r.gagnes,r.nuls,r.perdus,(r.diff>0?'+':'')+r.diff,r.points])tr.append(n('td',String(v)));tb.append(tr);});
  t.append(tb);const w=n('div',undefined,'kc-tableau');w.append(t);section('🏆 '+co.nom+(co.categorie?' · '+co.categorie:''),w);}
 if(c.buteurs.length){const ol=n('ol',undefined,'kc-buteurs');for(const x of c.buteurs)ol.append(n('li',x.nom+' — '+x.buts+' but'+(x.buts>1?'s':'')));section('⚽ Meilleurs buteurs',ol);}
 if(c.seances.length){const l=n('ul',undefined,'kc-seances');for(const s of c.seances)l.append(n('li',jour(s.debut)+' '+heure(s.debut)+'–'+heure(s.fin)+' · '+s.categorie+(s.lieu?' · '+s.lieu:'')+(s.statut==='annulée'?' · ANNULÉE':'')));section('Entraînements à venir',l);}
 if(c.joueurs.length){const l=n('div',undefined,'kc-personnes');for(const j of c.joueurs){const p=n('div',undefined,'kc-personne');const u=j.photo_path&&urls.get(j.photo_path);
   const av=n('span',undefined,'sp-logo sp-logo-m kc-avatar-joueur');if(u){const i=n('img');i.src=u;i.alt='';av.append(i);}else av.append(n('span',j.numero!==null?String(j.numero):K.initiales(j.nom)));
   p.append(av,n('strong',j.nom),n('span',[j.categorie,j.poste].filter(Boolean).join(' · '),'kc-meta'));l.append(p);}
  section('Jeunes talents',l);}
 const media=m=>{if(m.type==='photo'){const u=urls.get(m.storage_path);if(!u)return null;const f=n('figure',undefined,'kc-media');const i=n('img');i.src=u;i.alt=m.legende||'';i.loading='lazy';f.append(i);if(m.legende)f.append(n('figcaption',m.legende));return f;}
  const f=n('figure',undefined,'kc-media kc-video');const lancer=b('▶ Voir la vidéo',()=>{const fr=document.createElement('iframe');fr.src=K.lienYoutube(m.youtube_id);fr.title=m.legende||'Vidéo';fr.allow='encrypted-media; picture-in-picture';fr.allowFullscreen=true;fr.loading='lazy';lancer.replaceWith(fr);},'sp-bouton');f.append(lancer);if(m.legende)f.append(n('figcaption',m.legende));return f;};
 if(c.publications.length){const s=section('Actualités');for(const p of c.publications){const a=n('article',undefined,'kc-post');
   a.append(n('p',p.type+' · '+jour(p.publication),'kc-meta'),n('h4',p.titre));if(p.evenement)a.append(n('p','📅 '+jour(p.evenement)+' '+heure(p.evenement)+(p.lieu?' · '+p.lieu:''),'kc-meta'));
   if(p.texte)a.append(n('p',p.texte,'kc-texte'));const g2=n('div',undefined,'kc-galerie');p.medias.map(media).filter(Boolean).forEach(x=>g2.append(x));if(g2.childElementCount)a.append(g2);
   a.append(b('Signaler',()=>signaler('post',p.id),'kc-lien'));s.append(a);}}
 const gal=c.galerie.map(media).filter(Boolean);if(gal.length){const g2=n('div',undefined,'kc-galerie');gal.forEach(x=>g2.append(x));section('Galerie',g2);}
 const pied=n('p',undefined,'kc-pied');pied.append(b('Signaler cette page',()=>signaler('club',c.id),'kc-lien'),b('← Toutes les académies',()=>{if(window.KokiNavigation?.profondeur()>0)history.back();else window.KokiSport?.accueil();},'kc-lien'));box.append(pied);
}

async function signaler(type,id){
 if(!await api().session()){if(confirm('Connectez-vous pour signaler un contenu. Ouvrir la connexion ?'))KokiPortail.profil();return;}
 const choix=K.MOTIFS_SIGNALEMENT.map((m,i)=>(i+1)+'. '+m).join('\n');const r=prompt('Motif du signalement :\n'+choix+'\n\nTapez le numéro :');if(!r)return;
 const motif=K.MOTIFS_SIGNALEMENT[Number(r)-1];if(!motif){alert('Motif invalide.');return;}const details=prompt('Précisions (facultatif) :')||'';
 try{await api().api('report',{cible_type:type,cible_id:id,motif,details:details.slice(0,1000)});alert('Merci. FAMpro Digital va examiner ce signalement.');}catch(e){alert(K.messageErreur(e));}
}

// Démarrage : l'onglet n'apparaît que si le module est activé ; lien partagé ?academie=<slug>.
(async()=>{const attendre=()=>new Promise(r=>{const t=setInterval(()=>{if(window.KokiClubsAPI){clearInterval(t);r();}},100);setTimeout(()=>{clearInterval(t);r();},15000);});
 await attendre();if(!window.KokiClubsAPI||!await api().actif())return;state.visible=true;
 // Feuille de style chargée seulement quand le module est activé (même origine : compatible avec la CSP).
 if(!document.querySelector('link[href="assets/sport/clubs.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='assets/sport/clubs.css';document.head.append(l);}
 let slug=null;try{slug=new URLSearchParams(location.search).get('academie');}catch(_){}
 if(slug&&/^[a-z0-9-]{1,80}$/.test(slug)){try{history.replaceState(history.state,'',location.pathname);}catch(_){}page(slug);}
})();
window.KokiClubs=Object.freeze({get visible(){return state.visible;},vue,page});
})();
