// Actions des boutons et champs de l'accueil.
// Remplace les attributs onclick/onchange/oninput/onsubmit de index.html (bloqués par une CSP stricte).
// Le comportement est identique : chaque action exécute la même instruction qu'auparavant.
// Délégation d'événements au niveau du document : fonctionne aussi pour le contenu ajouté plus tard.
(function(root){'use strict';
const ACTIONS={
  clic:{
    "afficherMenu()":function(el,event){afficherMenu()},
    "KokiPortail.profil()":function(el,event){KokiPortail.profil()},
    "afficherNotifications()":function(el,event){afficherNotifications()},
    "chargerMeteo()":function(el,event){chargerMeteo()},
    "afficherTransport()":function(el,event){afficherTransport()},
    "afficherCommerce()":function(el,event){afficherCommerce()},
    "KokiPortail.education()":function(el,event){KokiPortail.education()},
    "KokiPortail.liste(Opportunités)":function(el,event){KokiPortail.liste('Opportunités')},
    "KokiPortail.liste(Sports & ASC)":function(el,event){KokiPortail.liste('Sports & ASC')},
    "window.KokiSante?KokiSante.ouvrir():KokiPortail.lieux(Santé)":function(el,event){window.KokiSante?KokiSante.ouvrir():KokiPortail.lieux('Santé')},
    "KokiPortail.liste(Événements)":function(el,event){KokiPortail.liste('Événements')},
    "window.KokiServicesPublics?KokiServicesPublics.ouvrir():KokiPortail.lieux(Services publics)":function(el,event){window.KokiServicesPublics?KokiServicesPublics.ouvrir():KokiPortail.lieux('Services publics')},
    "KokiPortail.liste(Actualités)":function(el,event){KokiPortail.liste('Actualités')},
    "KokiPortail.liste(Annonces)":function(el,event){KokiPortail.liste('Annonces')},
    "KokiPortail.liste(Publicités)":function(el,event){KokiPortail.liste('Publicités')},
    "afficherRubrique(Numéros utiles)":function(el,event){afficherRubrique('Numéros utiles')},
    "afficherOpportunites()":function(el,event){afficherOpportunites()},
    "fermerOpportunites()":function(el,event){fermerOpportunites()},
    "filtrerOpportunites(this.dataset.filtre)":function(el,event){filtrerOpportunites(el.dataset.filtre)},
    "KokiCommerce.onglet(suivi)":function(el,event){KokiCommerce.onglet('suivi')},
    "KokiCommerce.onglet(pro)":function(el,event){KokiCommerce.onglet('pro')},
    "KokiCommerce.position(service)":function(el,event){KokiCommerce.position('service')},
    "KokiCommerce.position(professionnel)":function(el,event){KokiCommerce.position('professionnel')},
    "KokiCommerce.nouvelleOffre()":function(el,event){KokiCommerce.nouvelleOffre()},
    "KokiCommerce.effacerDemo()":function(el,event){KokiCommerce.effacerDemo()},
    "KokiTransport.utiliserPosition()":function(el,event){KokiTransport.utiliserPosition()},
    "KokiTransport.choisirPoint(depart)":function(el,event){KokiTransport.choisirPoint('depart')},
    "KokiTransport.choisirPoint(destination)":function(el,event){KokiTransport.choisirPoint('destination')},
    "KokiTransport.categorie(Moto)":function(el,event){KokiTransport.categorie('Moto')},
    "KokiTransport.categorie(Taxi)":function(el,event){KokiTransport.categorie('Taxi')},
    "KokiTransport.categorie(Voiture)":function(el,event){KokiTransport.categorie('Voiture')},
    "KokiTransport.categorie(Minicar)":function(el,event){KokiTransport.categorie('Minicar')},
    "KokiTransport.demander()":function(el,event){KokiTransport.demander()},
    "KokiTransport.avancer()":function(el,event){KokiTransport.avancer()},
    "KokiTransport.reinitialiserCourse()":function(el,event){KokiTransport.reinitialiserCourse()},
    "recentrerCarte()":function(el,event){recentrerCarte()},
    "afficherRubrique(Sports / ASC)":function(el,event){afficherRubrique('Sports / ASC')},
    "afficherRubrique(Événements)":function(el,event){afficherRubrique('Événements')},
    "afficherRubrique(Actualités)":function(el,event){afficherRubrique('Actualités')},
    "afficherRubrique(Petites annonces)":function(el,event){afficherRubrique('Petites annonces')},
    "afficherCarte()":function(el,event){afficherCarte()},
    "KokiPortail.admin()":function(el,event){KokiPortail.admin()},
    "KokiActivite.ouvrir()":function(el,event){KokiActivite.ouvrir()},
  },
  saisie:{
    "KokiPortail.rechercher(this.value)":function(el,event){KokiPortail.rechercher(el.value)},
    "filtrerCarte()":function(el,event){filtrerCarte()},
  },
  change:{
    "KokiCommerce.mode()":function(el,event){KokiCommerce.mode()},
    "KokiCommerce.categoriesOffre()":function(el,event){KokiCommerce.categoriesOffre()},
    "KokiTransport.changerLieu(depart)":function(el,event){KokiTransport.changerLieu('depart')},
    "KokiTransport.changerLieu(destination)":function(el,event){KokiTransport.changerLieu('destination')},
    "KokiTransport.changerMode()":function(el,event){KokiTransport.changerMode()},
    "filtrerCarte()":function(el,event){filtrerCarte()},
  },
  envoi:{
    "KokiCommerce.envoyerDemande()":function(el,event){event.preventDefault(); KokiCommerce.envoyerDemande()},
    "KokiCommerce.sauverProfil()":function(el,event){event.preventDefault(); KokiCommerce.sauverProfil()},
    "KokiCommerce.sauverOffre()":function(el,event){event.preventDefault(); KokiCommerce.sauverOffre()},
  },
};
const ATTRIBUTS={clic:['click','data-clic'],change:['change','data-change'],saisie:['input','data-saisie'],envoi:['submit','data-envoi']};
function brancher(doc){
  for(const [nom,[evenement,attribut]] of Object.entries(ATTRIBUTS)){
    doc.addEventListener(evenement,function(event){
      const cible=event.target&&event.target.closest?event.target.closest('['+attribut+']'):null;
      if(!cible)return;
      const action=ACTIONS[nom][cible.getAttribute(attribut)];
      if(typeof action!=='function')return;
      if(nom==='envoi')event.preventDefault();
      action.call(cible,cible,event);
    });
  }
}
brancher(root.document);
root.KokiActions=Object.freeze({ACTIONS,brancher});
})(globalThis);
