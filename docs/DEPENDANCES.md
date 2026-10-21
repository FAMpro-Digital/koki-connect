# Dépendances de Koki Connect

Le site est **statique** : aucune dépendance n'est installée ni exécutée en production. Vercel sert les fichiers du dépôt tels quels.

## Bibliothèques embarquées (copiées dans le dépôt)

| Bibliothèque | Version | Fichier | Licence | Empreinte SHA-256 |
|---|---|---|---|---|
| Leaflet | 1.9.4 | `assets/leaflet/leaflet.js`, `leaflet.css` | BSD-2 (`assets/leaflet/LICENSE`) | voir `tests/dependances.test.cjs` |
| supabase-js | 2.117.3 | `assets/business/vendor/supabase-2.117.3.js` | MIT (`assets/business/vendor/LICENSE`) | voir `tests/dependances.test.cjs` |

Le test `tests/dependances.test.cjs` échoue si l'un de ces fichiers change sans que l'empreinte (et donc cette table) soit mise à jour volontairement.

### Mettre à jour une bibliothèque
1. Télécharger la nouvelle version depuis la source officielle, lire ses notes de version.
2. Remplacer le fichier, mettre à jour la version dans le nom/l'en-tête et la table ci-dessus.
3. Recalculer l'empreinte (`sha256sum`) et la reporter dans `tests/dependances.test.cjs`.
4. Lancer `node --test tests/*.test.cjs` et le test de bout en bout (`npm run test:e2e`), ouvrir une PR.

## Outils de développement (jamais déployés)

`package.json` ne contient **que** des `devDependencies` (ESLint, Playwright) et aucun script `build`, `start` ni `vercel-build` : Vercel continue de servir le site statique. Un test (`tests/dependances.test.cjs`) vérifie ces garanties.

- Les versions sont épinglées exactement.
- **Le fichier `package-lock.json` doit être généré une fois** avec `npm install` depuis un poste ayant accès au registre npm, puis ajouté au dépôt (le bac à sable d'automatisation n'y avait pas accès). Tant qu'il est absent, les contrôles ESLint et Playwright de la CI s'exécutent avec `npm install` (versions épinglées) ; une fois le lockfile ajouté, remplacer par `npm ci` dans `.github/workflows/qualite.yml`.

## Suivi automatique

`.github/dependabot.yml` propose chaque semaine des mises à jour des actions GitHub (épinglées par empreinte de commit) et des outils de développement. Les PR de Dependabot passent par le même contrôle `verify` ; rien n'est fusionné automatiquement.
