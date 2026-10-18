// Contrôle effectué à chaque action, jamais mémorisé : une session peut expirer.
export async function requireClientAccount(api,onRequired=()=>{}){
 let user;
 try{user=await api?.identity?.();}catch(error){
  if(error?.horsLigne)throw error;
 }
 if(!user?.id||user.is_anonymous){await onRequired();throw Error('Un compte client est obligatoire pour utiliser ce service. Connectez-vous ou créez votre compte dans Profil.');}
 return user;
}
