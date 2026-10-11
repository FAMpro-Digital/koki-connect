# Collecte des données réelles de Koki

1. Ouvrez `Koki_Collecte_Donnees.xlsx` et lisez la feuille « Lisez-moi ».
2. Remplissez les feuilles (numéros utiles, écoles, lieux et services, commerces et artisans). Une ligne n'est importée que si **Autorisation de publier = Oui** et **Vérifié = Oui**.
3. Convertissez : `python3 collecte/convertir_collecte.py Koki_Collecte_Donnees.xlsx` (nécessite `openpyxl`).
4. Lisez `collecte/sortie/rapport.md`, corrigez les erreurs, relancez.
5. Importez :
   - `numeros-utiles.json` → copiez-le dans `assets/portail/numeros-utiles.json` (rubrique « Numéros utiles ») ;
   - `contenus-admin.json` → brouillons à saisir ou importer dans Koki Connect Admin (écoles au format du contrat `koki.education.school`), puis relire et publier ;
   - `commercants-a-inviter.csv` → liste des commerçants d'accord : chacun crée sa fiche depuis l'application (connexion par SMS, « Ma fiche commerçant »), puis l'admin la valide. Le serveur exige un propriétaire par fiche : pas d'import direct.

Déjà rempli : les 4 numéros d'urgence nationaux (17, 18, 1515, 800 00 20 20), source citée. Une piste à confirmer (nouveau lycée de Koki) est marquée « Vérifié = Non ». Aucune autre donnée n'a été inventée.

Pour régénérer le classeur vierge : `python3 collecte/generer_classeur.py`. Test : `python3 collecte/tests/test_convertir.py`.
