# Synchronisation avec Koki Connect Admin

Le portail charge les contenus via le flux public Supabase koki_public_feed. La clé du fichier assets/portail/backend.json est une clé publishable ; aucun secret ni compte administrateur n'est utilisé côté public.

Seuls les contenus publiés et arrivés à leur date de publication sont affichés. Les publicités désactivées ou expirées sont exclues. L'actualisation a lieu toutes les 60 secondes lorsque la page est visible, et au retour dans l'application. Les médias utilisent des URL signées de 120 secondes, renouvelées lors de l'actualisation. Un média déjà chargé peut rester affiché après dépublication pendant cette fenêtre.

Les anciens brouillons locaux sont conservés et exportables depuis Publier > Mes anciens brouillons. Ils ne remplacent pas les contenus du serveur. Publier ouvre l'administration sécurisée.

En cas de panne du flux, les autres rubriques restent accessibles ; aucune statistique ou publication fictive n'est ajoutée. Carte, météo et géolocalisation restent inchangées. Les transactions de commerce et de transport restent en mode démonstration local et ne sont pas envoyées au serveur : leur raccordement transactionnel reste à réaliser.
