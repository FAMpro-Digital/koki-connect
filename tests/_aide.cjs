'use strict';
// Contenu complet de la page d'accueil pour les assertions de texte :
// index.html + le script et la feuille de style d'accueil qui en ont été extraits (CSP sans 'unsafe-inline').
const fs = require('node:fs');
module.exports = {
  accueil: () => fs.readFileSync('index.html', 'utf8') + '\n' + fs.readFileSync('assets/portail/accueil.js', 'utf8') + '\n' + fs.readFileSync('assets/portail/accueil-base.css', 'utf8'),
};
