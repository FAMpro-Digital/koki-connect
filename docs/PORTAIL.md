# Portail quotidien de Koki

L'accueil lit les contenus depuis `assets/portail/contenus.json`, indépendamment du HTML. Le fichier est volontairement vide : aucune actualité, publicité, opportunité ou annonce réelle n'est inventée. Les modules Transport, Commerces, météo et carte existants restent utilisés.

Le tableau de bord est accessible depuis Profil, Publier et Menu. Il propose création, modification, suppression locale, brouillon/publication, programmation, image (1 Mo), auteur/source, mise à la une, événement avec lieu/date, campagnes avec emplacement/activation/fin. Le navigateur de Dakar utilise UTC ; les dates saisies sont converties explicitement en UTC. Les publications futures et campagnes expirées/inactives sont masquées. L'accueil réévalue les dates chaque minute. Les événements à venir sont triés par proximité de date ; le fil d'actualités par date décroissante. Affichage limité à trois cartes par bloc, images chargées à la demande, recherche temporisée et limitée à 30 résultats visibles.

**Limite actuelle :** ce tableau de bord n'est pas un administrateur authentifié. Les écritures sont stockées sur cet appareil dans `koki.portail.local.v1` et peuvent être exportées. Le fichier JSON partagé reste accessible en lecture et peut être publié via Git. Les suppressions locales utilisent des marqueurs pour préserver la suppression d'un contenu issu du catalogue. Les favoris sont locaux. Aucune inscription utilisateur ni diffusion générale n'est annoncée.

La recherche indexe les contenus publiés, produits, services, professionnels, chauffeurs du catalogue validé, rubriques et lieux OSM partagés. Les jeux de démonstration Transport/Commerce ne sont pas mélangés aux données réelles. Les coordonnées ne sont pas redemandées : accès carte et GPS partagés conservés. L'inventaire OSM reste incomplet.

## Passage à une administration partagée

Brancher un dépôt éditorial/API dans l'initialisation, lecture et sauvegarde, avec comptes/permissions serveur (éditeur, modérateur, administrateur), révisions, audit, validation des images, stockage distant, contrôle des liens et modération des publications communautaires. Le serveur décide de la visibilité et de l'horloge. Ne pas publier ce tableau de bord local comme espace administrateur sécurisé. Réutiliser le futur backend métiers de Commerces/Transport, sans nouvelle authentification parallèle.

Modèle contenu : id, type, titre, résumé, texte, catégorie, statut, publication, source, image, mise à la une, dates de création/modification, événement/lieu ; campagne : actif, emplacement, fin et futur lien de destination. Prévoir impression/clic via adaptateur de campagnes, avec visibilité réelle (IntersectionObserver), déduplication, consentement et agrégation serveur. Aucun suivi publicitaire ni transmission analytique n'est actif aujourd'hui. Les favoris pourront être synchronisés par compte ; les notifications émaneront des événements de publication de cette même API.
