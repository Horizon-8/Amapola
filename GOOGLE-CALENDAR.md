# Google Calendar dans Amapola 0.8.1

## Première connexion

Cette configuration se fait une fois pour ton application. La connexion Google de ChatGPT ne peut pas être transférée à Amapola, qui tourne directement sur ton PC.

1. Ouvre https://console.cloud.google.com/ avec le compte qui gérera les cours. Crée un projet, par exemple **Amapola**.
2. Dans **APIs et services → Bibliothèque**, active **Google Calendar API**.
3. Dans **Google Auth Platform**, configure le nom de l'application et ton adresse de contact. Pour un compte personnel, choisis une audience externe. Si le projet est en mode test, ajoute ton adresse dans les utilisateurs de test. Les autorisations d'une application externe en mode test peuvent expirer après sept jours ; une reconnexion sera alors nécessaire. Une utilisation par d'autres personnes peut demander la vérification Google.
4. Dans **Clients / Identifiants**, crée un **ID client OAuth** de type **Application de bureau / Desktop app**. Télécharge son fichier JSON. Un client Web ou une clé API ne convient pas. Il n'est pas nécessaire de publier Amapola ou son dépôt GitHub.
5. Dans Amapola, ouvre **Mi información → Sincronización con Google Calendar**. Clique **Importar conexión Google (.json)**, sélectionne ce fichier, puis **Conectar Google** et autorise le compte.
6. De retour dans Amapola, clique **Cargar agendas**. Tous les agendas accessibles sont lus par défaut. Coche ceux à conserver, puis **Guardar selección de agendas**. L'agenda **Amapola**, créé par l'application, reste toujours synchronisé.

Les permissions demandées permettent de lire les agendas accessibles et leurs événements, et de gérer les événements des agendas créés par l'application. Amapola écrit uniquement dans l'agenda Amapola qu'elle a créé. Elle ne modifie pas tes événements personnels.

## Recevoir et envoyer

À l'ouverture, une courte animation accompagne le chargement local et la réception des prochains **30 jours**, aujourd'hui inclus, si Google est connecté et la connexion n'est pas en pause. L'animation dure environ 1,7 seconde lorsque tout est rapide ; si Google prend plus de temps, la progression attend son résultat réel. Hors connexion, les données locales restent accessibles avec un avertissement. Ensuite, les échanges sont manuels : aucune modification n'est envoyée automatiquement et aucun échange périodique ne démarre en arrière-plan.

| Bouton du calendrier | Source prioritaire | Résultat |
| --- | --- | --- |
| **Actualizar desde Google ↓** | Google | Actualise les agendas sélectionnés et les classes déjà liées ; n'écrit rien dans Google. |
| **Enviar a Google ↑** | Amapola | Applique directement les classes locales à l'agenda Google Amapola ; ne reçoit pas les modifications du téléphone. |

Une réception applique le titre, la date, l'horaire et l'état Google aux classes liées, même si la version Google n'a pas changé depuis la dernière réception. Une classe locale jamais envoyée reste présente. Une classe supprimée localement réapparaît si elle existe encore dans Google. Une suppression confirmée par Google annule la classe locale en conservant son paiement et son historique. Une coupure réseau, une liste incomplète ou une erreur de permission ne compte jamais comme une suppression.

Un envoi met à jour les classes existantes, crée les nouvelles et supprime dans Google celles supprimées localement. Une classe locale dont l'événement a été supprimé sur le téléphone est recréée. Le sens choisi s'applique directement, sans confirmation supplémentaire de rapprochement. Les autres agendas Google ne sont jamais modifiés.

L'élève, le tarif, la modalité et le paiement restent gérés dans Amapola. Leur description dans Google est informative. Les identifiants des événements et des propriétés privées permettent de retrouver les classes ; il n'est pas nécessaire de copier ces identifiants à la main.

## Agendas et nouveaux cours

