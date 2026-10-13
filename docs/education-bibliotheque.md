# Éducation — Bibliothèque : livres gratuits et payants, téléchargement hors ligne

## Ce que voit l'habitant
- **Éducation › 📚 Bibliothèque** : recherche (titre, matière, niveau, auteur), onglets **Tous / Gratuits / Payants** avec le nombre de livres, filtre par catégorie (Scolaire, Coran & religion, Alphabétisation, Formation pro, Jeunesse, Autre).
- **Fiche livre** :
  - *Gratuit avec fichier* : **Télécharger** (barre de progression, Annuler), puis **Lire hors ligne** ou **Supprimer du téléphone** ; **Lire en ligne** sans télécharger.
  - *Payant* : prix en FCFA et **Commander sur WhatsApp** auprès du fournisseur (message prérempli). Le paiement en ligne et le téléchargement des livres payants viendront dans une phase suivante.
  - *Livre papier* : où l'obtenir, WhatsApp du fournisseur.
- **📥 Mes livres** : livres présents sur le téléphone, espace utilisé, Lire / Supprimer. Fonctionne sans internet.

## Contrat commun `koki.education.book` v1
Comme les établissements (`docs/education-phase1.md`) : aucune table ni migration. `public.koki_contents`, `type=Informations utiles`, `categorie=Éducation`, `texte` = JSON :
`categorie`, `niveau`, `format` (PDF, EPUB, Audio, Audio + PDF, Livre papier), `acces` (Gratuit/Payant), `prix` (FCFA entier, 0 si gratuit), `auteur`, `fournisseur`, `whatsapp`, `description`, `fichier`, `taille_mo` (≤ 200), `archive`.
Titre, résumé, photo, publication et statut restent les champs habituels.

Règle de sécurité : **un livre payant n'a jamais de `fichier` dans le flux public** (le contrat refuse l'enregistrement et ignore une fiche qui en aurait un). Le fichier d'un livre gratuit est un objet de `koki-media` (`<uuid>/<uuid>.pdf|epub|mp3|m4a`), téléchargé par un lien signé de 5 minutes.

Fichier source : `assets/portail/livre-contract.js` — à copier à l'identique dans Koki Connect Admin pour le formulaire de saisie.

## Hors ligne
- `assets/portail/livres-hors-ligne.js` : fichiers dans le cache navigateur `koki-livres-v1`, liste dans `localStorage` (`koki.livres.v1`). Contrôles : type de fichier autorisé, 200 Mo maximum, identifiant valide, demande de stockage persistant. Rien n'est envoyé à un serveur.
- `sw.js` (nouveau) : permet d'ouvrir l'application sans internet. Réseau d'abord : en ligne, tout vient du serveur ; hors ligne, dernière copie des fichiers du site. Ne garde jamais Supabase ni `backend.json` / `config.json` / `environment.json`.

## À faire côté Supabase / Admin (non fait ici)
1. **Formulaire Admin « Livre »** utilisant le même contrat (téléversement PDF/audio dans `koki-media`, prix, WhatsApp).
2. **Politique Storage** : vérifier que la clé publique peut signer les fichiers `.pdf/.epub/.mp3/.m4a` des livres gratuits publiés (aujourd'hui testé pour les images). Sinon, l'ajouter dans la migration Admin, uniquement pour les livres gratuits publiés.
3. **Paiement** (Wave / Orange Money) : nécessite des comptes marchands et une fonction serveur qui délivre le lien du fichier seulement après paiement confirmé. Phase séparée, soumise à validation.

## Vérifications
`node --test tests/*.test.cjs` : 67 tests réussis, dont `tests/bibliotheque.test.cjs` (contrat, filtre, téléchargement/lecture/suppression simulés, refus de type/taille, lien signé limité à `koki-media`, présence du service worker). `node scripts/prepare-preview.mjs` : réussi.
Non vérifié : affichage sur iPhone/Android et téléchargement réel depuis Supabase (préproduction autorisée nécessaire).
