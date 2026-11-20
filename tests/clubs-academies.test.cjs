// Clubs & Académies (site public) : contrat partagé, activation, branchement, sécurité de l'affichage.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const K=require('../assets/sport/clubs-contract.js');
// Même empreinte dans koki-connect-admin (src/clubs-contract.js) : le contrat doit rester IDENTIQUE.
const EMPREINTE='a8cdeb6834763e715b6939b050ce5d5a11f158d086cd75a2b61ad3cbac04b043';
test('contrat Clubs : identique dans l’administration',()=>{assert.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/sport/clubs-contract.js')).digest('hex'),EMPREINTE);});
test('codes d’invitation : saisie tolérante, alphabet sans ambiguïté',()=>{
 assert.equal(K.normaliserCode(' abcde-fgh23 '),'ABCDEFGH23');assert.ok(K.codeValide('abcde-fgh23'));
 assert.ok(!K.codeValide('ABCDE-FGH2'),'trop court');assert.ok(!K.codeValide('ABCDE-FGHI0'),'I et 0 exclus');});
test('YouTube : identifiant extrait, autres sites refusés',()=>{
 for(const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ','https://youtu.be/dQw4w9WgXcQ?t=3','https://m.youtube.com/shorts/dQw4w9WgXcQ','dQw4w9WgXcQ'])assert.equal(K.youtubeId(u),'dQw4w9WgXcQ',u);
 for(const u of ['https://vimeo.com/123','https://evil.example/watch?v=dQw4w9WgXcQ','javascript:alert(1)',''])assert.equal(K.youtubeId(u),null,u);
 assert.equal(K.lienYoutube('dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');assert.equal(K.lienYoutube('<script>'),null);});
test('résultats : score et issue du point de vue de l’académie',()=>{
 const m={statut:'Terminé',domicile:'KAF',exterieur:'ASC',score_domicile:3,score_exterieur:1};
 assert.equal(K.scoreTexte(m),'3 – 1');assert.equal(K.issue(m,'KAF'),'Victoire');assert.equal(K.issue(m,'ASC'),'Défaite');assert.equal(K.issue({...m,score_exterieur:3},'KAF'),'Nul');
 assert.equal(K.issue({...m,statut:'À venir'},'KAF'),null);assert.equal(K.scoreTexte({score_domicile:null}),'–');});
test('partage et WhatsApp : liens encodés',()=>{
 assert.equal(K.lienPartage('https://koki.example/','koki-academie-foot'),'https://koki.example/?academie=koki-academie-foot');
 assert.match(K.lienWhatsapp('Bonjour & bienvenue','77 287 52 52'),/^https:\/\/wa\.me\/221772875252\?text=Bonjour%20%26%20bienvenue$/);
 assert.match(K.messageInvitation('KAF','entraineur','ABCDE-FGH23'),/Entraîneur.*ABCDE-FGH23.*72 heures/);});
test('erreurs techniques jamais affichées telles quelles',()=>{
 assert.equal(K.messageErreur(Error('new row for relation "players" violates check constraint')),'Informations invalides ou déjà enregistrées. Vérifiez la saisie.');
 assert.equal(K.messageErreur(Error('Catégorie invalide')),'Catégorie invalide');});
test('dates : saisie locale ↔ ISO',()=>{const iso=K.versIso('2026-12-05T09:30');assert.ok(iso.endsWith('Z'));assert.equal(K.versSaisie(iso),'2026-12-05T09:30');assert.equal(K.versIso(''),null);});
test('activation : module piloté par modules.clubs (activé le 20/11/2026)',async()=>{
 const c=JSON.parse(fs.readFileSync('assets/business/config.json','utf8'));assert.equal(c.modules?.clubs,true,'Clubs & Académies activé en production sur autorisation du 20/11/2026');
 const rt=fs.readFileSync('assets/business/runtime.mjs','utf8');
 assert.match(rt,/export function clubsActif\(flags\)\{return flags\?\.enabled===true&&flags\?\.modules\?\.clubs===true;\}/);
 assert.match(rt,/clubs:clubsActif\(flags\)/);assert.match(rt,/window\.KokiClubsAPI=Object\.freeze\(\{/);
 assert.doesNotMatch(rt,/window\.KokiSport=/,'ne remplace pas le module Sports & ASC existant');
 assert.match(rt,/db\.rpc\('koki_sport',\{command,input\}\)/);assert.match(rt,/db\.rpc\('koki_sport_public',\{command,input\}\)/);
 assert.match(rt,/from\('koki-sport'\)\.upload\(path,f,\{contentType:f\.type,upsert:false\}\)/);assert.match(rt,/const r=await processImage\(file,progress\)/,'photo réencodée (EXIF supprimé)');});
test('branchement : scripts après Sports, onglet conditionnel, feuille à la demande',()=>{
 const html=fs.readFileSync('index.html','utf8'),sp=fs.readFileSync('assets/portail/sport.js','utf8');
 const i=f=>html.indexOf('src="assets/'+f+'"');assert.ok(i('portail/sport.js')<i('sport/clubs-contract.js')&&i('sport/clubs-contract.js')<i('sport/clubs-public.js')&&i('sport/clubs-public.js')<i('sport/club-space.js'));
 assert.doesNotMatch(html,/clubs\.css/);assert.match(fs.readFileSync('assets/sport/clubs-public.js','utf8'),/l\.href='assets\/sport\/clubs\.css'/,'feuille chargée seulement si le module est actif');
 assert.match(sp,/\.\.\.\(window\.KokiClubs\?\.visible\?\[\['Académies','🎓'\]\]:\[\]\)/);assert.match(sp,/window\.KokiSport=Object\.freeze\(\{accueil,equipe,match\}\)/);});
test('affichage sûr : pas d’innerHTML, liens externes protégés, iframe YouTube seulement',()=>{
 for(const f of ['assets/sport/clubs-public.js','assets/sport/club-space.js','assets/sport/clubs-contract.js']){const s=fs.readFileSync(f,'utf8');
  assert.doesNotMatch(s,/innerHTML|outerHTML|insertAdjacentHTML|eval\(|new Function/,f);
  for(const m of s.matchAll(/target='_blank'/g))assert.match(s.slice(m.index,m.index+40),/rel='noopener'/,f);}
 const pub=fs.readFileSync('assets/sport/clubs-public.js','utf8');assert.match(pub,/fr\.src=K\.lienYoutube\(m\.youtube_id\)/);
 assert.doesNotMatch(pub,/annee_naissance|representants|telephone_parent/,'la page publique n’utilise aucun champ privé');});
test('déploiement : branche non déployable',()=>{assert.equal(JSON.parse(fs.readFileSync('vercel.json','utf8')).git.deploymentEnabled['develop/clubs-academies'],false);});
