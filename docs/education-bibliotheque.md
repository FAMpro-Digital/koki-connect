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
`categorie`, `niveau`, `format` (PDF, EPUB, Audio, Audio + PDF, Livre papier), `acces` (Gratuit/Payant), `prix` (FCFA entier, 0 si gratuit), `auteur`, `fournisseur`, `whatsapp`, `description`, `fichier`, `taille_mo` (≤ 50), `archive`.
Titre, résumé, photo, publication et statut restent les champs habituels.

Règle de sécurité : **un livre payant n'a jamais de `fichier` dans le flux public** (le contrat refuse l'enregistrement et ignore une fiche qui en aurait un). Le fichier d'un livre gratuit est un objet du bucket privé `koki-livres` (`<uuid>/<uuid>.pdf|epub|mp3|m4a`, 50 Mo maximum), téléchargé par un lien signé de 5 minutes.

Fichier source : `assets/portail/livre-contract.js` — à copier à l'identique dans Koki Connect Admin pour le formulaire de saisie.

## Hors ligne
- `assets/portail/livres-hors-ligne.js` : fichiers dans le cache navigateur `koki-livres-v1`, liste dans `localStorage` (`koki.livres.v1`). Contrôles : type de fichier autorisé, 60 Mo maximum, identifiant valide, demande de stockage persistant. Rien n'est envoyé à un serveur.
- `sw.js` (nouveau) : permet d'ouvrir l'application sans internet. Réseau d'abord : en ligne, tout vient du serveur ; hors ligne, dernière copie des fichiers du site. Ne garde jamais Supabase ni `backend.json` / `config.json` / `environment.json`.

## Côté Supabase / Admin
- Formulaire Admin « Bibliothèque (livres) » et Vue d'ensemble Éducation : dépôt Koki Connect Admin, `docs/education-bibliotheque.md`.
- Fichiers dans le bucket privé `koki-livres` ; lecture publique limitée aux livres gratuits publiés (proposition SQL Admin, à appliquer en local puis en préproduction).
- Paiement (Wave / Orange Money) : phase séparée, soumise à validation.

## Vérifications
`node --test tests/*.test.cjs` : 67 tests réussis, dont `tests/bibliotheque.test.cjs` (contrat, filtre, téléchargement/lecture/suppression simulés, refus de type/taille, lien signé limité à `koki-livres`, présence du service worker). `node scripts/prepare-preview.mjs` : réussi.
Non vérifié : affichage sur iPhone/Android et téléchargement réel depuis Supabase (préproduction autorisée nécessaire).
