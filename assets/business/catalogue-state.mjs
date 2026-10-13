// Données du catalogue Commerces & Services (sans interface, testable).
// Défense en profondeur : le serveur ne renvoie déjà que les fiches publiables ; ici on ne garde en plus
// que les champs publics connus et seulement les éléments dont toute la chaîne parente est publiée.
import './commerce-contract.js';
const C=globalThis.KokiCommerceContract;
export const ONGLETS=Object.freeze([{kind:'professionnels',label:'Commerces'},{kind:'boutiques',label:'Boutiques'},{kind:'produits',label:'Produits'},{kind:'services',label:'Services'}]);
const CHAMPS={
 professionnels:['nom','description','categorie','type','telephone','whatsapp','adresse','village','zone','horaires','localisation'],
 boutiques:['nom','description','categorie','whatsapp','adresse','village','horaires','localisation'],
 produits:['nom','description','categorie','prix','ancien_prix','stock'],
 services:['nom','description','categorie','prix','tarif','zone']
};
const CHEMIN_PHOTO=/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
export const texte=v=>String(v??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('fr').trim();
const point=v=>v&&Number.isFinite(v.latitude)&&Number.isFinite(v.longitude)&&Math.abs(v.latitude)<=90&&Math.abs(v.longitude)<=180?{latitude:v.latitude,longitude:v.longitude}:null;

function nettoyer(row,ordre){
 if(!row||typeof row.id!=='string'||!CHAMPS[row.kind]||typeof row.nom!=='string')return null;
 // Ancien serveur sans statut : déjà filtré côté serveur. Sinon, statut publiable uniquement.
 if(row.statut!==undefined&&!C.estPublic(row.kind,row.statut))return null;
 const x={id:row.id,kind:row.kind,parent_id:typeof row.parent_id==='string'?row.parent_id:null,statut:row.statut??(row.kind==='produits'?(row.stock>0?'Disponible':'Épuisé'):row.kind==='services'?'Disponible':'Actif'),ordre};
 for(const k of CHAMPS[row.kind])if(row[k]!==undefined&&row[k]!==null)x[k]=row[k];
 if(x.localisation!==undefined)x.localisation=point(x.localisation)||undefined;
 for(const k of ['prix','ancien_prix','stock'])if(x[k]!==undefined&&!(Number.isInteger(x[k])&&x[k]>=0))delete x[k];
 if(x.ancien_prix!==undefined&&!(x.prix<x.ancien_prix))delete x.ancien_prix;
 for(const k of ['telephone','whatsapp'])if(x[k]!==undefined&&!C.normaliserTelephone(x[k]))delete x[k];
 x.photos=[...new Set([...(Array.isArray(row.photos)?row.photos:[]),row.image_path].filter(p=>typeof p==='string'&&CHEMIN_PHOTO.test(p)))].slice(0,C.maxPhotos);
 return x;
}
// Anciennes photos (dossier = compte) : même format de chemin, toujours affichées.
export function indexCatalogue(rows){
 const propres=(Array.isArray(rows)?rows:[]).map(nettoyer).filter(Boolean);
 const byId=new Map(propres.map(x=>[x.id,x]));
 const publie=x=>{const p=x.parent_id&&byId.get(x.parent_id);
  if(x.kind==='professionnels')return true;
  if(x.kind==='boutiques'||x.kind==='services')return p?.kind==='professionnels';
  return p?.kind==='boutiques'&&byId.get(p.parent_id)?.kind==='professionnels';};
 const liste=propres.filter(publie);const ok=new Map(liste.map(x=>[x.id,x]));
 const idx={liste,get:id=>ok.get(id)||null,
  enfants:(id,kind)=>liste.filter(x=>x.parent_id===id&&(!kind||x.kind===kind)),
  boutique:x=>x.kind==='produits'?ok.get(x.parent_id):x.kind==='boutiques'?x:null,
  vendeur:x=>x.kind==='professionnels'?x:x.kind==='produits'?ok.get(ok.get(x.parent_id)?.parent_id):ok.get(x.parent_id)};
 return idx;
}
export function villageDe(x,idx){return x.village||idx.boutique(x)?.village||idx.vendeur(x)?.village||'';}
function recherche(x,idx){const b=idx.boutique(x),v=idx.vendeur(x);return texte([x.nom,x.categorie,x.description,x.zone,x.adresse,villageDe(x,idx),b&&b!==x?b.nom:'',v&&v!==x?v.nom:'',v?.categorie,v?.type].join(' '));}
export function categories(idx,kind){return [...new Set(idx.liste.filter(x=>x.kind===kind&&x.categorie).map(x=>x.categorie))].sort((a,b)=>a.localeCompare(b,'fr'));}
export function villages(idx,kind){return [...new Set(idx.liste.filter(x=>x.kind===kind).map(x=>villageDe(x,idx)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));}
export function disponible(x){return x.kind==='produits'?x.statut==='Disponible'&&Number.isInteger(x.stock)&&x.stock>0:x.kind==='services'?x.statut==='Disponible':true;}
export function filtrer(idx,{kind='produits',query='',categorie='',village='',disponibles=false,tri='recent'}={}){
 const termes=texte(query).split(/\s+/).filter(Boolean);
 const res=idx.liste.filter(x=>x.kind===kind&&(!categorie||x.categorie===categorie)&&(!village||villageDe(x,idx)===village)&&(!disponibles||disponible(x))&&termes.every(t=>recherche(x,idx).includes(t)));
 const prix=x=>Number.isInteger(x.prix)?x.prix:Infinity;
 if(tri==='prix')res.sort((a,b)=>prix(a)-prix(b)||a.ordre-b.ordre);
 else if(tri==='prix-desc')res.sort((a,b)=>(Number.isInteger(b.prix)?b.prix:-1)-(Number.isInteger(a.prix)?a.prix:-1)||a.ordre-b.ordre);
 else if(tri==='nom')res.sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
 else res.sort((a,b)=>a.ordre-b.ordre);
 return res;
}
export function compter(idx,options){return Object.fromEntries(ONGLETS.map(o=>[o.kind,filtrer(idx,{...options,kind:o.kind,categorie:'',tri:'recent'}).length]));}
// Contacts : numéro d'appel de la fiche ; WhatsApp de la boutique, sinon de la fiche, sinon son téléphone.
export function contacts(x,idx){
 const v=idx.vendeur(x),b=idx.boutique(x);if(!v)return null;
 const whatsapp=b?.whatsapp||v.whatsapp||v.telephone;
 return {vendeur:v.nom,boutique:b?.nom||null,appel:C.lienAppel(v.telephone),telephone:C.afficherTelephone(v.telephone),whatsapp:C.lienWhatsApp(whatsapp),numeroWhatsApp:C.afficherTelephone(whatsapp),numero:C.normaliserTelephone(whatsapp)};
}
export function lienCommande(x,idx,quantite=1){
 if(x.kind!=='produits'||!disponible(x))return null;const c=contacts(x,idx);if(!c?.numero)return null;
 const q=Math.max(1,Math.min(Number.isInteger(quantite)?quantite:1,x.stock));
 return C.lienCommandeWhatsApp(c.numero,{produit:x.nom,prix:x.prix,boutique:c.boutique||c.vendeur,quantite:q});
}
export function lienDevis(x,idx){if(x.kind!=='services')return null;const c=contacts(x,idx);if(!c?.numero)return null;return C.lienWhatsApp(c.numero,'Bonjour '+c.vendeur+', je souhaite un devis via Koki Connect pour : '+x.nom+'.');}
export function etiquetteDisponibilite(x){if(x.kind==='produits')return disponible(x)?'Disponible':'Épuisé';if(x.kind==='services')return 'Disponible';return '';}
export function promotion(x){return Number.isInteger(x.ancien_prix)&&Number.isInteger(x.prix)&&x.ancien_prix>x.prix?Math.round((1-x.prix/x.ancien_prix)*100):0;}
export function lienCarte(x,idx){const p=x.localisation||idx.boutique(x)?.localisation||idx.vendeur(x)?.localisation;if(!p)return null;return 'https://www.openstreetmap.org/?mlat='+p.latitude+'&mlon='+p.longitude+'#map=18/'+p.latitude+'/'+p.longitude;}
// Panier : une seule boutique. Message WhatsApp récapitulatif (prix indicatifs, paiement à la réception).
export function totalPanier(lignes){return (Array.isArray(lignes)?lignes:[]).reduce((s,l)=>s+(Number.isInteger(l.prix)&&Number.isInteger(l.quantite)?l.prix*l.quantite:0),0);}
export function lienPanierWhatsApp(lignes,idx,{mode='retrait',adresse=''}={}){
 if(!Array.isArray(lignes)||!lignes.length)return null;const p=idx.get(lignes[0].id);if(!p)return null;const c=contacts(p,idx);if(!c?.numero)return null;
 const texte=['Bonjour '+(c.boutique||c.vendeur)+', je souhaite commander via Koki Connect :',...lignes.map(l=>'- '+l.quantite+' × '+l.nom+' ('+C.formaterPrix(l.prix)+')'),'Total indicatif : '+C.formaterPrix(totalPanier(lignes)),mode==='livraison'?'Livraison : '+(String(adresse).trim()||'adresse à préciser'):'Retrait en boutique','Paiement à la réception. Merci de confirmer la disponibilité.'].join('\n');
 return C.lienWhatsApp(c.numero,texte);
}
// Promotions mises en avant : produits disponibles avec un ancien prix, plus forte remise d'abord.
export function promotions(idx,max=10){return idx.liste.filter(x=>x.kind==='produits'&&disponible(x)&&promotion(x)>0).sort((a,b)=>promotion(b)-promotion(a)||a.ordre-b.ordre).slice(0,max);}
