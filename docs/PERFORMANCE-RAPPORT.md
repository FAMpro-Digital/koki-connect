# Rapport de préparation : performance et charge de KOKI CONNECT

Date : 21 octobre 2026. Branche : `test/koki-connect-performance`.

**Capacité de l'application : indéterminée.** Aucune mesure de charge n'a été effectuée (aucune autorisation, aucun environnement TEST accessible). Aucun chiffre de capacité n'est donc avancé.

## 1. Ce qui a été réellement exécuté et ce qui est seulement préparé

| Élément | État |
|---|---|
| Tests Node existants du dépôt public | **Exécutés** : 170 réussis, 0 échec |
| Nouveaux garde-fous (`tests/performance-garde-fous.test.cjs`, 13 tests) | **Exécutés** : 13 réussis ; total 183 réussis, 0 échec |
| `scripts/prepare-preview.mjs` (publication statique) | **Exécuté** : réussi ; aucun fichier de la suite de performance n'est publié |
| Serveur statique local de test (`tests/e2e/serve-static.mjs`) | **Exécuté** en local (127.0.0.1) : fichiers publics servis, tout le reste en 404, cible Supabase fictive, en-têtes de `vercel.json` appliqués |
| Syntaxe des scripts k6, Playwright et du serveur local | **Vérifiée** (`node --check`) |
| Tests Playwright (`tests/e2e`) | **Préparés, non exécutés** : pas d'accès au registre npm ni au navigateur dans l'environnement de préparation |
| Scripts k6 (`tests/load`) | **Préparés, non exécutés** : k6 non installable ici, et aucune charge n'est autorisée |
| Workflow `Performance (manuel)` | **Préparé, non exécuté** ; YAML valide |
| Mesures Supabase (requêtes lentes, connexions, RLS sous charge) et Vercel | **Non réalisées** |

Aucun fichier de l'application (HTML, CSS, JavaScript, images, textes) n'a été modifié. Les seuls fichiers existants touchés sont `vercel.json` (une ligne : la branche de performance n'a pas d'aperçu automatique, règle de `docs/CI-CD.md`) et `.gitignore`.

## 2. Constats de l'audit

1. **Pas de préproduction effective.** `assets/portail/backend.json` de `main` vise la base de production. Le projet Supabase TEST décrit dans le dépôt admin n'était pas joignable depuis les outils de la session, et aucune URL de préproduction Vercel n'existe.
2. **Vercel Hobby interdit les tests de charge** (Enterprise uniquement, avec préavis). Le site statique ne sera donc pas chargé en masse.
3. **Plan gratuit Supabase** : 5 Go de sortie par mois, 500 Mo de base, 50 000 utilisateurs actifs mensuels, mise en pause après une semaine d'inactivité. Les niveaux 500 à 5 000 risquent d'épuiser le quota ; le niveau 100 sert à le mesurer.
4. **Garde-fous métier à respecter pendant les tests** : recherche de chauffeurs proches limitée à 10 par minute et 60 par heure et par compte ; connexion par SMS limitée aux numéros de test `+999000000001` à `009` ; limites d'Auth par adresse IP. L'inscription en masse n'est donc pas simulable.
5. **Dépôt KOKI CONNECT Admin lisible publiquement** alors que son README le dit privé (constaté par un clonage sans authentification). À vérifier dans GitHub.
6. **Concurrence côté base** : deux index uniques (une course active par client, une par chauffeur) et des verrous consultatifs protègent les commandes et fiches ; le dépôt admin contient déjà des tests de concurrence sur PostgreSQL embarqué. Ils n'ont pas été exécutés ici.

## 3. Problèmes et risques à confirmer par la mesure

Ce sont des hypothèses issues de la lecture du code, non des mesures.

| Sujet | Gravité supposée | Constat | À mesurer / correction envisagée |
|---|---|---|---|
| Flux public `koki_public_feed` | Moyenne | Appelé sans cache (`cache: 'no-store'`) à chaque ouverture | Taille de la réponse et coût par ouverture ; cache court ou ETag si le volume sortant est élevé |
| Signature des images | Moyenne | Un appel de signature (liens de 120 s) à chaque actualisation | Nombre d'images par ouverture ; alternatives pour les images publiées |
| Catalogue (`koki_business` / `catalog`) | À évaluer | Les index existants portent sur `kind`, `owner_id`, `client_id`, `parent_id` | `EXPLAIN` sur TEST avec un volume réaliste avant de proposer un index |
| Concurrence commandes / courses | À évaluer | Protections présentes dans le SQL | Exécuter `write-concurrency` sur TEST après autorisation |
| Aucun contrôle automatique sur `main` côté admin | Faible | Un seul workflow, limité à `develop/phases-2-6` | Hors périmètre de cette branche |

## 4. Prérequis manquants

1. Projet Supabase **TEST** accessible (URL, clé publishable, schéma installé, données fictives `TEST`).
2. Comptes fictifs dans Auth pour les scénarios connectés, et données `TEST` (boutique, produit à stock limité, véhicule) pour les écritures.
3. Environnement GitHub `koki-performance-test` avec relecteur obligatoire, variables et secret décrits dans `tests/load/README.md`.
4. Décision sur le coût : le plan gratuit suffit-il pour le niveau 100 ? Les niveaux supérieurs nécessitent probablement un plan payant sur le projet TEST.
5. Accès en écriture de l'application GitHub Claude au dépôt, pour publier la branche et la Pull Request.

## 5. Prochaines étapes proposées

1. Publier la branche et ouvrir la Pull Request ; ne rien fusionner sans validation.
2. Lancer `npm install && npm test` dans `tests/e2e` (chez vous ou via le workflow) et corriger les sélecteurs si besoin.
3. Fournir l'accès au projet TEST, puis autoriser explicitement le niveau 100 en lecture publique (`OUI-100-<référence>`).
4. Analyser le volume sortant mesuré, ajuster les seuils, puis décider du niveau suivant.
5. Parcours avec comptes TEST (inscription, connexion, commande, course) et administration, dans un second temps.

## 6. Recommandations par ordre de priorité

1. **Corrections critiques** : vérifier la visibilité du dépôt admin ; créer une vraie préproduction (projet TEST + URL Vercel dédiée) avant toute campagne.
2. **Requêtes Supabase** : mesurer puis optimiser flux public et catalogue (taille, cache, index) sur TEST.
3. **Chargement des pages** : le travail `perf/chargement-mobile` est déjà fusionné ; le mesurer avec Playwright à faible volume.
4. **Serveur** : suivre connexions et latence PostgreSQL pendant le niveau 100.
5. **Coûts** : surveiller la sortie de données ; conserver les plafonds de `tests/load/config/levels.mjs`.
6. **Montée en trafic** : n'ouvrir un niveau que si le précédent respecte les seuils et que le propriétaire l'a validé.
