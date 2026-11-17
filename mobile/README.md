# KOKI CONNECT — application iOS (Capacitor)

Ce dossier contient l'application iOS. Elle embarque les fichiers du site public (copiés dans `www/`) et ajoute les fonctions du téléphone. Le site www.kokiconnect.com n'est pas modifié : ce dossier n'est jamais déployé sur Vercel (voir `.vercelignore` à la racine).

## Ce qui est déjà prêt dans la branche `feature/ios-app-store`

| Élément | Fichier |
| --- | --- |
| Configuration Capacitor (identifiant `com.kokiconnect.app`, nom « KOKI CONNECT ») | `capacitor.config.json` |
| Dépendances de l'application iOS (séparées du site) | `package.json` |
| Copie des fichiers de l'application + politique de sécurité (CSP) | `scripts/build-www.mjs` |
| Textes d'autorisation en français, déclaration de chiffrement | `scripts/configurer-ios.mjs` |
| Fichier de confidentialité Apple | `ios-modeles/PrivacyInfo.xcprivacy` |
| Icône 1024 × 1024 et écran de lancement | `resources/icon.png`, `resources/splash.png` |
| Détection de l'application dans le code du site | `../assets/portail/natif.js` |

Adaptations du code, sans effet sur le site web :

- « Continuer avec Google » est masqué dans l'application iOS (règle Apple 4.8) ;
- les liens partagés pointent toujours vers www.kokiconnect.com ;
- les livres PDF s'ouvrent aussi dans la visionneuse de l'iPhone ;
- l'invitation « Ajouter à l'écran d'accueil » et le Web Push sont désactivés dans l'application ;
- Profil › Mes notifications propose « Activer les notifications sur cet iPhone » (notifications Apple, APNs).

## Commandes sur le MacBook Air M1

Prérequis : macOS Sequoia 15.6 ou plus récent, Xcode 26 ouvert une fois (licence acceptée), Node.js 22 ou plus récent, CocoaPods.

```bash
cd "/Volumes/STOCKAGE MAC/KOKI CONNECT"
git clone https://github.com/FAMpro-Digital/koki-connect.git koki-connect-ios
cd koki-connect-ios
git checkout feature/ios-app-store
cd mobile
npm install                # si une version manque : npm install <paquet>@latest
npm run build              # prépare www/
npx cap add ios            # crée le projet Xcode (dossier ios/)
npm run configurer         # autorisations en français + fichier de confidentialité
npm run icones             # icônes et écran de lancement à partir de resources/
npx cap sync ios
npm run ouvrir             # ouvre Xcode
```

Dans Xcode :

1. Cible **App** › **General** › **Supported Destinations** : garder seulement **iPhone** (pas d'iPad, pas de Mac).
2. Cible **App** › **Signing & Capabilities** : choisir l'équipe. Avant l'inscription payante, l'équipe « Personal Team » de votre identifiant Apple suffit pour le simulateur et pour votre iPhone (7 jours).
3. Après l'inscription au programme développeur : **+ Capability** › **Push Notifications** (impossible avec « Personal Team »).
4. Vérifier que `PrivacyInfo.xcprivacy` apparaît dans la cible App ; sinon, Fichier › Ajouter des fichiers.
5. Choisir « iPhone 17 Pro Max » (simulateur) ou votre iPhone en haut, puis cliquer sur ▶ (Lecture).

Après chaque modification du site : `npm run sync` dans `mobile/`, puis relancer depuis Xcode.

## À tester sur l'iPhone

- Connexion e-mail et mot de passe, création de compte, mot de passe oublié.
- Accueil, publications, vidéos (fichier et YouTube), partage.
- Boutiques, commande par WhatsApp, appel téléphonique.
- Espace professionnel : ajout de photos (appareil photo et galerie).
- Position et carte (les fonds OpenStreetMap exigent un en-tête « Referer » : si la carte reste grise, il faudra changer de fournisseur de fonds de carte).
- Bibliothèque : lecture d'un PDF et bouton « Ouvrir avec le lecteur du téléphone ».
- Encoche, barre d'accueil, clavier, connexion faible.

## Notifications iPhone (APNs) : mise en service

Le code est prêt (application, base de données, envoi par l'admin) mais rien n'est actif tant que ces étapes ne sont pas faites :

1. Compte développeur : **Certificates, Identifiers & Profiles** › **Keys** › **+** › cocher **Apple Push Notifications service (APNs)**. Télécharger la clé `.p8` (une seule fois possible) et noter son **Key ID** et votre **Team ID**.
2. Dans Vercel (projet de l'admin), ajouter les variables : `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (contenu complet du `.p8`), `APNS_BUNDLE_ID=com.kokiconnect.app`, et `APNS_SANDBOX=true` seulement pour les essais lancés depuis Xcode (TestFlight et App Store utilisent le serveur de production).
3. Avec accord : appliquer `database/notifications-iphone.sql` en production.
4. Sur l'iPhone : Profil › Mes notifications › « Activer les notifications sur cet iPhone ».

## Encore à faire avant la soumission

1. Captures d'écran, compte de démonstration pour Apple, fiche App Store (document « KOKI CONNECT — Fiche App Store »).
2. TestFlight, puis soumission.

Déjà en ligne : « Supprimer mon compte » (5.1.1(v)) et « Signaler » sur les fiches (1.2).
