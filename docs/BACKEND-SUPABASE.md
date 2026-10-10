# Serveur Commerces, Services et Transport

## Où se trouve le serveur

Le serveur (fonction `public.koki_business`, tables, règles d'accès, photos) est préparé dans le dépôt **Koki Connect Admin**, branche `develop/phases-2-6` :

- `supabase/proposals/commerce-transport-foundation.sql`
- `supabase/proposals/phase2-transactions.sql`
- `supabase/proposals/merchant-profiles.sql`

Ces propositions sont testées dans l'admin (PostgreSQL embarqué) et **ne sont pas encore appliquées** sur Supabase. Elles s'appliquent dans cet ordre, d'abord sur un projet de test, selon `supabase/preproduction/` de l'admin. L'application publique les appelle déjà via `assets/business/client.mjs`. `assets/business/config.json` reste à `"enabled": false` tant que l'activation n'est pas validée (la CI le vérifie).

## Connexion par SMS (ajoutée dans l'application publique)

`assets/business/client.mjs` : `sendCode(numéro)` puis `verifyCode(numéro, code)` (Supabase Auth, OTP par SMS). Les numéros sénégalais à 9 chiffres (77 123 45 67) sont complétés en +221. La connexion par e-mail reste disponible. Tests : `tests/sms-auth.test.cjs`.

Pour l'activer sur le projet Supabase :

1. Authentication → Providers → **Phone** : activer, choisir un fournisseur SMS (Twilio, MessageBird, Vonage…) qui livre au Sénégal (+221), vérifier le coût par SMS.
2. Régler la durée de validité du code et la limite d'envois par heure (risque de fraude par envoi massif).
3. L'inscription libre est actuellement **désactivée** sur le projet (voir README de l'admin) : la connexion par SMS des clients et commerçants exige de l'ouvrir, uniquement quand le serveur métier est appliqué.
4. Tester depuis un téléphone sur le projet de test avant toute production.

## Revue de sécurité des propositions de l'admin (10 octobre 2026)

Vérifiée sur PostgreSQL 16 avec `schema.sql` + les trois propositions :

- **Position des chauffeurs** : la recherche « chauffeurs proches » permettait de retrouver la position exacte d'un chauffeur par appels répétés (frontière des 10 km). **Corrigé dans `phase2-transactions.sql`** : 10 recherches par minute et 60 par heure par compte, distance calculée sur une position arrondie (~500 m), le chauffeur ne se voit pas lui-même. Test : `tests/business-nearby-privacy.test.js`.
- **Fiche suspendue** : déjà correct. Un chauffeur ou commerçant suspendu ne peut plus faire avancer une opération ni obtenir les contacts (`owns_business` exige une fiche active). Ses courses restent ouvertes : le client peut annuler une course « En attente » ou « Acceptée », l'administration peut clôturer les autres.
- **Comptes supprimés** : déjà correct. Les clés étrangères `on delete restrict` empêchent de supprimer un compte lié à une fiche ou une opération ; aucun cas NULL possible.
