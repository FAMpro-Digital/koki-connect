# Transport — MVP KOKI CONNECT

## Version actuelle

Application statique. La rubrique Transport remplace uniquement le raccourci Autour de moi sur l’accueil. Les autres rubriques et le registre OpenStreetMap restent conservés. `obtenirPositionActuelle()` dans `index.html` est le fournisseur GPS partagé par Transport et `activerGeolocalisation()`. Un seul appel natif `getCurrentPosition` existe ; la position GPS ne persiste pas hors d’une course de démonstration enregistrée sur l’appareil.

- `assets/transport/core.js` : calcul de distance, tarifs, catégories, proximité, fraîcheur GPS, transitions de course et validation des numéros.
- `assets/transport/app.js` : interface, sélection de lieux ou de points, carte et dépôt de courses démo.
- `assets/transport/config.json` : registre de chauffeurs réels actuellement vide, tarifs réels non définis, grille fictive de démonstration.
- `assets/transport/style.css` : styles limités à Transport, une colonne sur mobile.

La démonstration est volontaire : aucune course réelle, aucun paiement ni message n’est envoyé. Les contacts sont désactivés pour les chauffeurs fictifs. Les statuts sont avancés manuellement avec des boutons « Simuler ». Une seule course démo peut être active ; son trajet est verrouillé jusqu’à sa fin ou son effacement. La course est stockée sous `koki.transport.demo.course.v1`, sans historique ni compte ; effacer la course supprime cette donnée locale. Le GPS est ponctuel, pas en temps réel.

L’estimation utilise la distance à vol d’oiseau. Elle ne constitue pas un itinéraire routier. Le montant démo est arrondi aux 50 FCFA supérieurs. Les coefficients sont fictifs et ne doivent pas être publiés comme des prix contractuels. Les lieux OpenStreetMap restent approximatifs. Les positions de démonstration sont générées autour du départ et signalées comme fictives.

## Données et futures interfaces

Chauffeur : `id`, `nom`, `telephone` au format international (ex. +221…), `categorie` parmi Moto/Taxi/Voiture/Minicar, `vehicule`, `disponible`, `localisation: {latitude, longitude}`, `positionMiseAJour` en ISO UTC. Les chauffeurs visibles doivent être disponibles, à moins de 10 km du départ, et leur position doit dater de moins de 15 minutes. Ce filtre ne remplace pas la confirmation d’un chauffeur. Ne pas inscrire des données personnelles dans un fichier public sans autorisation.

Course : `schemaVersion`, `id`, `demo`, `depart`, `destination`, `categorie`, `chauffeurId`, `estimation`, `statut`, `creeLe`, `miseAJour`. Les statuts sont En attente → Acceptée → Chauffeur en route → Course en cours → Terminée. Ajouter une annulation et un refus pour le service réel.

Le dépôt `depot` isole la configuration, la persistance et la réservation. `demanderReelle()` refuse actuellement toute réservation ; il doit être remplacé par une API authentifiée. `reservationConnectee` est informatif et ne suffit jamais à activer les réservations.

### GPS et comptes chauffeur

Prévoir `GET /drivers?category=&lat=&lon=` pour disponibilités confirmées, `PATCH /drivers/me/location` pour GPS temps réel, et un abonnement WebSocket/SSE aux événements de course. Le serveur conserve le chauffeur propriétaire et l’horodatage de position ; aucune confiance dans une disponibilité ou une identité soumise par le navigateur. Ne communiquer la position exacte qu’aux acteurs autorisés.

### Réservations et historique

Prévoir `POST /rides` avec clé d’idempotence, `GET /rides/:id`, `GET /me/rides`, et commandes serveur d’acceptation/départ/démarrage/fin. Le serveur vérifie acteur, chauffeur disponible et transition autorisée. Les boutons de simulation ne doivent jamais piloter les courses réelles. Gérer expiration, refus, double réservation et reconnexion. Conserver l’historique et la machine d’état côté serveur, plutôt que localStorage.

### Tarifs, évaluations et paiement

Prévoir `POST /quotes` avec calcul routier et grille locale validée, durée de validité et détail du prix ; confirmer le tarif avant réservation. `POST /rides/:id/review` après une course terminée, une évaluation par passager. Le paiement sera distinct du statut de course, calculé côté serveur, avec fournisseur de paiement et webhooks vérifiés ; aucune clé secrète ou autorité de paiement dans la page.

## Validation

`node tests/transport.test.cjs` vérifie le noyau et le fournisseur GPS partagé. Vérifier aussi l’interface en 390 × 844 et 320 × 740 : trajet, quatre catégories, mode démo, course complète, retour à l’accueil, réouverture et absence de débordement. Tester les rubriques carte, opportunités, menu et notifications après ajout.
