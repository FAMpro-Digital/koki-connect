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
// ----- Koki en direct : résultats, décès et cérémonies, coupures et avis importants des trois derniers jours -----
const DIRECT={'Décès et cérémonies':'🕊️','Coupure eau/électricité':'⚠️','Avis important':'📢','Résultat':'⚽'},DUREE_DIRECT=72*3600e3;
function estDirect(x){return !!x&&((x.type==='Annonces'&&['Décès et cérémonies','Coupure eau/électricité','Avis important'].includes(x.categorie))||(x.type==='Sports & ASC'&&x.categorie==='Résultat'));}
function enDirect(contenus,maintenant=Date.now(),max=4){return (Array.isArray(contenus)?contenus:[]).filter(x=>estDirect(x)&&maintenant-Date.parse(x.publication)>=0&&maintenant-Date.parse(x.publication)<=DUREE_DIRECT).sort((a,b)=>Date.parse(b.publication)-Date.parse(a.publication)).slice(0,max);}
function ilYA(date,maintenant=Date.now()){const m=Math.max(0,Math.round((maintenant-Date.parse(date))/60000));if(m<1)return 'à l’instant';if(m<60)return 'il y a '+m+' min';const h=Math.round(m/60);if(h<24)return 'il y a '+h+' h';const j=Math.round(h/24);return j===1?'hier':'il y a '+j+' jours';}
const zoneDirect=document.getElementById('koki-direct');
function dessinerDirect(contenus){if(!zoneDirect)return;const xs=enDirect(contenus);zoneDirect.replaceChildren();zoneDirect.hidden=!xs.length;if(!xs.length)return;
 const tete=n('div',null,'koki-direct-tete');tete.append(n('span',null,'koki-direct-point'),n('strong','Koki en direct'));zoneDirect.append(tete);
 for(const x of xs){const b=n('button',null,'koki-direct-ligne');b.type='button';const ic=n('span',DIRECT[x.categorie]||'📢','koki-direct-icone');ic.setAttribute('aria-hidden','true');const t=n('span',null,'koki-direct-texte');t.append(n('strong',x.titre),n('small',x.categorie+' · '+ilYA(x.publication)));b.append(ic,t);b.onclick=()=>{if(window.KokiPortail)KokiPortail.detail(x);};zoneDirect.append(b);}}
// Pharmacies de garde parmi les contenus publiés (contrat Santé).
function maj(contenus){dessinerDirect(contenus);const S=window.KokiSanteContract;garde=[];if(S&&Array.isArray(contenus))for(const row of contenus){try{const v=S.decode(row);if(v&&S.famille(v.genre)==='pharmacie'&&S.enGarde(v))garde.push({titre:row.titre});}catch(_){}}dessiner();}
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
window.KokiAccueilJour={maj,bienvenue,enDirect,estDirect,ilYA};if(typeof module!=='undefined'&&module.exports)module.exports=window.KokiAccueilJour;
if(document.readyState==='complete')setTimeout(()=>bienvenue(false),600);else window.addEventListener('load',()=>setTimeout(()=>bienvenue(false),600));
})();
