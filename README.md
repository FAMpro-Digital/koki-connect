# koki-connect
Application communautaire et plateforme numérique locale de Koki – Tout Koki, dans votre poche.

## Structure
- `index.html`, `assets/` : application web installable (PWA), statique.
- `assets/business/` : espace connecté Commerces / Transport, connexion par SMS (désactivé par défaut, voir `docs/BACKEND-SUPABASE.md` ; serveur dans Koki Connect Admin).
- `assets/portail/numeros-contract.js` : format des numéros utiles partagé avec Koki Connect Admin (`docs/NUMEROS-UTILES.md`).
- `collecte/` : classeur de collecte des données réelles et convertisseur (voir `collecte/README.md`).
- `docs/` : documentation par module.

## Tests
```bash
node --test tests/*.test.cjs          # application
python3 collecte/tests/test_convertir.py   # collecte
node scripts/prepare-preview.mjs      # préproduction statique
```
