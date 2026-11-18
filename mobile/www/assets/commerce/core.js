(function(root){
  'use strict';
  const metiers=['Maçonnerie','Plomberie','Électricité','Menuiserie','Mécanique','Couture','Coiffure','Soudure','Peinture','Carrelage','Construction','Réparation téléphone/informatique','Nettoyage','Photographie','Décoration événementielle','Restauration','Transport','Agriculture','Autres métiers'];
  const produits=['Alimentation','Maison','Vêtements','Électronique','Agriculture','Autres produits'];
  const commandes=['Commande reçue','Confirmée','Préparation','En livraison','Livrée'];
  const retraits=['Commande reçue','Confirmée','Préparation','Prête au retrait','Retirée'];
  const demandes=['Demande envoyée','Acceptée','Prestataire en route','Service en cours','Terminé'];
  function total(panier,catalogue){
    return panier.reduce((s,l)=>{const p=catalogue.find(x=>x.id===l.id);if(!p||!Number.isSafeInteger(l.quantite)||l.quantite<1||l.quantite>p.stock||!p.disponible||!Number.isSafeInteger(p.prix)||p.prix<0)throw Error('Un produit est indisponible ou sa quantité dépasse le stock.');return s+p.prix*l.quantite;},0);
  }
  function commander(panier,catalogue,mode,lieu){
    if(!panier.length)throw Error('Votre panier est vide.');
    if(!['retrait','livraison'].includes(mode))throw Error('Choisissez le mode de réception.');
    if(mode==='livraison'&&(!lieu||!lieu.nom))throw Error('Précisez le lieu de livraison.');
    if(new Set(panier.map(x=>x.id)).size!==panier.length)throw Error('Panier invalide.');
    const montant=total(panier,catalogue);
    if(!Number.isSafeInteger(montant))throw Error('Montant invalide.');
    return {total:montant,lignes:panier.map(l=>{const p=catalogue.find(x=>x.id===l.id);return {...l,nom:p.nom,prix:p.prix,proId:p.proId};}),catalogue:catalogue.map(p=>({...p,stock:p.stock-(panier.find(l=>l.id===p.id)?.quantite||0)}))};
  }
  function avancer(item,etapes){const i=etapes.indexOf(item.statut);if(i<0||i>=etapes.length-1)throw Error('Aucune étape suivante.');return {...item,statut:etapes[i+1],miseAJour:new Date().toISOString()};}
  function validerDemande(besoin,lieu,date,aujourdhui){if(!besoin||besoin.trim().length<10)throw Error('Décrivez votre besoin en au moins 10 caractères.');if(!lieu||!lieu.nom)throw Error('Choisissez votre lieu.');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||(!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)||date<aujourdhui)throw Error('Choisissez une date valide, aujourd’hui ou plus tard.');}
  const api={metiers,produits,commandes,retraits,demandes,total,commander,avancer,validerDemande};root.KokiCommerceCore=Object.freeze(api);if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
