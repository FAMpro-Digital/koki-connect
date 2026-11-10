# Qualité et modération KOKI CONNECT

La page `/tests-application.html` propose six parcours : compte, boutique, partage, actualités, rubriques et confort. Elle prépare un message vers WhatsApp ou e-mail sans envoi automatique ni stockage de la saisie. Le testeur relit et envoie lui-même. Les tests web ne remplacent pas l’inscription au test fermé Google Play.

## Suivre les retours
Pour chaque retour : date, parcours, appareil, étapes, attendu, observé, capture expurgée, priorité, responsable, correction et résultat du nouveau test. Prioriser connexion impossible et données perdues. Répondre après vérification. Ne jamais demander de mot de passe, OTP ou lien de confirmation.

## Traiter les signalements
Désigner un responsable qui consulte régulièrement l’interface de modération existante et l’assistance. Examiner le contexte, masquer les commentaires abusifs avec un motif et conserver la trace de décision. Ne déclarer un signalement traité qu’après décision. Permettre la contestation à kokiconnect221@gmail.com. Les restrictions administratives de compte sont distinctes du blocage personnel.

## Activer le blocage personnel
Tester puis appliquer `database/publication-blocking.sql` après les migrations d’interactions et de modération. Table privée avec RLS, aucun accès direct client. Le serveur déduit l’auteur du commentaire sans exposer son identifiant. Le blocage filtre tous ses commentaires pour le compte connecté, y compris total et pagination. Le réaffichage annule les blocages du seul compte connecté. Les commentaires masqués par la modération restent masqués.

Le bouton n’apparaît que si le serveur annonce `blocking_available`. Sans migration, les fonctions existantes restent disponibles. Ce blocage concerne les commentaires, pas les commandes, appels ou échanges externes. Aucune migration de production n’est appliquée par cette PR.

## Validation
Node, lint, préparation statique et Playwright bureau/mobile : inscription complète et reprise de photo, boutique/produits, modification, partage, article complet/zoom/retour, absence de voile au toucher, retours et blocage. Vérifier séparément la réception réelle du mail et les appareils Android/iPhone physiques : les simulations ne prouvent pas la délivrabilité ni la compatibilité native.

Les conditions existent à `/conditions.html`, distinctes de la confidentialité. Les rubriques vides restent annoncées en préparation : aucun contenu local n’est inventé.
