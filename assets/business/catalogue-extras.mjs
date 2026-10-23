// Catalogue Commerces & Services : fonctions pures ajoutées (sans interface, testables).
// Ouvert / Fermé, distance, favoris produits, partage, stock bas, copie hors connexion du catalogue.

// ---------- Ouvert / Fermé ----------
// Les horaires sont saisis librement par le commerçant (« Lundi au samedi 8 h–19 h ; dimanche 9 h–13 h »).
// On ne conclut que si le texte est compris ; sinon null (aucune pastille affichée, jamais de fausse information).
const JOURS={dim:0,lun:1,mar:2,mer:3,jeu:4,ven:5,sam:6};
const sansAccent=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const RE_JOUR=/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim)\b/g;
const RE_HEURE='(\\d{1,2})\\s*(?:h|:)\\s*(\\d{2})?';
const RE_PLAGE=new RegExp(RE_HEURE+'\\s*(?:-|–|—|a|au|jusqu\'?a|jusqu\'?au|to)\\s*'+RE_HEURE,'g');
function joursDe(texte){
 const t=sansAccent(texte).replace(/\bsauf\b[^;,]*/g,'');
 const toks=[...t.matchAll(RE_JOUR)].map(m=>({j:JOURS[m[1].slice(0,3)],debut:m.index,fin:m.index+m[0].length}));
 const set=new Set();
 for(let i=0;i<toks.length;i++){
  const suiv=toks[i+1];
  const lien=suiv?t.slice(toks[i].fin,suiv.debut):null;
  if(suiv&&/^\s*(?:au|a|-|–|—|jusqu'?a|jusqu'?au)\s*$/.test(lien)){
   for(let j=toks[i].j,n=0;n<7;n++,j=(j+1)%7){set.add(j);if(j===suiv.j)break;}
   i++;
  }else set.add(toks[i].j);
 }
 return set;
}
function joursExclus(texte){
 const m=sansAccent(texte).match(/\bsauf\b([^;,]*)/);
 return m?joursDe(m[1]):new Set();
}
// Retourne true (ouvert), false (fermé) ou null (horaires absents ou incompris). `date` en UTC : Koki (Africa/Dakar) est à UTC+0.
export function ouvertMaintenant(horaires,date=new Date()){
 const brut=String(horaires??'').trim();if(!brut)return null;
 const t=sansAccent(brut);
 if(/24\s*h?\s*(?:\/|sur)\s*24|24h24|jour et nuit/.test(t))return true;
 const jour=date.getUTCDay(),minutes=date.getUTCHours()*60+date.getUTCMinutes();
 const segments=brut.split(/[;\n,]+/).map(s=>s.trim()).filter(Boolean);
 let derniers=null,trouve=false,ouvert=false;
 for(const seg of segments){
  const s=sansAccent(seg);
  const plages=[...s.matchAll(RE_PLAGE)].map(m=>[+m[1]*60+(+m[2]||0),+m[3]*60+(+m[4]||0)]).filter(([a,b])=>a<=24*60&&b<=24*60);
  let jours=joursDe(seg);
  if(!jours.size)jours=derniers&&!/tous les jours/.test(s)?derniers:new Set([0,1,2,3,4,5,6]);
  else derniers=jours;
  if(/tous les jours|7 ?j ?\/ ?7|chaque jour/.test(s))jours=new Set([0,1,2,3,4,5,6]);
  for(const x of joursExclus(seg))jours.delete(x);
  if(!plages.length)continue;
  trouve=true;
  if(!jours.has(jour))continue;
  for(const [a,b] of plages)if(a<=b?minutes>=a&&minutes<b:minutes>=a||minutes<b)ouvert=true;
 }
 return trouve?ouvert:null;
}
export function etatOuverture(x,idx,date=new Date()){
 const h=x.horaires||idx?.boutique?.(x)?.horaires||(x.kind!=='professionnels'?idx?.vendeur?.(x)?.horaires:'')||'';
 return ouvertMaintenant(h,date);
}

