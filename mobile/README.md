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
- l'invitation « Ajouter à l'écran d'accueil » et le Web Push sont désactivés dans l'application (notifications natives à venir).

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

1. Cible **App** › **Signing & Capabilities** : choisir l'équipe « Mourtada Fam » (compte Apple Developer).
2. Vérifier que `PrivacyInfo.xcprivacy` apparaît dans la cible App ; sinon, Fichier › Ajouter des fichiers.
3. Brancher l'iPhone, le choisir en haut, puis cliquer sur ▶ (Lecture).

Après chaque modification du site : `npm run sync` dans `mobile/`, puis relancer depuis Xcode.

## À tester sur l'iPhone

- Connexion e-mail et mot de passe, création de compte, mot de passe oublié.
- Accueil, publications, vidéos (fichier et YouTube), partage.
- Boutiques, commande par WhatsApp, appel téléphonique.
- Espace professionnel : ajout de photos (appareil photo et galerie).
- Position et carte (les fonds OpenStreetMap exigent un en-tête « Referer » : si la carte reste grise, il faudra changer de fournisseur de fonds de carte).
- Bibliothèque : lecture d'un PDF et bouton « Ouvrir avec le lecteur du téléphone ».
- Encoche, barre d'accueil, clavier, connexion faible.

## Encore à faire avant la soumission (avec accord pour la production)

1. Bouton « Supprimer mon compte » dans Profil + fonction Supabase de suppression (règle Apple 5.1.1(v)).
2. Notifications natives Apple (APNs) : extension Capacitor, enregistrement des iPhone et envoi par l'API de l'admin.
3. « Signaler » sur les fiches de produits et de boutiques (règle Apple 1.2).
4. Captures d'écran, fiche App Store, compte de démonstration pour Apple, TestFlight.
