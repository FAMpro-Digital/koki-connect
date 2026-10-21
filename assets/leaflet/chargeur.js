// Chargement de Leaflet à la demande : la bibliothèque (script + feuille de style) n'est téléchargée
// qu'à la première ouverture d'une carte (Carte de Koki ou Transport), pas au démarrage de l'application.
(function(root){'use strict';
let promesse=null;
function feuille(href){return new Promise((ok,ko)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.onload=ok;l.onerror=()=>{l.remove();ko(Error('Feuille de style de la carte indisponible'));};document.head.append(l);});}
function script(src){return new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{s.remove();ko(Error('Bibliothèque de carte indisponible'));};document.head.append(s);});}
function charger(){
  if(root.L&&root.L.map)return Promise.resolve(root.L);
  if(!promesse)promesse=Promise.all([feuille('assets/leaflet/leaflet.css'),script('assets/leaflet/leaflet.js')]).then(()=>{if(!root.L)throw Error('Carte indisponible');return root.L;}).catch(e=>{promesse=null;throw e;});
  return promesse;
}
root.KokiLeaflet=Object.freeze({charger});
})(globalThis);
