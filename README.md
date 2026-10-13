# koki-connect
Application communautaire et plateforme numérique locale de Koki – Tout Koki, dans votre poche.
Le profil professionnel permet de sélectionner sa position GPS.

## Structure
- `index.html`, `assets/` : application web installable (PWA), statique.
- `assets/business/` : espace connecté Commerces / Transport, connexion par SMS (désactivé par défaut, voir `docs/BACKEND-SUPABASE.md` ; serveur dans Koki Connect Admin).
- `assets/portail/numeros-contract.js` : format des numéros utiles partagé avec Koki Connect Admin (`docs/NUMEROS-UTILES.md`).
- `collecte/` : classeur de collecte des données réelles et convertisseur (voir `collecte/README.md`).
- `docs/` : documentation par module.

## Développement avec Supabase local
Le serveur Supabase local (Docker, données fictives) se démarre depuis Koki Connect Admin (`supabase start`, voir `docs/supabase-local.md` de l'admin). Ensuite :
```bash
node scripts/serve-local.mjs          # http://127.0.0.1:8080, relié à http://127.0.0.1:54321
```
Les fichiers publiés ne changent pas : la configuration locale est servie à la volée, uniquement sur 127.0.0.1. Détails : `docs/BACKEND-SUPABASE.md`.

## Tests
```bash
node --test tests/*.test.cjs          # application
python3 collecte/tests/test_convertir.py   # collecte
node scripts/prepare-preview.mjs      # préproduction statique
```
