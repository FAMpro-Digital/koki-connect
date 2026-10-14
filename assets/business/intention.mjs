// Parcours d'inscription professionnelle : le type d'activité choisi AVANT l'inscription (commerçant, prestataire,
// chauffeur) est conservé sur l'appareil ET dans le lien de confirmation (« ?koki-pro=… »), pour que l'utilisateur
// arrive directement sur le bon formulaire après la confirmation de son e-mail — même si le lien s'ouvre dans un
// autre navigateur que celui de l'inscription (application Mail de l'iPhone, Gmail sur Android).
// Aucune donnée personnelle n'est conservée ici : seulement le type choisi et, à part, un brouillon de fiche par compte.
export const TYPES=Object.freeze({
 commercant:Object.freeze({label:'Commerçant',description:'Vendre vos produits dans une boutique en ligne.',module:'commerce',profil:'Commerçant',icone:'🏪'}),
 prestataire:Object.freeze({label:'Prestataire de services',description:'Proposer votre métier : plomberie, couture, réparation…',module:'commerce',profil:'Prestataire de services',icone:'🛠️'}),
 chauffeur:Object.freeze({label:'Chauffeur',description:'Recevoir des courses avec votre moto, taxi, voiture ou minicar.',module:'transport',icone:'🚕'})
});
const CLE='koki.intention.pro.v1',DUREE=30*86400000,PARAM='koki-pro';
const valide=t=>Object.prototype.hasOwnProperty.call(TYPES,t);
export function lire(storage,now=Date.now()){try{const d=JSON.parse(storage?.getItem(CLE)||'null');if(d&&valide(d.type)&&Number.isFinite(d.at)&&now-d.at<DUREE)return d.type;}catch{}return null;}
export function enregistrer(storage,type,now=Date.now()){if(!valide(type))throw Error('Type d’activité inconnu.');try{storage?.setItem(CLE,JSON.stringify({type,at:now}));return true;}catch{return false;}}
export function effacer(storage){try{storage?.removeItem(CLE);}catch{}}
export function depuisURL(href){try{const t=new URL(href).searchParams.get(PARAM);return valide(t)?t:null;}catch{return null;}}
// Lien de retour : la page publique elle-même (même adresse, sans fragment), avec le type choisi.
export function urlRetour(href,type){const u=new URL(href);u.hash='';for(const k of [...u.searchParams.keys()])if(k!==PARAM)u.searchParams.delete(k);if(valide(type))u.searchParams.set(PARAM,type);else u.searchParams.delete(PARAM);return u.href;}
export function sansParametre(href){const u=new URL(href);u.searchParams.delete(PARAM);return u.pathname+u.search+u.hash;}
// Retour d'un lien Supabase Auth : jetons de session ou erreur (lien expiré, déjà utilisé…), dans le fragment ou la requête.
export function retourAuth(href){
 let u;try{u=new URL(href);}catch{return {session:false,type:null,erreur:null};}
 const h=new URLSearchParams(u.hash.replace(/^#/,'')),q=u.searchParams,get=k=>h.get(k)??q.get(k);
 const code=get('error_code')||get('error');
 return {session:!!(h.get('access_token')||q.get('code')),type:get('type'),erreur:code?{code,description:get('error_description')||''}:null};
}
export function messageLien(erreur){
 if(!erreur)return '';
 if(erreur.code==='otp_expired')return 'Ce lien de confirmation a expiré ou a déjà été utilisé. Si votre compte est déjà confirmé, connectez-vous ; sinon, demandez un nouvel e-mail de confirmation ci-dessous.';
 if(erreur.code==='access_denied')return 'Le lien n’a pas pu être validé. Connectez-vous, ou demandez un nouvel e-mail de confirmation ci-dessous.';
 return 'Le lien de confirmation n’a pas pu être utilisé. Connectez-vous, ou demandez un nouvel e-mail de confirmation ci-dessous.';
}
// Brouillons : un par compte et par formulaire, sur cet appareil uniquement (jamais de mot de passe, ni photo).
const cleBrouillon=(uid,forme)=>'koki.brouillon.'+forme+'.v1.'+uid;
export function lireBrouillon(storage,uid,forme,now=Date.now()){if(!uid)return null;try{const d=JSON.parse(storage?.getItem(cleBrouillon(uid,forme))||'null');if(d&&d.valeurs&&typeof d.valeurs==='object'&&Number.isFinite(d.at)&&now-d.at<DUREE)return d;}catch{}return null;}
export function ecrireBrouillon(storage,uid,forme,valeurs,etape=0,now=Date.now()){if(!uid)return false;try{storage?.setItem(cleBrouillon(uid,forme),JSON.stringify({valeurs,etape,at:now}));return true;}catch{return false;}}
export function effacerBrouillon(storage,uid,forme){if(!uid)return;try{storage?.removeItem(cleBrouillon(uid,forme));}catch{}}
