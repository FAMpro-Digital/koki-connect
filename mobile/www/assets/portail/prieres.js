// Heures de prière calculées sur l'appareil pour Koki (aucun appel réseau) : méthode astronomique classique,
// angles de la Ligue islamique mondiale (Fajr 18°, Isha 17°), Asr à une longueur d'ombre. Horaires indicatifs :
// la mosquée du quartier fait foi. Le Sénégal est à l'heure UTC toute l'année.
(function(root){'use strict';
const KOKI={latitude:15.505949,longitude:-15.9919614,fuseau:0};
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI,tour=(a,n)=>{a=a-n*Math.floor(a/n);return a<0?a+n:a;};
function jourJulien(annee,mois,jour){if(mois<=2){annee-=1;mois+=12;}const A=Math.floor(annee/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(annee+4716))+Math.floor(30.6001*(mois+1))+jour+B-1524.5;}
function soleil(jd){const D=jd-2451545,g=tour(357.529+0.98560028*D,360),q=tour(280.459+0.98564736*D,360),L=tour(q+1.915*Math.sin(rad(g))+0.020*Math.sin(rad(2*g)),360),e=23.439-0.00000036*D;
 const RA=tour(deg(Math.atan2(Math.cos(rad(e))*Math.sin(rad(L)),Math.cos(rad(L))))/15,24);return {declinaison:deg(Math.asin(Math.sin(rad(e))*Math.sin(rad(L)))),equation:q/15-RA};}
function calculer(date=new Date(),lieu=KOKI){
 const d=new Date(date.getTime()+lieu.fuseau*3600e3),jd=jourJulien(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate())-lieu.longitude/(15*24);
 const midi=t=>tour(12-soleil(jd+t).equation,24);
 const angle=(a,t,avant)=>{const dec=soleil(jd+t).declinaison,x=(-Math.sin(rad(a))-Math.sin(rad(dec))*Math.sin(rad(lieu.latitude)))/(Math.cos(rad(dec))*Math.cos(rad(lieu.latitude)));if(x<-1||x>1)return NaN;const T=deg(Math.acos(x))/15;return midi(t)+(avant?-T:T);};
 const asr=t=>{const dec=soleil(jd+t).declinaison;return angle(-deg(Math.atan(1/(1+Math.tan(rad(Math.abs(lieu.latitude-dec)))))),t,false);};
 let h={fajr:5,lever:6,dhuhr:12,asr:13,maghrib:18,isha:18};
 for(let i=0;i<2;i++)h={fajr:angle(18,h.fajr/24,true),lever:angle(0.833,h.lever/24,true),dhuhr:midi(h.dhuhr/24),asr:asr(h.asr/24),maghrib:angle(0.833,h.maghrib/24,false),isha:angle(17,h.isha/24,false)};
 const out={};for(const [k,v] of Object.entries(h)){const local=tour(v+lieu.fuseau-lieu.longitude/15+(k==='dhuhr'?1/60:0),24);out[k]=Number.isFinite(local)?Math.round(local*60):null;}
 return out;}
const NOMS=[['fajr','Fajr'],['dhuhr','Dhuhr'],['asr','Asr'],['maghrib','Maghrib'],['isha','Isha']];
function texte(minutes){if(!Number.isInteger(minutes))return '—';const m=((minutes%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
// Liste des cinq prières du jour avec la prochaine (heure de Koki = UTC).
function duJour(date=new Date(),lieu=KOKI){const h=calculer(date,lieu),d=new Date(date.getTime()+lieu.fuseau*3600e3),maintenant=d.getUTCHours()*60+d.getUTCMinutes();
 const liste=NOMS.map(([cle,nom])=>({cle,nom,minutes:h[cle],heure:texte(h[cle])}));const prochaine=liste.find(p=>Number.isInteger(p.minutes)&&p.minutes>maintenant)||null;
 return {liste,prochaine:prochaine?prochaine.cle:null,lever:texte(h.lever)};}
const api={KOKI,calculer,duJour,texte};root.KokiPrieres=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
