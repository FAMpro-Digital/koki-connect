# Numéros utiles — gérés depuis Koki Connect Admin

## Fonctionnement (application publique, fait)

La rubrique « Numéros utiles » affiche :
1. les numéros **publiés dans Koki Connect Admin** (flux `koki_public_feed`), prioritaires ;
2. complétés par les numéros d'urgence enregistrés dans l'application (`assets/portail/numeros-utiles.json`), qui servent aussi **de secours** si le serveur ne répond pas.

Un même numéro (mêmes chiffres) n'apparaît qu'une fois : la version de l'administration l'emporte. Les numéros archivés, en brouillon ou programmés dans le futur ne sont pas affichés. Recherche par nom, description, groupe ou numéro ; bouton « Appeler » (`tel:`).

## Contrat commun : `assets/portail/numeros-contract.js`

À copier **à l'identique** dans le dépôt Koki Connect Admin (comme `education-contract.js`). Aucune nouvelle table : réutilisation de `koki_contents`.

| Champ `koki_contents` | Valeur |
|---|---|
| `type` | `Informations utiles` |
| `categorie` | `Numéros utiles` |
| `titre` | nom du service (ex. « Poste de santé de Koki ») |
| `resume` | description courte |
| `source` | origine de l'information (obligatoire en pratique) |
| `texte` | `KokiNumeroContract.encode({groupe, telephone, description, verifie_le, archive})` |
| `statut`, `publication` | comme les autres contenus (brouillon / publié, programmation) |

Groupes : Urgences nationales, Santé, Sécurité, Administration, Eau et électricité, Transport, Autre. Téléphone : `+221 33 000 00 00` ou numéro court (`17`). Date de vérification : `AAAA-MM-JJ`.

## Dans Koki Connect Admin (fait, branche develop/phases-2-6)

Menu « 📞 Numéros utiles » (`src/numeros-admin.js`, contrat `src/numeros-contract.js` identique à celui-ci) :
- liste par groupe, recherche par nom ou par numéro, filtre par état (publié, brouillon, programmé, archivé) ;
- ajout et modification avec contrôle du téléphone, source obligatoire, date de vérification ;
- alerte si le même numéro existe déjà ; archivage et réactivation (pas de suppression) ;
- bouton « Importer les numéros d'urgence nationaux » : crée les 4 numéros (17, 18, 1515, 800 00 20 20) en brouillon, à relire puis publier.

Droits : rôles `editor` et `superadmin` (permission `content`), double authentification obligatoire, comme les autres contenus. Aucune migration : la table `koki_contents` accepte déjà la catégorie « Numéros utiles » (vérifié sur le schéma réel).
