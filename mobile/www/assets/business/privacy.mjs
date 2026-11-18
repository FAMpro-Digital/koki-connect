// Informations sur le fonctionnement et demandes adressées à l'assistance publique existante.
export function privacyPanel(){
 const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const panel=node('details');panel.className='business-panel';panel.append(node('summary','Mes données et ma confidentialité'));
 for(const text of [
  'Les informations de compte, commandes, courses et demandes de services servent au fonctionnement de Koki Connect. Les commentaires et les fiches professionnelles publiés sont visibles par les visiteurs.',
  'La géolocalisation est demandée avec l’autorisation du navigateur pour le transport. Un chauffeur disponible partage sa position lorsque sa page reste visible. Vous pouvez vous rendre indisponible ou retirer l’autorisation dans les réglages du navigateur.',
  'Les notifications sont facultatives. Vous pouvez les désactiver dans la rubrique Notifications et dans les réglages du navigateur. Les SMS ne sont pas encore activés.',
  'La déconnexion ferme la session sur cet appareil. Une demande dont le résultat reste incertain peut rester enregistrée sur cet appareil pour être reprise avec le même compte sans doublon.',
  'Pour obtenir une copie de vos données ou demander la suppression de votre compte, contactez l’assistance. Indiquez l’adresse de votre compte, jamais votre mot de passe ni votre code de connexion. La demande est traitée par l’équipe après vérification de votre identité ; ouvrir le lien ne supprime pas le compte.'
 ])panel.append(node('p',text));
 for(const [label,subject] of [['Demander une copie de mes données','Demande de copie de mes données Koki Connect'],['Demander la suppression de mon compte','Demande de suppression de mon compte Koki Connect']]){const p=node('p'),link=node('a',label);link.href='mailto:kokiconnect221@gmail.com?subject='+encodeURIComponent(subject);p.append(link);panel.append(p);}
 return panel;
}
