// Feuilles de style propres à une rubrique (Transport, Commerces, Espace pro, Éducation, Sport) :
// elles sont téléchargées sans bloquer l'affichage de l'accueil, puis appliquées dès leur arrivée.
// Leur position dans la page ne change pas : l'ordre d'application (cascade) reste identique.
(function(){'use strict';
function activer(l){l.media='all';}
document.querySelectorAll('link[rel="stylesheet"][data-differe]').forEach(l=>{
  if(l.sheet)activer(l);
  else{l.addEventListener('load',()=>activer(l),{once:true});l.addEventListener('error',()=>activer(l),{once:true});}
});
})();
