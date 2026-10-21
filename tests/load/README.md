# Tests de charge k6 : KOKI CONNECT

> **Statut : préparés, jamais exécutés à distance.** Aucun test de charge n'a été lancé sur Vercel, sur Supabase TEST ni sur la production.
> Rien ne s'exécute sans votre autorisation écrite (voir « Autorisation »).

## Ce que testent ces scripts

La cible est **uniquement Supabase** (projet TEST ou base locale) : flux public, catalogue, tarifs, historique, commandes et courses fictives.
Le site statique n'est **jamais** chargé en masse : Vercel interdit les tests de charge hors offre Enterprise, et la production est exclue.

| Scénario | Ce qu'il fait | Écritures |
|---|---|---|
| `scenarios/public-read.js` | Visiteur anonyme : ouverture (flux public), images, catalogue, tarifs de transport, pauses de 2 à 9 s | Aucune |
| `scenarios/authenticated-read.js` | Comptes fictifs connectés : catalogue, historiques, fiches dont ils sont propriétaires | Aucune |
| `scenarios/write-concurrency.js` | Commandes simultanées sur un produit à stock limité, réservations simultanées sur un même véhicule | Oui, données `TEST` seulement (`ALLOW_WRITES=oui` requis) |

## Niveaux

| Niveau | Utilisateurs virtuels (pic) | Montée | Plafond dur de requêtes | Budget de données sortantes |
|---|---:|---|---:|---:|
| 100 | 100 | 2 min puis palier 5 min | 40 000 | 300 Mo |
| 500 | 500 | 10 min puis palier 8 min | 250 000 | 1,5 Go |
| 1 000 | 1 000 | 16 min puis palier 10 min | 600 000 | 3,5 Go |
| 5 000 | 5 000 | 30 min puis palier 10 min | 2 000 000 | 12 Go |

Un niveau ne se lance que si le précédent a réussi **et** que vous l'avez validé en versionnant le fichier vide `tests/load/reports/.niveau-<précédent>-valide`.
Les niveaux 2 à 5 ne sont pas réalistes sur le plan gratuit de Supabase (5 Go de sortie par mois, projet mis en pause après une semaine d'inactivité) : à confirmer avec les mesures du niveau 100.
Les « utilisateurs virtuels » ne sont pas des utilisateurs simultanés réels : ils alternent actions et pauses.

## Garde-fous (non contournables)

Ils sont dans `config/guard.mjs` et vérifiés par `tests/performance-garde-fous.test.cjs` (exécuté par la CI).

1. Références Supabase de production et bloquées refusées, quelle que soit la configuration.
2. Seul le projet TEST nommé dans `KOKI_TEST_PROJECT_REF` est accepté (ou une base locale sur 127.0.0.1).
3. `BASE_URL` distante refusée : aucun test de charge sur `*.vercel.app` ni sur un domaine de l'application.
4. Clé `sb_publishable_…` obligatoire ; clé secrète ou `service_role` refusée.
5. Exécution distante : `AUTORISATION_CHARGE` doit valoir exactement `OUI-<niveau>-<référence TEST>`. Une phrase valable pour 100 ne vaut pas pour 500.
6. Écritures : `ALLOW_WRITES=oui` en plus ; au plus 50 comptes simultanés ; 2 000 requêtes maximum.
7. **Arrêt automatique** (`abortOnFail`) : taux d'erreur, vérifications fonctionnelles, latence p99 extrême, requêtes perdues, nombre de requêtes et volume reçu (`thresholds/thresholds.mjs`).
8. **Sonde avant charge** : une requête mesure la taille du flux, projette le volume sortant total et arrête tout si le budget du niveau serait dépassé.

## Prérequis (à fournir par vous)

- Un projet Supabase **TEST** distinct de la production, avec le schéma et les données fictives (préfixe `TEST`, numéros `+999…`).
- Sa clé **publishable** (jamais de clé secrète) et sa référence.
- Pour les scénarios connectés : des comptes fictifs créés à la main dans Auth, listés dans `tests/load/accounts.json` (copie de `accounts.example.json`, ignoré par Git).
- Pour les écritures : `SHOP_ID`, `PRODUCT_ID`, `VEHICLE_ID` et `STOCK_INITIAL` d'un produit et d'un véhicule `TEST`.
- k6 installé (`https://grafana.com/docs/k6/`) ou le workflow `Performance (manuel)`.

Points d'attention : Supabase Auth limite les connexions par adresse IP, donc les scénarios ouvrent **une seule session par compte** (dans `setup()`) et réutilisent le jeton. Un jeton dure 1 h par défaut : ne dépassez pas cette durée par exécution. La recherche de chauffeurs proches est limitée à 10 par minute et 60 par heure et par compte : elle n'est pas utilisée en charge.

## Lancer (depuis la racine du dépôt)

```bash
k6 run \
  -e NIVEAU=100 \
  -e SUPABASE_URL=https://<référence-TEST>.supabase.co \
  -e KOKI_TEST_PROJECT_REF=<référence-TEST> \
  -e SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
  -e AUTORISATION_CHARGE=OUI-100-<référence-TEST> \
  tests/load/scenarios/public-read.js
```

Le rapport JSON est écrit dans `tests/load/reports/<scénario>-niveau-<N>.json`, avec un résumé lisible en fin d'exécution.

## Workflow GitHub Actions

`Performance (manuel)` : déclenchement manuel uniquement. L'étape `charge-test` attend l'approbation d'un relecteur sur l'environnement `koki-performance-test` (à créer dans Settings → Environments avec « Required reviewers ») et lit ses paramètres dans les variables de cet environnement (`KOKI_TEST_SUPABASE_URL`, `KOKI_TEST_PROJECT_REF`, `KOKI_TEST_PUBLISHABLE_KEY`, …). Les comptes fictifs viennent du secret `KOKI_TEST_ACCOUNTS_JSON`.

## Seuils initiaux

À ajuster après les premières mesures et selon les besoins métier.

| Niveau | p95 | p99 | Erreurs HTTP |
|---|---:|---:|---:|
| 100 | 800 ms | 2 000 ms | 1 % |
| 500 | 1 000 ms | 2 500 ms | 1 % |
| 1 000 | 1 500 ms | 3 500 ms | 2 % |
| 5 000 | 2 500 ms | 6 000 ms | 5 % |

Arrêt immédiat si le p99 dépasse 3 fois la limite. Ces valeurs viennent de simulations depuis un seul site : elles ne reproduisent pas les réseaux mobiles du Sénégal.

## Vérification après écriture

Après `write-concurrency`, contrôlez dans le projet TEST : stock du produit jamais négatif, nombre de commandes acceptées inférieur ou égal à `STOCK_INITIAL`, pas de doublon sur relance. Le scénario s'arrête lui-même si les commandes acceptées dépassent le stock ou si une erreur serveur (5xx) survient.
