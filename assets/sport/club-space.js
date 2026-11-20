// Clubs & Académies — espace de gestion d'une académie (responsable, entraîneur, communication).
// Toutes les actions passent par la RPC koki_sport : le serveur vérifie le rôle, la catégorie et l'académie.
// L'interface masque seulement ce que le rôle ne peut pas faire, pour rester simple.
(function(){'use strict';
const K=window.KokiClubsContract,$=id=>document.getElementById(id);
const api=()=>window.KokiClubsAPI;
let generation=0;
function n(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;}
function b(text,fn,cls){const e=n('button',text,cls||'sp-bouton');e.type='button';e.onclick=fn;return e;}
const jour=d=>new Date(d).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',timeZone:'Africa/Dakar'});
const heure=d=>new Date(d).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Dakar'});
const rid=()=>crypto.randomUUID();
function statut(box,texte,type='info'){let p=box.querySelector(':scope > .kc-statut');if(!p){p=n('p',undefined,'kc-statut');p.setAttribute('role','status');box.prepend(p);}p.textContent=texte;p.dataset.type=type;p.scrollIntoView?.({block:'nearest'});}
async function agir(box,bouton,fn,ok){bouton&&(bouton.disabled=true);try{const r=await fn();if(ok)statut(box,ok,'ok');return r;}catch(e){statut(box,K.messageErreur(e),'erreur');return undefined;}finally{bouton&&(bouton.disabled=false);}}

// Formulaire simple. champs : [nom, libellé, type, {options, valeur, requis, max, aide, min}]
function formulaire(titre,champs,envoyer,libelle='Enregistrer'){
 const f=n('form',undefined,'kc-form');if(titre)f.append(n('h4',titre));const inputs={};
 for(const [nom,lab,type='text',o={}] of champs){
  const id='kc-'+nom+'-'+Math.random().toString(36).slice(2,8);const w=n('div',undefined,'kc-champ');let el;
  if(type==='textarea'){el=n('textarea');el.rows=o.rows||4;}
  else if(type==='select'){el=n('select');for(const [v,t] of o.options)el.append(Object.assign(n('option',t),{value:v}));}
  else if(type==='checks'){el=n('fieldset',undefined,'kc-checks');el.append(n('legend',lab));for(const [v,t] of o.options){const l=n('label');const c=n('input');c.type='checkbox';c.value=v;c.checked=(o.valeur||[]).includes(v);l.append(c,' '+t);el.append(l);}}
  else{el=n('input');el.type=type==='datetime'?'datetime-local':type;if(type==='file')el.accept='image/jpeg,image/png,image/webp,image/heic,image/heif';}
  if(type!=='checks'){el.id=id;el.name=nom;if(o.requis)el.required=true;if(o.max)el.maxLength=o.max;if(o.min!==undefined)el.min=o.min;if(o.placeholder)el.placeholder=o.placeholder;
   if(type==='checkbox')el.checked=!!o.valeur;else if(type!=='file'&&o.valeur!==undefined&&o.valeur!==null)el.value=type==='datetime'?K.versSaisie(o.valeur):o.valeur;}
  if(type==='checkbox'){const l=n('label');l.htmlFor=id;l.append(el,' '+lab);w.append(l);}else if(type==='checks')w.append(el);else{const l=n('label',lab);l.htmlFor=id;w.append(l,el);}
  if(o.aide)w.append(n('small',o.aide,'kc-aide'));inputs[nom]={el,type};f.append(w);
 }
 const ok=n('button',libelle,'sp-bouton');ok.type='submit';f.append(ok);
 f.valeurs=()=>{const v={};for(const [k,{el,type}] of Object.entries(inputs)){
  if(type==='checkbox')v[k]=el.checked;else if(type==='checks')v[k]=[...el.querySelectorAll('input:checked')].map(c=>c.value);
  else if(type==='number')v[k]=el.value===''?null:Number(el.value);else if(type==='datetime')v[k]=K.versIso(el.value);else if(type==='file')v[k]=el.files[0]||null;else v[k]=el.value.trim();}return v;};
 f.onsubmit=async e=>{e.preventDefault();await envoyer(f.valeurs(),ok,f);};
 return f;
}
function details(titre,contenu,ouvert=false){const d=n('details',undefined,'kc-details');d.open=ouvert;d.append(n('summary',titre),contenu);return d;}

// ═════ Accueil de l'espace ═════
async function ouvrir(){
 const g=++generation;const box=KokiPortail.ouvrir('🎓 Mon espace académie');box.append(n('p','Chargement…','portail-meta'));
 if(!api()||!await api().actif()){box.replaceChildren(n('p','Espace indisponible pour le moment.','portail-note'));return;}
 const s=await api().session();if(g!==generation)return;box.replaceChildren();
 if(!s){box.append(n('p','Connectez-vous avec votre compte Koki Connect pour gérer votre académie ou rejoindre une équipe d’encadrement.','portail-note'),b('Se connecter',()=>KokiPortail.profil()));return;}
 let clubs;try{clubs=await api().api('my_clubs');}catch(e){statut(box,K.messageErreur(e),'erreur');box.append(b('Réessayer',ouvrir));return;}
 if(g!==generation)return;
 if(clubs.length){box.append(n('h3','Mes académies','sp-titre'));const l=n('div',undefined,'sp-liste');
  for(const c of clubs){const card=b('',()=>club(c.id),'kc-carte');const t=n('span',undefined,'kc-carte-texte');t.append(n('strong',c.nom),n('span',K.ROLES[c.role]+' · '+c.statut,'kc-meta'));card.append(t);l.append(card);}box.append(l);}
 else box.append(n('p','Vous ne gérez encore aucune académie.','portail-meta'));
 box.append(details('🔑 J’ai reçu un code d’invitation',formulaire(null,[['code','Code (ex. ABCDE-FGH23)','text',{requis:true,max:20}]],async(v,bt)=>{
  if(!K.codeValide(v.code)){statut(box,'Code incomplet : 10 lettres et chiffres.','erreur');return;}
  const r=await agir(box,bt,()=>api().api('accept_invitation',{code:v.code}));if(!r)return;if(r.ok===false){statut(box,r.erreur,'erreur');return;}club(r.id);},'Rejoindre'),!clubs.length));
 box.append(details('➕ Créer une académie',formulaire(null,[
  ['nom','Nom de l’académie','text',{requis:true,max:120}],['type','Type','select',{options:K.TYPES.map(x=>[x,x])}],['discipline','Discipline','select',{options:K.DISCIPLINES.map(x=>[x,x])}],
  ['telephone','Téléphone public (facultatif)','tel',{max:24}],['presentation','Présentation courte','textarea',{max:3000}]],async(v,bt)=>{
  if(!K.telephoneValide(v.telephone)){statut(box,'Téléphone invalide.','erreur');return;}
  const r=await agir(box,bt,()=>api().api('create_club',{request_id:rid(),...v}));if(r)club(r.id);},'Envoyer la demande')));
 box.append(n('p','Toute nouvelle académie est vérifiée par FAMpro Digital avant d’être visible. Les informations des jeunes joueurs restent privées.','kc-meta'));
}

// ═════ Espace d'une académie ═════
const ONGLETS={responsable:['Tableau','Joueurs','Entraînements','Matchs','Publications','Équipe','Académie'],entraineur:['Tableau','Joueurs','Entraînements','Matchs'],communication:['Tableau','Publications','Académie']};
async function club(id,onglet='Tableau'){
 const g=++generation;const box=KokiPortail.ouvrir('🎓 Mon académie');box.append(n('p','Chargement…','portail-meta'));
 let c;try{c=await api().api('club_get',{club_id:id});}catch(e){box.replaceChildren();statut(box,K.messageErreur(e),'erreur');box.append(b('← Mes académies',ouvrir));return;}
 if(g!==generation)return;box.replaceChildren();try{$('portail-titre').textContent='🎓 '+c.nom;}catch(_){}
 const h=n('section',undefined,'kc-bandeau');h.append(n('strong',c.nom),n('span',K.ROLES[c.role]+' · '+c.statut,'kc-meta'),n('p',K.STATUT_EXPLIQUE[c.statut]+(c.motif?' Motif : '+c.motif:''),'kc-meta'));
 h.dataset.statut=c.statut;box.append(h);
 const tabs=n('div',undefined,'sp-onglets kc-onglets');tabs.setAttribute('role','tablist');const zone=n('div',undefined,'kc-zone');
 const liste=ONGLETS[c.role]||['Tableau'];const recharger=o=>club(id,o||onglet);
 for(const o of liste){const t=b(o,()=>{onglet=o;rendre();},'sp-onglet');t.setAttribute('role','tab');tabs.append(t);}
 function rendre(){for(const t of tabs.children)t.setAttribute('aria-selected',String(t.textContent===onglet));zone.replaceChildren();
  ({Tableau:tableau,Joueurs:joueurs,'Entraînements':seances,Matchs:matchs,Publications:publications,'Équipe':equipe,'Académie':academie}[onglet])(zone,c,recharger);}
 box.append(tabs,zone,b('← Mes académies',ouvrir,'kc-lien'));rendre();
}
const categoriesPermises=c=>c.categories.filter(k=>k.statut==='active'&&(c.role==='responsable'||c.categories_entraineur.includes(k.id)));
const optCategories=c=>categoriesPermises(c).map(k=>[k.id,k.nom]);

function tableau(z,c,recharger){
 const s=n('div',undefined,'kc-compteurs');for(const [l,v] of [['Joueurs actifs',c.compteurs.joueurs],['Abonnés',c.compteurs.abonnes],['Publications',c.compteurs.publications]]){const d=n('div',undefined,'kc-compteur');d.append(n('strong',String(v)),n('span',l));s.append(d);}z.append(s);
 if(c.role==='entraineur'&&!c.categories_entraineur.length)z.append(n('p','Aucune catégorie ne vous est encore confiée : demandez au responsable de vous en attribuer une.','portail-note'));
 z.append(n('h4','Prochains entraînements'));const se=c.prochaines_seances;if(!se.length)z.append(n('p','Aucun entraînement programmé.','kc-meta'));
 for(const x of se){const cat=c.categories.find(k=>k.id===x.categorie_id);z.append(n('p',jour(x.debut)+' · '+heure(x.debut)+' · '+(cat?.nom||'')+(x.lieu?' · '+x.lieu:''),'kc-ligne'));}
 z.append(n('h4','Derniers matchs'));if(!c.matchs.length)z.append(n('p','Aucun match enregistré.','kc-meta'));
 for(const m of c.matchs.slice(0,5))z.append(n('p',jour(m.date_match)+' · '+m.categorie+' · '+m.domicile+' '+K.scoreTexte(m)+' '+m.exterieur+' · '+m.statut,'kc-ligne'));
 if(c.statut==='Actif'){const a=n('p');const lien=b('Voir la page publique',()=>window.KokiClubs?.page(c.slug),'kc-lien');a.append(lien);z.append(a);}
}

// ───── Joueurs ─────
// Photo du joueur : fichier privé de l'académie, affiché par lien signé (1 h). Sans photo : numéro ou initiales.
function avatarJoueur(p,url,taille='m'){const av=n('span',undefined,'sp-logo sp-logo-'+taille+' kc-avatar-joueur');
 if(url){const i=n('img');i.src=url;i.alt='Photo de '+p.prenom+' '+p.nom;i.loading='lazy';av.append(i);}else av.append(n('span',p.numero!==null&&p.numero!==undefined?String(p.numero):K.initiales(p.prenom+' '+p.nom)));return av;}
const CHAMP_PHOTO=['photo','Photo du joueur (visage, de face)','file',{aide:'Privée par défaut : visible sur la page publique seulement si le parent a autorisé les photos.'}];
async function joueurs(z,c,recharger){
 const cats=optCategories(c);if(!cats.length){z.append(n('p',c.role==='responsable'?'Créez d’abord une catégorie (onglet Équipe).':'Aucune catégorie ne vous est confiée.','portail-note'));return;}
 const filtre=n('select');filtre.append(Object.assign(n('option','Toutes mes catégories'),{value:''}));for(const [v,t] of cats)filtre.append(Object.assign(n('option',t),{value:v}));
 const l=n('div',undefined,'kc-lignes');z.append(n('p','Fiches privées : visibles uniquement par le responsable et les entraîneurs de la catégorie.','kc-meta'),filtre,l);
 async function charger(){l.replaceChildren(n('p','Chargement…','kc-meta'));const xs=await agir(z,null,()=>api().api('players_list',{club_id:c.id,categorie_id:filtre.value||null}));if(!xs)return;const urls=await api().urls(xs.map(x=>x.photo_path)).catch(()=>new Map());l.replaceChildren();
  if(!xs.length)l.append(n('p','Aucun joueur.','kc-meta'));
  for(const p of xs){const r=b('',()=>fiche(z,c,p.id,recharger),'kc-ligne-bouton kc-ligne-joueur');const cat=c.categories.find(k=>k.id===p.categorie_id);const cs=p.consentement||{};
   const txt=n('span',undefined,'kc-ligne-texte');r.append(avatarJoueur(p,p.photo_path&&urls.get(p.photo_path),'s'),txt);
   txt.append(n('strong',(p.numero!==null?p.numero+' · ':'')+p.prenom+' '+p.nom),n('span',[cat?.nom,p.poste,p.annee_naissance].filter(Boolean).join(' · '),'kc-meta'),
    n('span',cs.statut==='actif'&&cs.nom_public!=='aucun'?'🌐 Public ('+K.NOM_PUBLIC[cs.nom_public].split(' (')[0]+')':'🔒 Privé','kc-badge'));l.append(r);}}
 filtre.onchange=charger;charger();
 z.append(details('➕ Ajouter un joueur',formulaire(null,[['categorie_id','Catégorie','select',{options:cats}],['prenom','Prénom','text',{requis:true,max:60}],['nom','Nom','text',{requis:true,max:60}],
  ['annee_naissance','Année de naissance','number',{min:1990,aide:'L’année suffit : la date complète n’est jamais demandée.'}],['poste','Poste','text',{max:40}],['numero','Numéro de maillot','number',{min:0}],CHAMP_PHOTO],async(v,bt,f)=>{
  const {photo,...rest}=v;let photo_path;if(photo){photo_path=await agir(z,bt,()=>api().image(c.id,photo));if(!photo_path)return;}
  if(await agir(z,bt,()=>api().api('player_save',{request_id:rid(),club_id:c.id,...rest,...(photo_path?{photo_path}:{})}),'Joueur ajouté (privé par défaut).')){f.reset();charger();}
  else if(photo_path)await api().supprimerImage(photo_path).catch(()=>{});})));
}
async function fiche(z,c,id,recharger){
 z.replaceChildren(n('p','Chargement…','kc-meta'));let p=await agir(z,null,()=>api().api('player_get',{id}));if(!p){z.append(b('← Retour',()=>joueurs(z.replaceChildren()||z,c,recharger),'kc-lien'));return;}
 const urls=p.photo_path?await api().urls([p.photo_path]).catch(()=>new Map()):new Map();
 const tete=n('div',undefined,'kc-fiche-tete');const id2=n('div');id2.append(n('h3',p.prenom+' '+p.nom,'sp-titre'),n('p',[c.categories.find(k=>k.id===p.categorie_id)?.nom,p.poste,p.numero!==null?'n° '+p.numero:null,p.annee_naissance].filter(Boolean).join(' · '),'kc-meta'));
 tete.append(avatarJoueur(p,p.photo_path&&urls.get(p.photo_path),'l'),id2);
 z.replaceChildren(b('← Liste des joueurs',()=>{z.replaceChildren();joueurs(z,c,recharger);},'kc-lien'),tete);
 if(!p.photo_path)z.append(n('p','Pas encore de photo : ajoutez-la dans « Modifier la fiche ».','kc-meta'));
 else z.append(b('Retirer la photo',async e=>{if(!confirm('Retirer la photo de '+p.prenom+' ?'))return;const ancien=p.photo_path;
  if(await agir(z,e.currentTarget,()=>api().api('player_save',{id:p.id,revision:p.revision,photo_path:''}),'Photo retirée.')){await api().supprimerImage(ancien).catch(()=>{});fiche(z,c,id,recharger);}},'kc-lien'));
 const st=p.statistiques||{};z.append(n('p','Présences : '+p.presences.presents+' / '+p.presences.seances+' · Buts : '+(st.but||0)+' · Passes : '+(st.passe||0),'kc-meta'));
 const cats=optCategories(c);
 z.append(details('✏️ Modifier la fiche',formulaire(null,[['categorie_id','Catégorie','select',{options:cats,valeur:p.categorie_id}],['prenom','Prénom','text',{requis:true,max:60,valeur:p.prenom}],['nom','Nom','text',{requis:true,max:60,valeur:p.nom}],
  ['annee_naissance','Année de naissance','number',{valeur:p.annee_naissance}],['poste','Poste','text',{max:40,valeur:p.poste}],['numero','Numéro','number',{valeur:p.numero}],[...CHAMP_PHOTO.slice(0,3),{aide:p.photo_path?'Choisir une nouvelle photo remplace l’ancienne.':CHAMP_PHOTO[3].aide}]],async(v,bt)=>{
  const {photo,...rest}=v;let photo_path;if(photo){photo_path=await agir(z,bt,()=>api().image(c.id,photo));if(!photo_path)return;}
  const ancien=photo_path&&p.photo_path;
  if(await agir(z,bt,()=>api().api('player_save',{id:p.id,revision:p.revision,...rest,...(photo_path?{photo_path}:{})}),'Fiche enregistrée.')){if(ancien)await api().supprimerImage(ancien).catch(()=>{});fiche(z,c,id,recharger);}
  else if(photo_path)await api().supprimerImage(photo_path).catch(()=>{});})));
 if(c.role==='responsable'){
  const rep=n('div');for(const g of p.representants){rep.append(n('p','👤 '+g.nom+(g.lien?' ('+g.lien+')':'')+(g.telephone?' · '+g.telephone:''),'kc-ligne'));}
  if(!p.representants.length)rep.append(n('p','Aucun représentant légal enregistré.','kc-meta'));
  rep.append(formulaire('Ajouter un représentant légal',[['nom','Nom complet','text',{requis:true,max:120}],['lien','Lien (mère, père, tuteur…)','text',{max:40}],['telephone','Téléphone','tel',{max:24}]],async(v,bt)=>{
   if(!K.telephoneValide(v.telephone)){statut(z,'Téléphone invalide.','erreur');return;}if(await agir(z,bt,()=>api().api('guardian_save',{player_id:p.id,...v}),'Représentant enregistré.'))fiche(z,c,id,recharger);}));
  z.append(details('👪 Parents / représentants légaux',rep));
  const cs=p.consentement;const co=n('div');
  co.append(n('p','Rien n’est public sans l’accord écrit (de préférence) d’un parent ou représentant légal. Le retrait est immédiat et masque aussi les anciennes photos.','kc-meta'));
  co.append(formulaire(null,[['nom_public','Nom affiché publiquement','select',{options:Object.entries(K.NOM_PUBLIC),valeur:cs.nom_public}],['photo','Photos autorisées','checkbox',{valeur:cs.photo}],
   ['video','Vidéos autorisées','checkbox',{valeur:cs.video}],['stats','Statistiques (buts, passes) autorisées','checkbox',{valeur:cs.stats}],
   ['recueilli_le','Date de l’accord','date',{valeur:cs.recueilli_le}],['mode','Forme de l’accord','select',{options:[['','—'],...Object.entries(K.MODES_CONSENTEMENT)],valeur:cs.mode||''}]],async(v,bt)=>{
   const tout=v.nom_public!=='aucun'||v.photo||v.video||v.stats;if(tout&&(!v.recueilli_le||!v.mode)){statut(z,'Indiquez la date et la forme de l’accord.','erreur');return;}
   if(await agir(z,bt,()=>api().api('consent_save',{player_id:p.id,revision:cs.revision,...v,recueilli_le:v.recueilli_le||null,mode:v.mode||null}),'Autorisations enregistrées.'))fiche(z,c,id,recharger);},'Enregistrer les autorisations'));
  if(cs.statut==='actif'&&(cs.nom_public!=='aucun'||cs.photo||cs.video||cs.stats))co.append(b('Retirer toutes les autorisations',async e=>{if(!confirm('Retirer toutes les autorisations ? Le joueur et ses photos disparaîtront immédiatement des pages publiques.'))return;
   if(await agir(z,e.target,()=>api().api('consent_revoke',{player_id:p.id,revision:cs.revision}),'Autorisations retirées.'))fiche(z,c,id,recharger);},'sp-bouton kc-danger'));
  z.append(details('🛡️ Autorisations parentales ('+(cs.statut==='actif'&&cs.nom_public!=='aucun'?'publiques':'privé')+')',co,true));
 }
 z.append(b(p.statut==='actif'?'Archiver (a quitté l’académie)':'Réintégrer',async e=>{if(p.statut==='actif'&&!confirm('Archiver ce joueur ? Sa fiche ne sera plus visible.'))return;
  if(await agir(z,e.target,()=>api().api('player_archive',{id:p.id,revision:p.revision,restaurer:p.statut!=='actif'}),'Fiche mise à jour.'))fiche(z,c,id,recharger);},'sp-bouton sp-bouton-clair'));
}

// ───── Entraînements ─────
async function seances(z,c,recharger){
 const cats=optCategories(c);if(!cats.length){z.append(n('p','Aucune catégorie disponible.','portail-note'));return;}
 z.append(details('➕ Programmer un entraînement',formulaire(null,[['categorie_id','Catégorie','select',{options:cats}],['debut','Début','datetime',{requis:true}],
  ['duree','Durée','select',{options:[['60','1 h'],['90','1 h 30'],['120','2 h'],['150','2 h 30']],valeur:'90'}],['lieu','Lieu','text',{max:120,placeholder:'Stade de Koki'}],['theme','Thème','text',{max:200}]],async(v,bt,f)=>{
  if(!v.debut){statut(z,'Indiquez la date et l’heure.','erreur');return;}const fin=new Date(Date.parse(v.debut)+Number(v.duree)*60000).toISOString();const {duree,...rest}=v;
  if(await agir(z,bt,()=>api().api('session_save',{request_id:rid(),club_id:c.id,...rest,fin}),'Entraînement programmé.')){f.reset();liste();}})));
 const l=n('div',undefined,'kc-lignes');z.append(l);
 async function liste(){const xs=await agir(z,null,()=>api().api('sessions_list',{club_id:c.id}));if(!xs)return;l.replaceChildren();if(!xs.length)l.append(n('p','Aucun entraînement sur la période.','kc-meta'));
  for(const s of xs.reverse()){const peut=c.role==='responsable'||c.categories_entraineur.includes(s.categorie_id);const a=n('article',undefined,'kc-carte-ligne');
   a.append(n('strong',jour(s.debut)+' · '+heure(s.debut)+'–'+heure(s.fin)+' · '+s.categorie),n('span',[s.lieu,s.theme,K.STATUTS_SEANCE[s.statut]].filter(Boolean).join(' · '),'kc-meta'));
   if(peut){const sel=n('select');for(const [v,t] of Object.entries(K.STATUTS_SEANCE))sel.append(Object.assign(n('option',t),{value:v,selected:v===s.statut}));
    sel.onchange=()=>agir(z,sel,()=>api().api('session_save',{id:s.id,revision:s.revision,categorie_id:s.categorie_id,debut:s.debut,fin:s.fin,statut:sel.value}),'Statut enregistré.').then(r=>r&&liste());
    a.append(sel,b('Présences',()=>presences(a,c,s),'sp-bouton sp-bouton-clair'));}l.append(a);}}
 liste();
}
async function presences(host,c,s){
 const [xs,deja]=await Promise.all([agir(host,null,()=>api().api('players_list',{club_id:c.id,categorie_id:s.categorie_id})),agir(host,null,()=>api().api('attendance_get',{session_id:s.id}))]);if(!xs)return;
 const etat=new Map((deja||[]).map(x=>[x.player_id,x.present]));const f=n('form',undefined,'kc-form');
 for(const p of xs){const l=n('label');const cb=n('input');cb.type='checkbox';cb.value=p.id;cb.checked=etat.get(p.id)??false;l.append(cb,' '+p.prenom+' '+p.nom);f.append(l);}
 const ok=n('button','Enregistrer les présences','sp-bouton');ok.type='submit';f.append(ok);
 f.onsubmit=async e=>{e.preventDefault();await agir(host,ok,()=>api().api('attendance_save',{session_id:s.id,presences:[...f.querySelectorAll('input')].map(i=>({player_id:i.value,present:i.checked}))}),'Présences enregistrées.');};
 host.querySelector('.kc-form')?.remove();host.append(f);
}

// ───── Matchs et compétitions ─────
async function matchs(z,c,recharger){
 const cats=optCategories(c);if(!cats.length){z.append(n('p','Aucune catégorie disponible.','portail-note'));return;}
 const comps=c.competitions.filter(x=>x.statut!=='archivée'&&(c.role==='responsable'||c.categories_entraineur.includes(x.categorie_id)));
 const cf=formulaire(null,[['categorie_id','Catégorie','select',{options:cats}],['competition_id','Compétition','select',{options:[['','Hors compétition (amical…)'],...comps.map(x=>[x.id,x.nom])]}],
  ['home_team_id','Équipe à domicile','select',{options:[['','—']]}],['away_team_id','Équipe à l’extérieur','select',{options:[['','—']]}],
  ['adversaire','Adversaire (hors compétition)','text',{max:80}],['a_domicile','Nous jouons à domicile','checkbox',{valeur:true}],['date_match','Date et heure','datetime',{requis:true}],['lieu','Lieu','text',{max:120}],['journee','Journée / tour','text',{max:40}]],
  async(v,bt,f)=>{const comp=!!v.competition_id;const data={club_id:c.id,categorie_id:v.categorie_id,date_match:v.date_match,lieu:v.lieu,journee:v.journee,
   ...(comp?{competition_id:v.competition_id,home_team_id:v.home_team_id,away_team_id:v.away_team_id}:{adversaire:v.adversaire,a_domicile:v.a_domicile})};
   if(comp&&(!v.home_team_id||!v.away_team_id||v.home_team_id===v.away_team_id)){statut(z,'Choisissez deux équipes différentes.','erreur');return;}if(!comp&&!v.adversaire){statut(z,'Indiquez l’adversaire.','erreur');return;}
   if(await agir(z,bt,()=>api().api('match_save',{request_id:rid(),...data}),'Match programmé.'))recharger('Matchs');},'Programmer le match');
 const selComp=cf.querySelector('[name=competition_id]'),selH=cf.querySelector('[name=home_team_id]'),selA=cf.querySelector('[name=away_team_id]');
 selComp.onchange=()=>{const eq=comps.find(x=>x.id===selComp.value)?.equipes||[];for(const s of [selH,selA]){s.replaceChildren(Object.assign(n('option','—'),{value:''}),...eq.map(e=>Object.assign(n('option',e.nom),{value:e.id})));}};
 z.append(details('➕ Programmer un match',cf));
 const cpf=formulaire(null,[['nom','Nom de la compétition','text',{requis:true,max:120}],['saison','Saison','text',{max:20,placeholder:'2026-2027'}],['type','Type','select',{options:K.TYPES_COMPETITION.map(x=>[x,x])}],
  ['categorie_id','Catégorie','select',{options:c.role==='responsable'?[['','Toutes'],...cats]:cats}],['organisateur','Organisateur','text',{max:120}]],async(v,bt)=>{
  if(await agir(z,bt,()=>api().api('competition_save',{request_id:rid(),club_id:c.id,...v,categorie_id:v.categorie_id||null}),'Compétition créée.'))recharger('Matchs');},'Créer');
 z.append(details('🏆 Compétitions ('+comps.length+')',(()=>{const d=n('div');d.append(cpf);for(const x of comps){const a=n('article',undefined,'kc-carte-ligne');
   a.append(n('strong',x.nom+(x.saison?' · '+x.saison:'')),n('span','Équipes : '+x.equipes.map(e=>e.nom).join(', '),'kc-meta'));
   const tf=formulaire(null,[['nom','Ajouter une équipe engagée','text',{requis:true,max:80}]],async(v,bt)=>{if(await agir(z,bt,()=>api().api('team_add',{competition_id:x.id,nom:v.nom}),'Équipe ajoutée.'))recharger('Matchs');},'Ajouter');
   const cl=b('Voir le classement',async e=>{const r=await agir(z,e.target,()=>api().api('standings',{competition_id:x.id}));if(!r)return;const p=n('pre',r.map((l,i)=>(i+1)+'. '+l.equipe+' — '+l.points+' pts ('+l.joues+' j., '+(l.diff>0?'+':'')+l.diff+')').join('\n'),'kc-pre');a.append(p);},'kc-lien');
   a.append(tf,cl);d.append(a);}return d;})()));
 const l=n('div',undefined,'kc-lignes');z.append(n('h4','Matchs'),l);if(!c.matchs.length)l.append(n('p','Aucun match.','kc-meta'));
 for(const m of c.matchs){const peut=c.role==='responsable'||c.categories_entraineur.includes(m.categorie_id);const a=n('article',undefined,'kc-carte-ligne');
  a.append(n('strong',m.domicile+' '+K.scoreTexte(m)+' '+m.exterieur),n('span',[jour(m.date_match)+' '+heure(m.date_match),m.categorie,m.competition,m.statut].filter(Boolean).join(' · '),'kc-meta'));
  if(peut){const sf=formulaire(null,[['statut','Statut','select',{options:K.STATUTS_MATCH.map(x=>[x,x]),valeur:m.statut}],['score_domicile','Score '+m.domicile,'number',{min:0,valeur:m.score_domicile}],['score_exterieur','Score '+m.exterieur,'number',{min:0,valeur:m.score_exterieur}]],async(v,bt)=>{
    if((v.statut==='Terminé'||v.statut==='En direct')&&(v.score_domicile===null||v.score_exterieur===null)){statut(z,'Indiquez les deux scores.','erreur');return;}
    if(await agir(z,bt,()=>api().api('match_save',{id:m.id,revision:m.revision,categorie_id:m.categorie_id,competition_id:m.competition_id,home_team_id:m.home_team_id,away_team_id:m.away_team_id,
     adversaire:m.adversaire,a_domicile:m.a_domicile,date_match:m.date_match,lieu:m.lieu,journee:m.journee,statut:v.statut,score_domicile:v.score_domicile,score_exterieur:v.score_exterieur}),'Match mis à jour.'))recharger('Matchs');},'Enregistrer le score');
   const but=b('⚽ Ajouter un buteur',async e=>{const xs=await agir(z,e.target,()=>api().api('players_list',{club_id:c.id,categorie_id:m.categorie_id}));if(!xs)return;
    const f=formulaire(null,[['player_id','Joueur','select',{options:xs.map(p=>[p.id,p.prenom+' '+p.nom])}],['type','Action','select',{options:[['but','But'],['passe','Passe décisive'],['carton_jaune','Carton jaune'],['carton_rouge','Carton rouge']]}],['minute','Minute','number',{min:0}]],
     async(v,bt)=>{await agir(z,bt,()=>api().api('match_event_add',{match_id:m.id,...v}),'Action enregistrée.');});e.target.replaceWith(f);},'kc-lien');
   a.append(details('Mettre à jour',sf),but);}
  l.append(a);}
}

// ───── Publications et médias ─────
async function publications(z,c,recharger){
 const champs=p=>[['type','Type','select',{options:K.TYPES_POST.map(x=>[x,x]),valeur:p?.type}],['titre','Titre','text',{requis:true,max:180,valeur:p?.titre}],['texte','Texte','textarea',{max:10000,valeur:p?.texte,rows:6}],
  ['evenement','Date de l’événement (si « Événement »)','datetime',{valeur:p?.evenement}],['lieu','Lieu','text',{max:120,valeur:p?.lieu}]];
 z.append(details('➕ Nouvelle publication',formulaire(null,champs(),async(v,bt)=>{if(v.type==='Événement'&&!v.evenement){statut(z,'Indiquez la date de l’événement.','erreur');return;}
  const r=await agir(z,bt,()=>api().api('post_save',{request_id:rid(),club_id:c.id,...v}),'Brouillon enregistré : ajoutez des photos puis publiez.');if(r)recharger('Publications');},'Enregistrer le brouillon')));
 if(c.statut!=='Actif')z.append(n('p','La publication sera possible dès que l’académie sera validée.','portail-note'));
 const tag=await agir(z,null,()=>api().api('tagging_list',{club_id:c.id}))||[];
 for(const p of c.publications){const a=n('article',undefined,'kc-carte-ligne');a.append(n('strong',p.titre),n('span',p.type+' · '+p.statut+(p.publication?' · '+jour(p.publication):'')+(p.relais!=='aucun'?' · relais '+p.relais:''),'kc-meta'));
  if(p.statut==='masqué')a.append(n('p','Masquée par la modération FAMpro Digital. Motif : '+(p.motif||''),'portail-note'));
  else{a.append(details('✏️ Modifier',formulaire(null,champs(p),async(v,bt)=>{if(await agir(z,bt,()=>api().api('post_save',{id:p.id,revision:p.revision,...v}),'Publication enregistrée.'))recharger('Publications');})));
   const pub=b(p.statut==='publié'?'Repasser en brouillon':'Publier',async e=>{if(await agir(z,e.target,()=>api().api('post_publish',{id:p.id,revision:p.revision,publier:p.statut!=='publié'}),p.statut==='publié'?'Retirée de la page publique.':'Publiée.'))recharger('Publications');},'sp-bouton');
   pub.disabled=p.statut!=='publié'&&c.statut!=='Actif';a.append(pub);
   if(p.statut==='publié'&&['aucun','refusé'].includes(p.relais))a.append(b('Proposer au fil Koki Connect',async e=>{if(await agir(z,e.target,()=>api().api('post_relay',{id:p.id,revision:p.revision}),'Proposition envoyée à FAMpro Digital.'))recharger('Publications');},'kc-lien'));
   const m=n('div');a.append(details('🖼️ Photos et vidéos',m));m.ontoggle=null;medias(m,c,p,tag,z);}
  z.append(a);}
}
async function medias(host,c,p,tag,z){
 const xs=await agir(z,null,()=>api().api('media_list',{club_id:c.id,post_id:p.id}))||[];const urls=await api().urls(xs.map(x=>x.storage_path)).catch(()=>new Map());
 const g=n('div',undefined,'kc-galerie');for(const x of xs){const f=n('figure',undefined,'kc-media');if(x.type==='photo'&&urls.get(x.storage_path)){const i=n('img');i.src=urls.get(x.storage_path);i.alt=x.legende;f.append(i);}else f.append(n('p','▶ YouTube'));
  f.append(n('figcaption',(x.public?'🌐 Visible':'🔒 Privé — autorisation parentale manquante ou publication non publiée')+(x.legende?' · '+x.legende:'')),
   b('Supprimer',async e=>{if(!confirm('Supprimer ce média ?'))return;const r=await agir(z,e.target,()=>api().api('media_delete',{id:x.id}));if(r){if(r.storage_path)await api().supprimerImage(r.storage_path).catch(()=>{});f.remove();}},'kc-lien'));g.append(f);}
 host.append(g);
 const opts=tag.map(t=>[t.id,t.nom+' ('+t.categorie+')'+(t.photo?' 📷✓':' 📷✗')+(t.video?' 🎥✓':' 🎥✗')]);
 const aide='Si des joueurs sont reconnaissables, désignez-les tous : le média ne sera public que si chacun a l’autorisation (📷 photo, 🎥 vidéo). Sinon il restera privé.';
 host.append(formulaire('Ajouter une photo',[['photo','Photo','file',{requis:true}],['legende','Légende','text',{max:300}],
  ['contient_mineurs','Des joueurs sont reconnaissables sur cette photo','checkbox',{valeur:true}],['joueurs','Joueurs reconnaissables','checks',{options:opts}]],async(v,bt,f)=>{
  if(!v.photo){statut(z,'Choisissez une photo.','erreur');return;}if(v.contient_mineurs&&!v.joueurs.length){statut(z,'Désignez les joueurs reconnaissables, ou décochez la case si personne n’est reconnaissable.','erreur');return;}
  const path=await agir(z,bt,()=>api().image(c.id,v.photo));if(!path)return;
  const r=await agir(z,bt,()=>api().api('media_add',{club_id:c.id,post_id:p.id,type:'photo',storage_path:path,legende:v.legende,contient_mineurs:v.contient_mineurs,joueurs:v.contient_mineurs?v.joueurs:[]}));
  if(!r){await api().supprimerImage(path).catch(()=>{});return;}statut(z,r.public?'Photo ajoutée.':'Photo ajoutée, mais privée : '+(p.statut!=='publié'?'publiez la publication.':'autorisation manquante.'),'ok');host.replaceChildren();medias(host,c,p,tag,z);},'Envoyer la photo'));
 host.lastChild.append(n('small',aide,'kc-aide'));
 host.append(formulaire('Ajouter une vidéo YouTube',[['url','Lien YouTube','url',{requis:true}],['legende','Légende','text',{max:300}],['contient_mineurs','Des joueurs sont reconnaissables','checkbox',{valeur:true}],['joueurs','Joueurs reconnaissables','checks',{options:opts}]],async(v,bt)=>{
  const y=K.youtubeId(v.url);if(!y){statut(z,'Lien YouTube non reconnu.','erreur');return;}if(v.contient_mineurs&&!v.joueurs.length){statut(z,'Désignez les joueurs reconnaissables.','erreur');return;}
  if(await agir(z,bt,()=>api().api('media_add',{club_id:c.id,post_id:p.id,type:'youtube',youtube_id:y,legende:v.legende,contient_mineurs:v.contient_mineurs,joueurs:v.contient_mineurs?v.joueurs:[]}),'Vidéo ajoutée.')){host.replaceChildren();medias(host,c,p,tag,z);}},'Ajouter la vidéo'));
}

// ───── Équipe : catégories, encadrement, membres, invitations, journal ─────
function equipe(z,c,recharger){
 const cats=n('div');for(const k of c.categories){const a=n('article',undefined,'kc-carte-ligne');a.append(n('strong',k.nom+(k.statut!=='active'?' (archivée)':'')),n('span',[k.annee_min&&k.annee_max?k.annee_min+'–'+k.annee_max:'',k.joueurs+' joueur(s)'].filter(Boolean).join(' · '),'kc-meta'));
   a.append(details('Modifier',formulaire(null,[['nom','Nom','text',{requis:true,max:40,valeur:k.nom}],['annee_min','Année min.','number',{valeur:k.annee_min}],['annee_max','Année max.','number',{valeur:k.annee_max}],['ordre','Ordre d’affichage','number',{valeur:k.ordre,min:0}],
    ['statut','État','select',{options:[['active','Active'],['archivée','Archivée']],valeur:k.statut}]],async(v,bt)=>{if(await agir(z,bt,()=>api().api('category_save',{id:k.id,revision:k.revision,...v}),'Catégorie enregistrée.'))recharger('Équipe');})));cats.append(a);}
 cats.append(formulaire('Nouvelle catégorie',[['nom','Nom (ex. U11)','text',{requis:true,max:40}],['annee_min','Née en (de)','number'],['annee_max','à','number'],['ordre','Ordre','number',{min:0}]],async(v,bt)=>{
  if(await agir(z,bt,()=>api().api('category_save',{request_id:rid(),club_id:c.id,...v,ordre:v.ordre??0}),'Catégorie créée.'))recharger('Équipe');},'Créer'));
 z.append(details('🗂️ Catégories ('+c.categories.length+')',cats,!c.categories.length));
 const optCats=c.categories.filter(k=>k.statut==='active').map(k=>[k.id,k.nom]);
 const st=n('div');const champsStaff=s=>[['prenom','Prénom','text',{requis:true,max:60,valeur:s?.prenom}],['nom','Nom','text',{requis:true,max:60,valeur:s?.nom}],['fonction','Fonction','text',{max:60,valeur:s?.fonction}],
  ['telephone','Téléphone (privé)','tel',{max:24,valeur:s?.telephone}],['public','Afficher sur la page publique','checkbox',{valeur:s?.public}],['categories','Catégories confiées','checks',{options:optCats,valeur:s?.categories||[]}],['photo','Photo','file']];
 const envoyerStaff=s=>async(v,bt)=>{if(!K.telephoneValide(v.telephone)){statut(z,'Téléphone invalide.','erreur');return;}const {photo,...rest}=v;let photo_path;if(photo){photo_path=await agir(z,bt,()=>api().image(c.id,photo));if(!photo_path)return;}
  if(await agir(z,bt,()=>api().api('staff_save',{...(s?{id:s.id,revision:s.revision}:{request_id:rid(),club_id:c.id}),...rest,...(photo_path?{photo_path}:{})}),'Encadrant enregistré.'))recharger('Équipe');};
 for(const s of c.staff){const a=n('article',undefined,'kc-carte-ligne');a.append(n('strong',s.prenom+' '+s.nom+(s.statut!=='actif'?' (archivé)':'')),n('span',[s.fonction,s.lie_a_un_compte?'compte lié':'sans compte',s.public?'public':'privé'].filter(Boolean).join(' · '),'kc-meta'),
   details('Modifier',formulaire(null,champsStaff(s),envoyerStaff(s))));st.append(a);}
 st.append(details('➕ Ajouter un encadrant',formulaire(null,champsStaff(),envoyerStaff())));
 z.append(details('🧑‍🏫 Encadrement ('+c.staff.length+')',st));
 const mb=n('div');for(const m of c.membres||[]){const a=n('article',undefined,'kc-carte-ligne');a.append(n('strong',K.ROLES[m.role]+(m.moi?' (vous)':'')),n('span',m.statut+' · depuis le '+jour(m.depuis),'kc-meta'));
   if(m.statut==='actif'){const sel=n('select');for(const [v,t] of Object.entries(K.ROLES))sel.append(Object.assign(n('option',t),{value:v,selected:v===m.role}));
    sel.onchange=()=>agir(z,sel,()=>api().api('member_update',{id:m.id,revision:m.revision,role:sel.value}),'Rôle modifié.').then(r=>r&&recharger('Équipe'));
    a.append(sel,b('Retirer',async e=>{if(!confirm('Retirer ce membre de l’académie ?'))return;if(await agir(z,e.target,()=>api().api('member_update',{id:m.id,revision:m.revision,statut:'retiré'}),'Membre retiré.'))recharger('Équipe');},'kc-lien'));}mb.append(a);}
 const inv=formulaire('Inviter une personne',[['role','Rôle','select',{options:Object.entries(K.ROLES)}],['staff_id','Fiche d’encadrant à relier (entraîneur)','select',{options:[['','—'],...c.staff.filter(s=>s.statut==='actif').map(s=>[s.id,s.prenom+' '+s.nom])]}]],async(v,bt)=>{
  const r=await agir(z,bt,()=>api().api('invite',{club_id:c.id,role:v.role,staff_id:v.staff_id||null}));if(!r)return;
  const box=n('div',undefined,'kc-code');box.append(n('p','Code à transmettre (affiché une seule fois, valable 72 h) :'),n('strong',r.code,'kc-code-valeur'));
  const w=n('a','Envoyer par WhatsApp','sp-bouton');w.href=K.lienWhatsapp(K.messageInvitation(c.nom,r.role,r.code));w.target='_blank';w.rel='noopener';box.append(w);inv.after(box);},'Créer un code');
 mb.append(inv);for(const i of c.invitations||[])mb.append(n('p','Invitation '+K.ROLES[i.role]+' en attente jusqu’au '+jour(i.expire),'kc-meta'),b('Annuler',async e=>{if(await agir(z,e.target,()=>api().api('invitation_cancel',{id:i.id}),'Invitation annulée.'))recharger('Équipe');},'kc-lien'));
 z.append(details('👥 Membres et invitations',mb));
 const j=n('div');j.append(b('Afficher le journal',async e=>{const xs=await agir(z,e.target,()=>api().api('audit_list',{club_id:c.id}));if(!xs)return;e.target.replaceWith(...(xs.length?xs:[{}]).map(x=>n('p',x.date?new Date(x.date).toLocaleString('fr-FR')+' · '+x.operation+' · '+x.objet+(x.statut?' · '+x.statut:'')+(x.par_moi?' · vous':''):'Aucune opération.','kc-ligne')));},'kc-lien'));
 z.append(details('📜 Journal des modifications',j));
}

// ───── Profil public de l'académie ─────
function academie(z,c,recharger){
 z.append(formulaire('Page publique de l’académie',[['nom','Nom','text',{requis:true,max:120,valeur:c.nom}],['type','Type','select',{options:K.TYPES.map(x=>[x,x]),valeur:c.type}],['discipline','Discipline','select',{options:K.DISCIPLINES.map(x=>[x,x]),valeur:c.discipline}],
  ['presentation','Présentation','textarea',{max:3000,valeur:c.presentation}],['historique','Historique','textarea',{max:5000,valeur:c.historique}],['activites','Activités','textarea',{max:2000,valeur:c.activites}],
  ['adresse','Adresse / terrain','text',{max:200,valeur:c.adresse}],['telephone','Téléphone public','tel',{max:24,valeur:c.telephone}],['whatsapp','WhatsApp public','tel',{max:24,valeur:c.whatsapp}],
  ['couleur1','Couleur principale','color',{valeur:(c.couleurs||[])[0]||'#087a3d'}],['couleur2','Couleur secondaire','color',{valeur:(c.couleurs||[])[1]||'#f28c28'}],['logo','Logo','file']],async(v,bt)=>{
  if(!K.telephoneValide(v.telephone)||!K.telephoneValide(v.whatsapp)){statut(z,'Numéro invalide.','erreur');return;}
  const {logo,couleur1,couleur2,...rest}=v;let logo_path;if(logo){logo_path=await agir(z,bt,()=>api().image(c.id,logo));if(!logo_path)return;}
  if(await agir(z,bt,()=>api().api('club_update',{club_id:c.id,revision:c.revision,...rest,couleurs:[couleur1,couleur2].filter(K.couleurValide),...(logo_path?{logo_path}:{})}),'Page enregistrée.'))recharger('Académie');}));
}

window.KokiClubSpace=Object.freeze({ouvrir,club});
})();
