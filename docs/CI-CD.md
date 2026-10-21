# CI/CD de KOKI CONNECT (application publique)

## Workflows GitHub Actions

| Fichier | Déclenchement | Rôle |
|---|---|---|
| `.github/workflows/ci.yml` | Pull Request vers `main`, push sur `main`, lancement manuel | Contrôle `verify` : garde de configuration, tests Node (`tests/*.test.cjs`), préparation statique, test du convertisseur de collecte |
| `.github/workflows/qualite.yml` | Pull Request vers `main`, push sur `main`, lancement manuel | Contrôles complémentaires `lint` (ESLint) et `e2e` (Playwright, Chromium, réseau externe bloqué). Séparés de `verify` ; à rendre obligatoires quand ils sont stables |
| `.github/workflows/development.yml` | Push et PR sur `develop/phases-2-6` | Inchangé (branche de développement historique) |

Permissions : `contents: read` uniquement. Les actions sont épinglées par empreinte de commit.
Les tests s'exécutent sans accès réseau (`unshare --net`), comme avant.

## Exiger `verify` avant toute fusion (à faire une fois, dans GitHub)

Le jeton GitHub de l'automatisation ne permet pas de lire ni de créer les règles de protection : cette étape est manuelle.

Méthode rapide (jeu de règles prêt à importer) :
1. Dépôt → **Settings** → **Rules** → **Rulesets** → **New ruleset** → **Import a ruleset**.
2. Choisir `.github/rulesets/protect-main.json`.
3. Vérifier puis **Create**. Le jeu de règles : PR obligatoire, contrôle `verify` obligatoire et à jour, pas de force-push, pas de suppression de `main`. Aucun contournement (même pour le propriétaire).

Méthode manuelle équivalente : **Settings** → **Branches** → **Add branch ruleset** (ou règle classique) sur `main`, cocher « Require a pull request before merging », « Require status checks to pass » avec `verify`, « Require branches to be up to date », « Block force pushes » et « Restrict deletions ».

Important : `verify` n'apparaît dans la liste des contrôles qu'après une première exécution de `ci.yml` (ouvrir une PR vers `main` suffit).

## Déploiements Vercel

- Le site est statique ; `vercel.json` contient les en-têtes de sécurité et la liste `git.deploymentEnabled` des branches de travail dont l'aperçu automatique est désactivé.
- Toute nouvelle branche doit être ajoutée à cette liste (valeur `false`) dans son premier commit, sinon Vercel crée un aperçu relié au Supabase de production.
- À vérifier dans Vercel (non lisible par l'automatisation) : **Settings → Git → Production Branch** = `main`, et **Settings → Deployment Protection** pour les aperçus.

## Outils de développement et suivi

- `package.json` ne contient que des outils de développement ; `vercel.json` neutralise l'installation au déploiement (site toujours statique). Détails et mise à jour des bibliothèques embarquées : `docs/DEPENDANCES.md`.
- `.github/dependabot.yml` : propositions hebdomadaires de mise à jour (actions GitHub épinglées, outils de développement). Rien n'est fusionné automatiquement.
- Tests de bout en bout en local : `npm install` puis `npx playwright install chromium` puis `npm run test:e2e`.

## Nouvelle branche de travail

Premier commit : ajouter la branche à `git.deploymentEnabled` dans `vercel.json` (valeur `false`). Les branches temporaires de diagnostic doivent suivre la même règle.
