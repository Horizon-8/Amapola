# Revue d'Amapola — 30 octobre 2026

Décisions prises après cette revue : le découpage en modules est réalisé. Les tests dans un vrai navigateur et le suivi persistant des changements non envoyés ne sont pas retenus. L'optimisation de l'historique est reportée. Le journal Google reste une proposition, sans création de fichier de journal ni nouvelle table. Les recommandations ci-dessous constituent le constat initial.

Cette revue porte sur le code local et les fonctions existantes. Les propositions ci-dessous ne sont pas implémentées. Les changements demandés pour cette version concernent uniquement la présentation du calendrier et l'ouverture animée avec réception Google.

## Mon avis

La structure est adaptée à une application locale utilisée par une personne : Node intégré, SQLite et interface dans le navigateur. Il n'y a pas de raison de remplacer cet ensemble par un serveur distant ou un gros framework. Les prochaines améliorations devraient surtout rendre les échanges Google plus compréhensibles, limiter les erreurs de manipulation et rendre l'interface plus facile à vérifier.

## Ce qui est déjà solide

- Les sessions conservent leurs paiements et leur tarif lors des déplacements, annulations et modifications de série. Les montants sont stockés en centimes.
- Les changements de séries et les restaurations utilisent des transactions SQLite. Les simulations de chevauchement appliquent les mêmes règles puis annulent leurs écritures.
- Les migrations créent une copie préalable ; les archives incluent les données métier et les liens Google. La restauration met Google en pause.
- Google ne reçoit des écritures que dans l'agenda Amapola. Les événements externes sont des blocs séparés. Une lecture incomplète n'est pas traitée comme une suppression.
- Les autorisations Google sont séparées des copies et protégées par Windows. Le serveur écoute localement et contrôle les requêtes de modification.
- Les tests couvrent les règles métier, les migrations, les sauvegardes, les échanges Google simulés, les protections HTTP et plusieurs comportements d'interface.

## Améliorations techniques à prioriser

| Priorité | Constat dans le code | Proposition et bénéfice | Effort indicatif |
| --- | --- | --- | --- |
| Haute | Le marqueur des changements Google à envoyer est une variable en mémoire : `GoogleSync.dirty`, modifiée par `touch()`. Les cours et liens sont persistés, mais ce marqueur est réinitialisé au démarrage. | Recalculer ou conserver durablement les changements non envoyés. Le statut resterait fiable après une fermeture hors connexion. Ce constat ne signifie pas que les cours locaux sont perdus. | Moyen |
| Haute | Les tests d'interface exécutent surtout des fonctions dans un DOM simulé. Le récent défaut de sélecteur a échappé aux tests existants. | Ajouter un petit parcours automatisé dans un vrai navigateur : ouvrir, naviguer, déplacer, enregistrer un paiement, filtrer, restaurer dans une base de test. Garder les tests métier actuels. | Moyen |
| Haute | Les liens Google et les dates de succès sont persistés, mais pas un journal détaillé des opérations utilisateur. Un envoi peut réussir pour plusieurs événements puis échouer sur le suivant. | Journal durable indiquant direction, créations, déplacements, annulations, suppressions et erreurs, avec bilan après l'échange. Une interruption deviendrait explicable sans lire les fichiers techniques. | Moyen |
| Moyenne | L'interface et ses actions principales sont regroupées dans `app/public/app.js`, environ 100 Ko. Le CSS contient des règles successives qui se remplacent. | Extraire progressivement calendrier, élèves, paiements, paramètres et connexion Google ; regrouper les styles par composant. Cela réduirait les risques de régression sans changer l'interface ni réécrire l'application. | Moyen |
| Moyenne | `freezePast()` rescane l'historique des planifications ; `occurrences()` et `classLedger()` chargent des ensembles complets avant filtrage. Les rapports répètent certains calculs. Les index existants ne sont donc pas toujours utilisés. | Mesurer sur plusieurs années fictives, filtrer davantage en SQL et éviter les matérialisations répétées. Aucun ralentissement réel n'a été mesuré pendant cette revue : c'est un potentiel de croissance à vérifier. | Moyen |
| Moyenne | `send()` réécrit les événements concernés pour garantir la priorité explicite d'Amapola. Une réponse 429/erreur réseau arrête l'échange ; il n'y a pas de reprise automatique avec attente progressive. Le cache des événements Google s'accumule au-delà de la période affichée. | Ajouter une reprise bornée pour les erreurs temporaires, un bilan des opérations déjà confirmées et une politique de conservation du cache. Préserver la règle « Envoyer impose Amapola », y compris si Google a changé seul. | Moyen à élevé |
| Moyenne | Les sauvegardes automatiques sont locales. L'écriture dans un dossier synchronisé ou l'envoi kDrive passe par l'action d'exportation. | Afficher distinctement la dernière copie locale et la dernière copie externe confirmée ; proposer ensuite, si souhaité, une copie externe automatique. Google Calendar ne remplace pas la sauvegarde des paiements et des contacts. | Faible à moyen |

## Fonctions qui apporteraient le plus au quotidien

1. **Annuler le dernier déplacement ou redimensionnement.** Une action « Annuler » après l'enregistrement éviterait de rouvrir une classe déplacée par erreur. Il faudrait définir sa relation avec un événement déjà envoyé à Google.
2. **Date de prochaine relance pour un contact en conversation.** Une liste « À recontacter aujourd'hui » rendrait le suivi plus utile que la seule catégorie de prospects. Aucun message ne serait envoyé automatiquement.
3. **Vacances et pauses sur une période.** Suspendre certaines occurrences sans casser la planification ni toucher aux paiements existants. Les blocs Occupada actuels préviennent un chevauchement mais ne suspendent pas une série.
4. **Paiements partiels et forfaits de plusieurs cours**, seulement si cela correspond à l'activité réelle. Le modèle actuel payé/non payé est simple ; un forfait demanderait un registre de crédits et une règle d'affectation aux sessions.
5. **Export CSV des classes et paiements.** Complément lisible dans Excel pour les bilans ; le fichier .amapola resterait le format complet de restauration.

## Ordre conseillé

Je commencerais par les tests dans le navigateur et l'état durable des changements non envoyés, puis le journal des échanges. Pour une amélioration immédiatement visible au quotidien, je choisirais ensuite « Annuler » et la prochaine date de relance des prospects. Les forfaits peuvent attendre un besoin concret.

## Limites de cette revue

Il s'agit d'une lecture de code et de tests locaux, sans validation d'un compte Google réel ni mesure de charge sur un historique de production. La tentative de contrôle dans un navigateur isolé n'a pas abouti dans cet environnement ; elle ne constitue donc pas une validation visuelle. Les coûts ci-dessus sont relatifs, pas des engagements de délai.
