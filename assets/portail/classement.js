// Classement des publications : fraîcheur + popularité (j'aime, commentaires) + centres d'intérêt de l'utilisateur.
// Les centres d'intérêt restent sur l'appareil (localStorage) : rubriques et catégories des publications ouvertes.
// Rien n'est envoyé au serveur. Sans donnée, l'ordre reste celui des dates de publication.
(function(root){'use strict';
const CLE='koki.interets.v1',JOUR=864e5,DEMI_VIE=30*JOUR,PLAFOND=50;
function vide(){return {types:{},categories:{},maj:0};}
function propre(o){const out={};if(o&&typeof o==='object')for(const [k,v] of Object.entries(o).slice(0,60))if(typeof k==='string'&&k.length<=80&&typeof v==='number'&&Number.isFinite(v)&&v>0)out[k]=Math.min(v,PLAFOND);return out;}
function lire(stockage){try{const x=JSON.parse(stockage.getItem(CLE));if(x&&typeof x==='object')return {types:propre(x.types),categories:propre(x.categories),maj:Number.isFinite(x.maj)?x.maj:0};}catch(_){}return vide();}
// Les anciens intérêts s'effacent peu à peu : moitié moins de poids tous les 30 jours.
function vieillir(i,maintenant){if(!i.maj||maintenant<=i.maj)return i;const f=Math.pow(0.5,(maintenant-i.maj)/DEMI_VIE);const reduit=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v*f]).filter(([,v])=>v>=0.05));return {types:reduit(i.types),categories:reduit(i.categories),maj:maintenant};}
function noter(x,stockage,maintenant=Date.now()){if(!x||typeof x.type!=='string'||x.type==='Publicités')return;try{const i=vieillir(lire(stockage),maintenant);i.maj=maintenant;i.types[x.type]=Math.min(PLAFOND,(i.types[x.type]||0)+1);if(typeof x.categorie==='string'&&x.categorie)i.categories[x.categorie]=Math.min(PLAFOND,(i.categories[x.categorie]||0)+1);stockage.setItem(CLE,JSON.stringify(i));}catch(_){}}
function oublier(stockage){try{stockage.removeItem(CLE);}catch(_){}}
function affinite(x,i){if(!i)return 0;const part=(o,k)=>{const max=Math.max(0,...Object.values(o));return max>0&&k&&o[k]?o[k]/max:0;};return (part(i.types,x.type)+part(i.categories,x.categorie))/2;}
function popularite(s){if(!s)return 0;const n=(Number(s.likes)||0)+2*(Number(s.comments)||0);return n>0?Math.min(1,Math.log1p(n)/Math.log(21)):0;}
// Note entre 0 et ~2,3 : une publication du jour vaut 1 ; l'intérêt ajoute jusqu'à 0,6 ; la popularité jusqu'à 0,7 (et s'efface en un mois).
function note(x,{interets=null,social=null,maintenant=Date.now()}={}){const age=Math.max(0,(maintenant-Date.parse(x.publication))/JOUR)||0;return Math.exp(-age/7)+0.6*affinite(x,interets)+0.7*popularite(social&&social.get?social.get(x.id):null)*Math.exp(-age/30);}
function classer(xs,contexte={}){return xs.map((x,i)=>({x,i,n:note(x,contexte)})).sort((a,b)=>b.n-a.n||a.i-b.i).map(o=>o.x);}
// À lire aussi : même rubrique d'abord, même catégorie en tête, jamais la publication ouverte ni les publicités.
function similaires(x,xs,contexte={},max=3){const autres=xs.filter(y=>y&&y.id!==x.id&&y.type!=='Publicités'&&(y.type===x.type||(!!x.categorie&&y.categorie===x.categorie)));const proche=y=>(y.type===x.type?1:0)+(x.categorie&&y.categorie===x.categorie?1:0);return classer(autres,contexte).map((y,i)=>({y,i})).sort((a,b)=>proche(b.y)-proche(a.y)||a.i-b.i).slice(0,max).map(o=>o.y);}
const api={CLE,lire,noter,oublier,affinite,popularite,note,classer,similaires,vieillir};
root.KokiClassement=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
