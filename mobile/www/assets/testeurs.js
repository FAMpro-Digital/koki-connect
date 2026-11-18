(function(){'use strict';
 const form=document.getElementById('retour-test');
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const fields=[['sujet','Type'],['parcours','Rubrique'],['appareil','Appareil'],['navigateur','Application / navigateur'],['etapes','Étapes'],['attendu','Résultat attendu'],['observe','Résultat observé']];
  for(const [id] of fields){const input=document.getElementById(id);input.setCustomValidity(input.required&&!input.value.trim()?'Merci de renseigner ce champ.':'');}
  if(!form.reportValidity())return;
  const message='Retour de test KOKI CONNECT\n\n'+fields.map(([id,label])=>label+' : '+document.getElementById(id).value.trim()).join('\n\n');
  document.getElementById('apercu-message').textContent=message;
  document.getElementById('envoi-whatsapp').href='https://wa.me/221772875252?text='+encodeURIComponent(message);
  document.getElementById('envoi-email').href='mailto:kokiconnect221@gmail.com?subject='+encodeURIComponent('Retour de test KOKI CONNECT')+'&body='+encodeURIComponent(message);
  document.getElementById('message-prepare').hidden=false;
  document.getElementById('retour-statut').textContent='Message préparé. Vérifiez-le, puis choisissez votre messagerie pour l’envoyer.';
  document.getElementById('message-prepare').scrollIntoView({block:'start',behavior:'smooth'});
 });
 form.addEventListener('input',event=>{event.target.setCustomValidity?.('');document.getElementById('message-prepare').hidden=true;});
})();