- Dans **Mi información → Sincronización con Google Calendar**, choisis les agendas à recevoir. L'agenda Amapola lié reste inclus. Il est créé lors du premier envoi si nécessaire.
- Dans le calendrier, **Agendas visibles** permet de masquer ou d'afficher chacun des agendas reçus, les cours Amapola et les blocs locaux. Cela ne change pas la sélection des agendas à recevoir. Les événements masqués continuent à compter dans les avertissements de chevauchement.
- Les événements des autres agendas apparaissent comme des blocs **Busy**, gris rayés, avec leur titre et leur agenda d'origine. Ils se modifient dans Google. Les journées entières et les événements sur plusieurs jours occupent les jours correspondants.
- Un événement non associé créé dans l'agenda Google **Amapola**, ou dont la description commence par **Amapola** dans un autre agenda, apparaît **Por completar**. Complète l'élève, le tarif, la modalité et l'horaire. Il devient une classe ponctuelle, sans planification récurrente automatique ni revenu avant son association.
- Crée de préférence les cours directement dans l'agenda Google Amapola. L'association d'un événement d'un autre agenda conserve son original et prépare une classe dans l'agenda Amapola, sans modifier l'agenda personnel. Après l'association, la classe liée dans l'agenda Amapola fait référence ; l'original reste un bloc Busy indépendant.
- Les planifications Amapola sont envoyées sous forme de sessions individuelles sur le mois. La répétition **Cada dos semanas** conserve un intervalle de 14 jours.
- Une classe annulée localement reste visible dans Google avec le préfixe **[Cancelada]** et ne bloque plus le créneau Google. Une classe supprimée localement est supprimée de Google à l'envoi.
- Un horaire Google hors des pas de 15 minutes est conservé et signalé pour correction. Les créations et modifications dans Amapola restent par pas de 15 minutes.

Un événement lié déplacé hors des 30 jours est aligné une fois, puis conservé sans être consulté à chaque passage tant qu'il reste hors période. Sortir de la fenêtre ne signifie jamais une suppression. Aucun historique antérieur ni année entière n'est transféré.

## Progression, connexion et fermeture

Une fenêtre avec une fleur animée bloque l'édition pendant l'échange. Elle reste ouverte jusqu'à la confirmation du résultat. Une erreur n'est pas présentée comme un échange réussi. Chaque bouton conserve l'heure de son dernier succès et garde une indication de réussite en bordure ; un envoi n'est pas présenté comme une réception.

À chaque entrée sur la page Calendrier, Amapola vérifie l'accès à Google sans importer d'événements. Si Google est déconnecté ou inaccessible, une fenêtre indique que les agendas ne sont pas actualisés. Les données locales restent utilisables. Il faut choisir **Actualizar** ou **Enviar** pour reprendre l'échange quand la connexion revient.

**Cerrar aplicación** propose **Enviar y cerrar**, **Cerrar sin enviar** et **Cancelar**. L'envoi doit réussir avant la fermeture ; s'il échoue, Amapola reste ouverte. Fermer ou recharger l'onglet demande la confirmation native du navigateur après une interaction dans la page. Le navigateur impose son texte : ce dialogue ne contient pas les boutons d'envoi Google. Pour envoyer avant de quitter, annule la fermeture puis clique Enviar a Google, ou utilise Cerrar aplicación → Enviar y cerrar. Fermer l'onglet ne déclenche aucun envoi et n'arrête pas le programme local. Après un arrêt volontaire confirmé par le serveur, fermer l'onglet ne redemande pas de confirmation.

Amapola.exe doit être ouvert pour échanger avec Google. Lorsque le PC est éteint, les événements déjà envoyés restent accessibles sur le téléphone. Les changements du téléphone seront récupérés à la prochaine ouverture avec Google connecté, ou à la prochaine réception manuelle.

## Sauvegarde et changement de PC

Les copies **.amapola v7** conservent les liens entre événements et classes, les imports à compléter, les agendas sélectionnés, les préférences d'affichage et tous les paiements, élèves, contacts, planifications et indisponibilités. Amapola 0.7.0 lit également les copies v1 à v6. La migration crée d'abord une copie de sécurité dans l'ancien format.

Les autorisations Google sont stockées séparément dans **google-connection.json**, dans le dossier de données du PC, et chiffrées avec le compte Windows. Elles ne sont pas incluses dans le ZIP, GitHub ou les sauvegardes .amapola.

Sur un autre PC : installer la version compatible, restaurer la copie, importer le **même fichier client Google**, reconnecter le **même compte**, vérifier les agendas puis cliquer **Reanudar sincronización**. La restauration met la connexion en pause. Reprendre ne lance aucun envoi : choisis ensuite explicitement la direction souhaitée. Les liens sauvegardés servent à retrouver les événements existants.

Les trente dernières copies de sécurité précédant des changements de classes par Google sont conservées localement, en plus des sauvegardes automatiques habituelles.

## Documentation Google

- OAuth pour application de bureau : https://developers.google.com/identity/protocols/oauth2/native-app
- Permissions Calendar : https://developers.google.com/workspace/calendar/api/auth
- Identification privée des événements : https://developers.google.com/workspace/calendar/api/guides/extended-properties
