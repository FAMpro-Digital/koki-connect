// Accueil : « Aujourd'hui à Koki » (heures de prière calculées sur l'appareil, pharmacie de garde publiée dans l'administration)
// et message de bienvenue à la première ouverture (trois écrans, mémorisé sur l'appareil). Aucun appel réseau, aucune donnée envoyée.
(function(){'use strict';
function n(tag,texte,cls){const e=document.createElement(tag);if(texte!==undefined&&texte!==null)e.textContent=texte;if(cls)e.className=cls;return e;}
const hote=document.getElementById('infos-jour');let garde=[];
function dessiner(){if(!hote||!window.KokiPrieres)return;const j=KokiPrieres.duJour(new Date());hote.replaceChildren();
 const titre=n('div',null,'infos-jour-tete');titre.append(n('strong','🕌 Heures de prière à Koki'),n('small','indicatives'));hote.append(titre);
 const ligne=n('div',null,'infos-jour-prieres');ligne.setAttribute('role','list');
 for(const p of j.liste){const c=n('div',null,'infos-jour-priere'+(p.cle===j.prochaine?' prochaine':''));c.setAttribute('role','listitem');c.append(n('span',p.nom),n('strong',p.heure));if(p.cle===j.prochaine)c.setAttribute('aria-label',p.nom+' '+p.heure+', prochaine prière');ligne.append(c);}
 hote.append(ligne);
 if(garde.length){const b=n('button',null,'infos-jour-garde');b.type='button';b.append(n('span','💊 Pharmacie de garde'),n('strong',garde.map(g=>g.titre).slice(0,2).join(' · ')));b.onclick=()=>{if(window.KokiSante)KokiSante.ouvrir();};hote.append(b);}
 hote.hidden=false;}
// Pharmacies de garde parmi les contenus publiés (contrat Santé).
function maj(contenus){const S=window.KokiSanteContract;garde=[];if(S&&Array.isArray(contenus))for(const row of contenus){try{const v=S.decode(row);if(v&&S.famille(v.genre)==='pharmacie'&&S.enGarde(v))garde.push({titre:row.titre});}catch(_){}}dessiner();}
dessiner();setInterval(()=>{if(!document.hidden)dessiner();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)dessiner();});

// ----- Bienvenue : une seule fois par appareil -----
const CLE='koki.bienvenue.v1';
const ECRANS=[
 ['👋','Bienvenue sur Koki Connect','Les actualités, les annonces, le sport et les événements de Koki, réunis dans votre poche.'],
 ['🛍️','Commerces et transport','Trouvez une boutique, un produit ou un service près de chez vous, commandez par WhatsApp et réservez une course.'],
 ['🔔','Soyez prévenu','Créez votre compte dans Profil, puis activez les notifications pour recevoir les publications qui vous intéressent.']];
function dejaVu(){try{return localStorage.getItem(CLE)==='vu';}catch(_){return true;}}
function bienvenue(force){if(!force&&(dejaVu()||new URLSearchParams(location.search).has('publication')))return null;if(document.getElementById('bienvenue'))return null;
 const fond=n('div',null,'bienvenue');fond.id='bienvenue';fond.setAttribute('role','dialog');fond.setAttribute('aria-modal','true');fond.setAttribute('aria-labelledby','bienvenue-titre');
 const boite=n('div',null,'bienvenue-boite'),icone=n('div',null,'bienvenue-icone'),titre=n('h2'),texte=n('p'),points=n('div',null,'bienvenue-points'),actions=n('div',null,'bienvenue-actions');
 icone.setAttribute('aria-hidden','true');titre.id='bienvenue-titre';points.setAttribute('aria-hidden','true');
 const passer=n('button','Passer','bienvenue-passer'),suite=n('button','Suivant','bienvenue-suite');passer.type='button';suite.type='button';let i=0;
 const fermer=()=>{try{localStorage.setItem(CLE,'vu');}catch(_){}document.removeEventListener('keydown',clavier);fond.remove();};
 const clavier=e=>{if(e.key==='Escape')fermer();};
 const montrer=()=>{const [ic,t,p]=ECRANS[i];icone.textContent=ic;titre.textContent=t;texte.textContent=p;points.replaceChildren(...ECRANS.map((_,k)=>n('span',null,k===i?'actif':'')));suite.textContent=i===ECRANS.length-1?'Commencer':'Suivant';passer.hidden=i===ECRANS.length-1;};
 passer.onclick=fermer;suite.onclick=()=>{if(i===ECRANS.length-1){fermer();return;}i++;montrer();};
 actions.append(passer,suite);boite.append(icone,titre,texte,points,actions);fond.append(boite);montrer();document.body.append(fond);document.addEventListener('keydown',clavier);suite.focus();return fond;}
window.KokiAccueilJour={maj,bienvenue};
if(document.readyState==='complete')setTimeout(()=>bienvenue(false),600);else window.addEventListener('load',()=>setTimeout(()=>bienvenue(false),600));
})();