// ---------- Distance ----------
export function distanceKm(a,b){
 if(!a||!b||![a.latitude,a.longitude,b.latitude,b.longitude].every(Number.isFinite))return null;
 const r=Math.PI/180,dLat=(b.latitude-a.latitude)*r,dLon=(b.longitude-a.longitude)*r;
 const h=Math.sin(dLat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dLon/2)**2;
 return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function libelleDistance(km){
 if(!Number.isFinite(km))return '';
 return km<1?Math.max(10,Math.round(km*100)*10)+' m':(km<10?km.toFixed(1).replace('.',','):String(Math.round(km)))+' km';
}
export function positionDe(x,idx){return x.localisation||idx.boutique(x)?.localisation||idx.vendeur(x)?.localisation||null;}

// ---------- Favoris (sur l'appareil, séparés des favoris de l'actualité) ----------
export const CLE_FAVORIS='koki.commerce.favoris';
const UUID=/^[0-9a-f-]{36}$/;
export function lireFavoris(storage){try{const l=JSON.parse(storage?.getItem(CLE_FAVORIS)||'[]');return new Set((Array.isArray(l)?l:[]).filter(i=>typeof i==='string'&&UUID.test(i)).slice(0,300));}catch{return new Set();}}
export function basculerFavori(storage,id){
 const f=lireFavoris(storage);if(!UUID.test(String(id)))return f;
 if(f.has(id))f.delete(id);else f.add(id);
 try{storage?.setItem(CLE_FAVORIS,JSON.stringify([...f].slice(-300)));}catch{}
 return f;
}

// ---------- Partage ----------
export function lienFiche(id,base){
 try{const u=new URL(base||(globalThis.location?.origin+globalThis.location?.pathname));u.search='';u.hash='';u.searchParams.set('fiche',id);return u.href;}catch{return '';}
}
export function messagePartage(x,idx,base){
 const v=idx.vendeur?.(x),b=idx.boutique?.(x);
 const ou=[b&&b!==x?b.nom:'',v&&v!==x&&v!==b?v.nom:''].filter(Boolean)[0];
 const prix=x.kind==='produits'&&Number.isInteger(x.prix)?' — '+new Intl.NumberFormat('fr-FR').format(x.prix)+' FCFA':'';
 return 'Découvrez « '+x.nom+' »'+prix+(ou?' chez '+ou:'')+' sur Koki Connect : '+lienFiche(x.id,base);
}
export function lienPartageWhatsApp(x,idx,base){return 'https://wa.me/?text='+encodeURIComponent(messagePartage(x,idx,base));}

// ---------- Stock bas (espace commerçant) ----------
export const SEUIL_STOCK_BAS=3;
export function niveauStock(stock,seuil=SEUIL_STOCK_BAS){
 if(!Number.isInteger(stock)||stock<0)return 'inconnu';
 return stock===0?'epuise':stock<=seuil?'bas':'ok';
}
export function produitsStockBas(rows,seuil=SEUIL_STOCK_BAS){
 return (Array.isArray(rows)?rows:[]).filter(r=>r?.kind==='produits'&&!['Archivé','Supprimé'].includes(r.statut)&&['bas','epuise'].includes(niveauStock(r.payload?.stock,seuil)));
}

// ---------- Copie du catalogue hors connexion ----------
// Contenu public uniquement (le serveur ne renvoie déjà que les fiches publiables). Limite de taille : pas de saturation du téléphone.
export const CLE_CATALOGUE='koki.commerce.catalogue';
export const TAILLE_MAX_COPIE=1500000;
export function sauverCatalogue(storage,rows,maintenant=Date.now()){
 try{const json=JSON.stringify({version:1,date:maintenant,rows});if(json.length>TAILLE_MAX_COPIE)return false;storage?.setItem(CLE_CATALOGUE,json);return true;}catch{return false;}
}
export function lireCatalogue(storage){
 try{const c=JSON.parse(storage?.getItem(CLE_CATALOGUE)||'null');if(c?.version===1&&Array.isArray(c.rows)&&Number.isFinite(c.date))return c;}catch{}
 return null;
}
export function libelleDate(ms){try{return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Dakar'}).format(new Date(ms));}catch{return '';}}
