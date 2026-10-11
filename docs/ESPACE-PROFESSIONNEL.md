# Espace professionnel (Commerces & Services)

Branche `dev/commerces-services`. Module `assets/business/pro-space.mjs`, chargé dans la rubrique Commerces après connexion (SMS ou e-mail). Le mode métier reste désactivé en production (`assets/business/config.json`) ; l'espace fonctionne avec le Supabase local (`node scripts/serve-local.mjs`).

## Parcours

1. **Connexion par SMS** (mécanisme existant). Le numéro du compte préremplit la fiche.
2. **Fiche en 5 étapes** : activité (commerce, services ou les deux) et catégorie → téléphone et WhatsApp (numéros sénégalais complétés en +221) → village ou quartier (liste), adresse, zone, **GPS facultatif** → horaires et présentation → photos compressées (5 maximum) et récapitulatif.
3. **Statut affiché et expliqué** : En attente / À valider, Actif, Refusé (avec motif), Suspendu, Archivé.
4. Après validation : **boutiques** (créées « À valider »), **produits** (prix, ancien prix, stock — stock 0 = Épuisé), **services** (prix fixe ou sur devis, zone) ; disponibilité modifiable en un geste ; archivage avec confirmation.
5. **Navigation** : bouton « ← Retour » sur chaque écran, bouton retour du téléphone pris en charge (historique), « Retour au catalogue » depuis l'accueil de l'espace.

Aucun identifiant technique n'est demandé : la fiche, la boutique et les éléments à modifier viennent du compte connecté. Toutes les règles (propriétaire, validation, prix, doublons, photos) sont vérifiées par le serveur (`docs/commerce-modernisation.md` de l'admin).

## Photos

Compressées sur le téléphone avant l'envoi, déposées dans un dossier anonyme propre au compte : les adresses de photos du catalogue ne révèlent pas l'identifiant du compte.

## Tests

`tests/pro-space.test.cjs` (commandes, dossier photo, images locales, numéros, absence d'identifiant à saisir, navigation), `tests/commerce-contract.test.cjs`. Parcours complet vérifié dans Chromium (profils iPhone 13, iPhone SE, Pixel 7, petit Android 360 × 640) sur les vraies règles SQL : à confirmer sur de vrais téléphones (Safari iOS notamment).

## Catalogue public (phase 3)

Modules `assets/business/catalogue.mjs` (écran) et `assets/business/catalogue-state.mjs` (données, testées sans navigateur). Visible sans connexion, avant la zone « Mon compte ».

- Quatre rubriques : Commerces, Boutiques, Produits, Services (avec compteurs).
- Recherche par nom, métier, catégorie et village (sans accents ni majuscules) ; filtres catégorie ou métier, village ou quartier, « Disponibles seulement », tri par prix ou par nom.
- Fiches détaillées : galerie à faire glisser, prix FCFA, ancien prix et promotion, stock et disponibilité, horaires, zone, « Voir sur la carte » si une position est fournie.
- Contacts vérifiés par le contrat partagé : « Appeler » (`tel:+221…`), « WhatsApp », « Commander sur WhatsApp » (produit, quantité et prix préremplis ; jamais pour un produit épuisé), « Demander un devis sur WhatsApp » pour les services. WhatsApp de la boutique en priorité, sinon celui de la fiche, sinon son téléphone.
- Panier et commandes internes conservés (un panier par boutique, conservé sur l'appareil), demande de service interne conservée.
- Navigation : produit → boutique → commerce, « ← Retour » et bouton retour du téléphone.
- Protection : seuls les champs publics connus sont gardés, et seulement si toute la chaîne (commerce → boutique → produit) est publiée ; chemins de photos contrôlés ; aucune donnée d'administration ni modification en attente affichée ; liens externes ouverts sans accès à la page (`noopener`).

Tests : `tests/catalogue.test.cjs`.
