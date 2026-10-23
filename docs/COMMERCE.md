# Commerces & Services

Le site actuel est statique : aucune base métier, authentification ou API de commandes n'existe. Le catalogue réel (`assets/commerce/catalogue.json`) reste vide jusqu'à validation de professionnels. Le mode démo explicite permet de tester produits, panier, stock, retrait/livraison, demandes avec photo, profil professionnel, édition des offres et statuts. Les données sont enregistrées uniquement sur cet appareil ; aucun vendeur, prestataire ou chauffeur n'est contacté. Les prix sont fictifs. Les frais de livraison sont exclus du total et restent à confirmer.

## Organisation

- `core.js` : règles de stock, calcul des montants, validation des demandes et transitions séquentielles.
- `app.js` : interface, catalogue réel en lecture, dépôt local de démonstration (`lire`, `sauver`, `donnees`). Tous les contenus saisis passent par textContent.
- `style.css` : styles limités à la rubrique ; aucune refonte des autres vues.
- Géolocalisation : réutilisation de `obtenirPositionActuelle` et des lieux OSM de `chargerDonneesCarte`. Aucun deuxième système GPS.
- Transport : `KokiTransport.preparerTrajet({depart,destination,motif,reference})` prépare les points sans réservation. Distance commune calculée à vol d'oiseau, pas distance routière. Une course active est préservée.

## Mise en production future

Remplacer le dépôt local par une API authentifiée partagée, avec tables professionnels, boutiques, produits, services, médias, commandes, lignes de commande, demandes de services et missions Transport. Profils commerçant/prestataire/les deux et permissions serveur par propriétaire. Les statuts doivent être autorisés côté serveur et historisés avec acteur/date ; aucun changement client seul ne doit valider une vraie opération.

Vérifier prix et stocks en transaction serveur au moment de commander ; réserver/décrémenter les stocks de manière atomique. Pour plusieurs vendeurs, séparer la commande en sous-commandes avec livraison et contacts distincts. Conserver un instantané des prix et adresses. Valider les professionnels et leurs coordonnées avant publication.

Les missions Transport référencent la commande ou demande source, professionnel, client, chauffeur et points de départ/arrivée. Ajouter un adaptateur de distance routière, tarification validée, acceptation chauffeur et suivi GPS avec consentement. Une demande commerciale ne réserve actuellement aucune course.

Prévoir stockage de photos avec validation serveur, limites, suppression et permissions ; le mode démo accepte JPEG/PNG/WebP jusqu'à 1 Mo et peut atteindre la limite de stockage du navigateur. Pas de comptes ni de synchronisation entre appareils dans cette version.

Extensions : paiements Mobile Money/en ligne confirmés par webhook vérifié et idempotent ; favoris/avis liés aux comptes et transactions ; notifications événementielles ; historique côté serveur ; commissions et abonnements Premium avec grand livre ; promotions sponsorisées identifiées avec dates de validité. Ces fonctions sont des points d'extension, pas des fonctions activées.

## Améliorations du catalogue (octobre 2026)

- **Hors connexion** : la dernière copie du catalogue public est gardée sur l'appareil (`koki.commerce.catalogue`, 1,5 Mo maximum) et affichée avec sa date quand le réseau manque.
- **Contact sans compte** : « Appeler » et « Écrire sur WhatsApp » sont directs ; « Commander » et l'ajout au panier exigent toujours un compte client.
- **Ouvert / Fermé** : déduit du texte libre des horaires (`catalogue-extras.mjs`, heure de Dakar). Horaires incompris : aucune pastille.
- **Favoris** (sur l'appareil), **partage** (`?fiche=<id>` ouvre la fiche), tri « Les plus proches » (position demandée une fois, jamais enregistrée), filtres « Promotions » et « Ouvert maintenant ».
- **Espace commerçant** : alerte et mise à jour rapide du stock (seuil 3), statistiques sur 30 jours.
- **Avis, suivi et statistiques** : appellent les fonctions `koki_reviews_list`, `koki_review_save`, `koki_track`, `koki_stats_mine` (proposition SQL du dépôt admin, non appliquée). Tant qu'elles ne sont pas installées, ces trois fonctions sont masquées.
