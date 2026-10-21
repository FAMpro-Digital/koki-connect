# Tests Playwright locaux : KOKI CONNECT

Ces tests ouvrent l'application dans un vrai navigateur, **sans aucun accès réseau distant** :

- le site est servi sur `127.0.0.1` par `serve-static.mjs`, avec le même périmètre de fichiers que la publication et les en-têtes de `vercel.json` (CSP, HSTS…) ;
- `assets/portail/backend.json` est remplacé **à la volée** par un hôte Supabase fictif : le fichier du dépôt n'est pas modifié ;
- Supabase est simulé (`helpers/isolation.mjs`) avec des données fictives (préfixe `TEST`) ;
- un test échoue si la page tente de joindre la production, `vercel.app` ou un autre hôte Supabase, ou si elle lève une erreur JavaScript non gérée.

Aucun test de charge : un seul navigateur par test.

## Lancer

```bash
cd tests/e2e
npm install
npm run install:navigateur   # télécharge Chromium (une fois)
npm test                     # bureau + mobile (Pixel 7)
npm run test:mobile          # un seul profil
```

Les rapports sont dans `tests/e2e/playwright-report/` (ignoré par Git). Aucun fichier `package.json` n'est ajouté à la racine du dépôt : Vercel continue de traiter le site comme statique.

## Couverture actuelle

| Dossier | Vérifie |
|---|---|
| `specs/navigation` | Ouverture, titre, 5 onglets, passage Accueil → Transport → Boutique → Accueil, flux public demandé, recherche de l'accueil |
| `specs/transport` | Rubrique accessible au visiteur ; aucune réservation sans compte |
| `specs/commerces` | Rubrique accessible au visiteur ; aucune commande sans compte |
| `specs/auth` | Visiteur sans session ni tentative de connexion |
| `specs/securite` | CSP appliquée sans violation (la politique « Report-Only » est signalée sans faire échouer), en-têtes de sécurité, cible fictive |

## Limites et suite

- Ces tests ont été **écrits et vérifiés pour la syntaxe, mais pas exécutés** dans l'environnement qui les a préparés (pas d'accès au registre npm ni au téléchargement du navigateur). Les sélecteurs sont validés contre `index.html` par `tests/performance-garde-fous.test.cjs`. Un premier lancement chez vous peut révéler des ajustements.
- Les parcours de création de compte, de connexion, de commande et de course (avec comptes TEST) restent à écrire une fois le projet Supabase TEST accessible, en s'appuyant sur `npx playwright codegen` pour relever les sélecteurs réels.
- Les parcours d'administration relèvent de KOKI CONNECT Admin, que cette branche ne modifie pas.
- `package.json` demande `@playwright/test ^1.50.0` sans fichier de verrouillage (aucun accès au registre lors de la préparation) : lancez `npm install`, puis versionnez `package-lock.json` si vous voulez figer les versions.
