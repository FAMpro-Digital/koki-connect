// Éducation moderne : accueil de la rubrique, bibliothèque façon liseuse, établissements ; couleurs Koki Connect.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('assets/portail/app.js','utf8');
const edu=fs.readFileSync('assets/portail/education.js','utf8'),bib=fs.readFileSync('assets/portail/bibliotheque.js','utf8'),css=fs.readFileSync('assets/portail/education.css','utf8');
test('module chargé après la bibliothèque, feuille de style incluse, rubrique branchée',()=>{
 assert.ok(html.indexOf('assets/portail/education.js')>html.indexOf('assets/portail/bibliotheque.js'));
 assert.match(html,/<link rel="stylesheet" href="assets\/portail\/education\.css">/);
 assert.match(app,/async function education\(\)\{if\(window\.KokiEducation\)\{KokiEducation\.accueil\(\);return;\}/);
 assert.match(app,/function educationDetail\(row\)\{if\(window\.KokiEducation\)\{KokiEducation\.ecole\(row\);return;\}/);
 assert.match(edu,/window\.KokiEducation=Object\.freeze\(\{accueil,etablissements,ecole\}\)/);
});
test('bibliothèque : couvertures, rayons, puces, fiche, mêmes règles de téléchargement',()=>{
 assert.match(bib,/window\.KokiBibliotheque=\{ouvrir:bibliotheque,detail,mesLivres,couverture,vignette,rayon,charger,/);
 assert.match(bib,/if\(row\.image&&KokiPublicFeed\.imagePermise\(row\.image\)\)/,'photo publiée seulement si autorisée');
 assert.match(bib,/rayon\('Dans le même rayon',memes/);
 assert.match(bib,/if\(L\.telechargeable\(livre\)\)\{/,'livres payants jamais téléchargeables');
 assert.match(bib,/await H\.telecharger\(row\.id,/);assert.doesNotMatch(bib+edu,/innerHTML/);
});
test('couleurs Koki Connect : vert foncé, vert, orange, blanc',()=>{
 assert.match(css,/--edu-vert-fonce: #0b5a3c; --edu-vert: #087a3d; --edu-orange: #f28c28;/);
 for(const c of ['Scolaire','Coran & religion','Alphabétisation','Formation pro','Jeunesse','Autre'])assert.match(bib,new RegExp("'"+c+"':\\['#"));
 assert.doesNotMatch(css,/#087dff/,'pas de bleu dans la rubrique');
});
test('recherche Éducation : livres et établissements ; hors connexion, Mes livres reste accessible',()=>{
 assert.match(edu,/KokiLivreContract\.filtrer\(livres,\{q:t\},C\.normaliser\)/);
 assert.match(edu,/Vos livres téléchargés restent lisibles dans « Mes livres »/);
});
test('accueil : livres, écoles, structures de santé, numéros et lieux ne sont pas des publications de l’accueil',()=>{
 assert.match(app,/function fiche\(x\)\{.*if\(x\.type!=='Informations utiles'\)return false;if\(x\.categorie==='Lieux de la carte'\)return true;.*for\(const K of \[window\.KokiLivreContract,window\.KokiEducationContract,window\.KokiSanteContract,window\.KokiNumeroContract\]\)if\(K&&K\.decode\(x\)\)return true;.*return false;\}/);
 assert.match(app,/function actifs\(\)\{return visibles\(\)\.filter\(x=>!fiche\(x\)\);\}/);
 assert.match(app,/const xs=actifs\(\)\.filter\(x=>x\.type!=='Publicités'/,'notifications sans fiches de catalogue');
 assert.match(app,/for\(const x of visibles\(\)\.filter\(x=>!\(x\.type==='Informations utiles'&&x\.categorie==='Lieux de la carte'\)\)\)rows\.push\(\{nom:x\.titre,texte:x\.resume\+' '\+x\.categorie,type:.*window\.KokiLivreContract\?\.decode\(x\)\?'📚 Bibliothèque'/,'la recherche trouve toujours les livres');
});
