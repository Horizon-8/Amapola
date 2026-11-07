# Google Calendar dans Amapola 0.6.1

## Première connexion

Cette configuration se fait une fois pour ton application. La connexion Google de ChatGPT ne peut pas être transférée à Amapola, qui tourne directement sur ton PC.

1. Ouvre https://console.cloud.google.com/ avec le compte qui gérera les cours. Crée un projet, par exemple **Amapola**.
2. Dans **APIs et services → Bibliothèque**, active **Google Calendar API**.
3. Dans **Google Auth Platform**, configure le nom de l'application et ton adresse de contact. Pour un compte personnel, choisis une audience externe. Si le projet est en mode test, ajoute ton adresse dans les utilisateurs de test. Les autorisations d'une application externe en mode test peuvent expirer après sept jours ; une reconnexion sera alors nécessaire. Une utilisation par d'autres personnes peut demander la vérification Google.
4. Dans **Clients / Identifiants**, crée un **ID client OAuth** de type **Application de bureau / Desktop app**. Télécharge son fichier JSON. Un client Web ou une clé API ne convient pas. Il n'est pas nécessaire de publier Amapola ou son dépôt GitHub.
5. Dans Amapola, ouvre **Mi información → Sincronización con Google Calendar**. Clique **Importar conexión Google (.json)**, sélectionne ce fichier, puis **Conectar Google** et autorise le compte.
6. De retour dans Amapola, clique **Cargar agendas**. Tous les agendas accessibles sont lus par défaut. Coche ceux à conserver, puis **Guardar selección de agendas**. L'agenda **Amapola**, créé par l'application, reste toujours synchronisé.

Les permissions demandées permettent de lire les agendas accessibles et leurs événements, et de gérer les événements des agendas créés par l'application. Amapola écrit uniquement dans l'agenda Amapola qu'elle a créé. Elle ne modifie pas tes événements personnels.

## Règles

- Au lancement, après une modification locale et toutes les deux minutes lorsque le programme est ouvert : **Google → Amapola**, puis **Amapola → Google**. Le bouton général **Sincronizar** permet de demander les deux étapes immédiatement.
- Sur la page Calendrier, **Recibir de Google** importe uniquement : aucun événement n'est envoyé, modifié ou supprimé dans Google par ce passage. **Enviar a Google** vérifie d'abord les changements Google, puis envoie les changements locaux. La synchronisation automatique habituelle reste active.
- La fenêtre synchronisée couvre **30 jours glissants**, d'aujourd'hui au jour 29 inclus, selon le fuseau horaire configuré. Aucun historique antérieur ni année entière n'est transféré. Un événement déjà lié qui est déplacé hors de cette fenêtre est aligné une fois, puis reste conservé sans être consulté à chaque passage tant qu'il reste hors période. Sortir de la fenêtre ne signifie jamais qu'il a été supprimé. Les séries Amapola sont envoyées sous forme de sessions individuelles sur ce mois.
- Les autres événements Google sont des blocs **Busy**, gris rayés, avec leur titre d'origine. Les événements sur plusieurs jours et les journées entières occupent les jours correspondants. Un bloc Google se modifie dans Google.
- Une description commençant par **Amapola** crée une entrée **Por completar** : sélectionner l'élève, le tarif, la modalité et vérifier l'horaire. Cette entrée ne génère aucun revenu avant son association. La classe créée est ponctuelle, sans nouvelle planification récurrente.
- Pour éviter une copie dans deux agendas Google, crée les cours directement dans l'agenda **Amapola**. Si tu marques un événement d'un autre agenda, Amapola conserve l'original et t'avertit avant de créer son événement lié dans l'agenda Amapola. Les modifications ultérieures de l'original sont aussi récupérées ; un changement direct dans l'agenda Amapola est prioritaire si les deux ont changé au même passage.
- Google commande les changements de titre, de date et d'horaire. Le tarif, l'élève, la modalité et le paiement se modifient dans Amapola ; leur copie dans la description Google est informative. Aucun prix saisi dans une description Google ne modifie les paiements.
- Une suppression **confirmée par Google** annule la classe dans Amapola et conserve son paiement et son historique. Une réponse incomplète, une erreur de permission ou une coupure réseau n'est jamais interprétée comme une suppression.
- Supprimer une classe dans Amapola supprime son événement Google au prochain passage réussi, après l'import. Une suppression en attente et une modification concurrente dans Google demandent de choisir **Conservar Google** ou de confirmer **Aplicar eliminación Amapola**.
- Une classe annulée depuis Amapola reste visible dans Google avec le préfixe **[Cancelada]** et ne bloque plus le créneau Google. Réactiver une classe dont l'événement Google avait été supprimé crée un nouvel événement lié.
- Un horaire Google inhabituel reste visible et peut demander une correction. Les créations et corrections faites dans Amapola conservent les pas de 15 minutes.

## Statut et fonctionnement hors connexion

Le haut de l'application affiche l'état Google : déconnecté, en cours, changements à envoyer, données reçues, synchronisé, hors connexion ou à vérifier. Les paramètres distinguent la dernière réception, le dernier envoi et la dernière synchronisation complète. Une réception seule n'est pas annoncée comme un envoi terminé. Les erreurs réseau affichent aussi une notification. Les données sont d'abord enregistrées sur le PC. Si Google est indisponible, les modifications sont reprises lors d'un prochain passage réussi ; un état hors connexion ne signifie pas « synchronisé ».

Amapola.exe doit être ouvert pour synchroniser. Quand le PC est éteint, les événements déjà envoyés restent accessibles sur le téléphone. Les modifications du téléphone seront récupérées au prochain lancement d'Amapola.

Pendant un passage de synchronisation, une modification locale peut demander d'attendre avant d'enregistrer. Le formulaire reste rempli. Cette règle évite de mélanger des écritures pendant le rapprochement. La première exportation se fait par lots de 25 événements pour garder une progression visible.

## Sauvegarde et changement de PC

Les copies `.amapola` **v6** conservent les liens entre événements et classes, les imports à compléter, les agendas sélectionnés et tous les paiements, élèves, planifications et indisponibilités. Les anciennes copies v1 à v5 restent lisibles par Amapola 0.6.0.

Les autorisations Google sont stockées séparément dans `google-connection.json`, dans le dossier de données du PC, et chiffrées avec le compte Windows. Elles ne sont pas incluses dans le ZIP, GitHub ou les sauvegardes `.amapola`.

Sur un autre PC : installer la version compatible, restaurer la copie, importer le **même fichier client Google**, reconnecter le **même compte**, vérifier les agendas puis cliquer **Reanudar sincronización**. Une restauration met la synchronisation en pause pour ne pas envoyer automatiquement une ancienne copie vers Google. Les liens sauvegardés servent à retrouver les événements existants.

Les trente dernières copies de sécurité précédant des changements de classes par Google sont conservées localement, en plus des sauvegardes automatiques habituelles.

## Documentation Google

- OAuth pour application de bureau : https://developers.google.com/identity/protocols/oauth2/native-app
- Permissions Calendar : https://developers.google.com/workspace/calendar/api/auth
- Identification cachée des événements : https://developers.google.com/workspace/calendar/api/guides/extended-properties
- Contrôle des modifications concurrentes : https://developers.google.com/workspace/calendar/api/guides/version-resources
