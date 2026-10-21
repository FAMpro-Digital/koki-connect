# Mise en production : ordre, vérifications, retour arrière

Rien n'est fusionné, déployé ni appliqué en production sans approbation explicite du propriétaire.

## Ordre de fusion recommandé

Application publique (`koki-connect`), PR empilées : chaque PR contient les commits de la précédente.

1. #44 CI (`verify`) — puis importer le ruleset `.github/rulesets/protect-main.json` (voir `docs/CI-CD.md`)
2. #45 performances (WebP, Leaflet à la demande, scripts et CSS non bloquants, images signées par lot)
3. #46 sécurité (scripts et gestionnaires inline retirés, CSP stricte en Report-Only, purge à la déconnexion)
4. #47 service worker v2 et flux public hors ligne
5. #48 ESLint, Playwright, tests `business-state.js`, suivi des dépendances
6. cette PR (documentation)

Administration (`koki-connect-admin`) : #30 CI → #31 SQL flux paginé et quotas (proposition, non appliquée) → #32 tests de charge.

Après chaque fusion, la PR suivante est automatiquement mise à jour par GitHub ; relancer `verify` si besoin.

## Avant de fusionner la PR #46 (CSP)
Le comportement visuel est inchangé, mais ce sont 88 boutons qui changent de mécanisme : parcourir l'accueil, Transport, Commerces, Opportunités et Profil sur un téléphone depuis l'aperçu (aperçus désactivés par défaut : créer un aperçu manuel, relié à un Supabase de TEST).

## Vérifications après déploiement (5 minutes)
1. Accueil : date affichée, logo, flux de contenus, météo.
2. Menu ☰, Profil, Notifications, recherche.
3. Carte de Koki : s'ouvre (Leaflet chargé à la demande) ; Transport : la carte s'ouvre aussi.
4. Connexion puis déconnexion d'un compte de test ; après déconnexion, plus de course ni de notes de trajet sur l'appareil.
5. Mode avion après une première visite : l'accueil s'ouvre ; les contenus déjà vus s'affichent.
6. Console du navigateur : aucune violation `Content-Security-Policy-Report-Only` pour `script-src`.
7. Onglet Réseau : pas de `leaflet.js` ni de `fampro-digital.png` au chargement de l'accueil.

## Retour arrière
- Application publique : `git revert` du commit de fusion de la PR concernée (une PR = un sujet), puis redéploiement. Après un revert de #47, incrémenter `VERSION` dans `sw.js` pour purger les copies chez les utilisateurs.
- CSP : l'en-tête appliqué n'est pas modifié par #46 ; il suffit de retirer l'en-tête `Content-Security-Policy-Report-Only` pour l'annuler.
- SQL (#31) : `drop trigger koki_quota_ecriture on public.koki_records; drop function koki_private.quota_ecriture(); drop function public.koki_public_feed_page(integer,timestamptz,uuid);` (aucune donnée n'est créée ni modifiée par cette proposition).
- Vercel : le tableau de bord permet de re-promouvoir le déploiement précédent en un clic.

## Passage à une CSP stricte (étape ultérieure, sur validation)
Après quelques jours en production sans violation signalée en Report-Only : remplacer `script-src 'self' 'unsafe-inline'` par `script-src 'self'` dans l'en-tête `Content-Security-Policy`, puis retirer l'en-tête Report-Only.

## Réglages à faire à la main dans Supabase (non lisibles ni modifiables par l'automatisation)
- Authentication → Rate limits : limites d'envoi d'e-mails, de SMS et de vérifications par heure.
- Authentication → Attack protection : CAPTCHA pour l'inscription et la connexion par code.
- Fournisseur SMS (Twilio, etc.) : plafond de dépense mensuel et alertes ; pays autorisés (+221).
- Authentication → Providers : protection contre les mots de passe compromis (réservée aux forfaits payants).
- Vérifier le Production Branch de Vercel (`main`) et la protection des aperçus.
