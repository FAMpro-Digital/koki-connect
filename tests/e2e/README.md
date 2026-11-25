# Tests Playwright locaux : KOKI CONNECT

Ces tests ouvrent l'application dans un vrai navigateur, **sans aucun accès réseau distant** :

- le site est servi sur `127.0.0.1` par `serve-static.mjs`, avec le même périmètre de fichiers que la publication et les en-têtes de `vercel.json` (CSP, HSTS…) ;
- `assets/portail/backend.json` est remplacé **à la volée** par un hôte Supabase fictif : le fichier du dépôt n'est pas modifié ;
- Supabase est simulé (`helpers/isolation.mjs`) avec des données fictives (préfixe `TEST`) ;
- un test échoue si la page tente de joindre la production, `vercel.app` ou un autre hôte Supabase, ou si elle lève une erreur JavaScript non gérée.

Aucun test de charge : un seul navigateur par test.

## Lancer

Une seule version de Playwright sert partout : celle du `package.json` de la racine (la même que la CI).
`tests/e2e/package.json` est figé sur la même version pour le workflow de performance.

```bash
npm ci                          # à la racine du dépôt
npx playwright install chromium # télécharge Chromium (une fois)
npm run test:e2e                # bureau + mobile (Pixel 7)
npm run test:e2e -- --project=mobile   # un seul profil
```

⚠️ N'installez pas de deuxième copie de Playwright dans `tests/e2e/node_modules` pour lancer les tests depuis la racine :
deux copies chargées ensemble font échouer Playwright (« did not expect test.describe() to be called here »).

Les rapports sont dans `tests/e2e/playwright-report/` (ignoré par Git).

## Couverture actuelle

| Dossier | Vérifie |
|---|---|
| `specs/navigation` | Ouverture, titre, 5 onglets, passage Accueil → Transport → Boutique → Accueil, flux public demandé, recherche de l'accueil |
| `specs/transport` | Rubrique accessible au visiteur ; aucune réservation sans compte |
| `specs/commerces` | Rubrique accessible au visiteur ; aucune commande sans compte |
| `specs/auth` | Visiteur sans session ni tentative de connexion |
| `specs/securite` | CSP appliquée sans violation, styles compris (aucun `style="…"` ni `<style>` toléré), dans toutes les rubriques ; en-têtes de sécurité ; cible fictive |
| `specs/accessibilite.spec.mjs` | Lien d’évitement, zone `<main>` unique, boutons typés, pictogrammes masqués, bouton Pause du bandeau « À la une » |

## Limites et suite

- Les sélecteurs sont aussi validés contre `index.html` par `tests/performance-garde-fous.test.cjs`.
- Les parcours de création de compte, de connexion, de commande et de course (avec comptes TEST) restent à écrire une fois le projet Supabase TEST accessible, en s'appuyant sur `npx playwright codegen` pour relever les sélecteurs réels.
- Les parcours d'administration relèvent de KOKI CONNECT Admin, que cette branche ne modifie pas.
