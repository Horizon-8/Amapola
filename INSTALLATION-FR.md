# Amapola 0.4.1 — installation sur un autre PC

## Démarrer avec zéro donnée

1. Copiez `Amapola-0.4.1-Windows.zip` sur l'autre PC Windows 10/11 64 bits.
2. Faites **Extraire tout** dans un dossier permanent, par exemple `Documents\Amapola`. Conservez toutes les sous-dossiers avec `Amapola.exe`.
3. Ouvrez **Amapola.exe**. Le navigateur affiche l'application ; le pied de page doit indiquer **v0.4.1**.
4. Au premier lancement sur un PC sans données Amapola, les élèves, contacts potentiels, planifications, classes, paiements et blocs d'indisponibilité sont vides. Aucun compte de démonstration n'est créé.
5. Facultatif : lancez `Crear-acceso-directo.vbs` pour créer un raccourci sur le bureau.

Ce ZIP contient le programme, son moteur d'exécution, ses sources, ses tests et les guides. Il ne contient aucune base de données, sauvegarde, donnée personnelle ni fichier de test généré. Node.js n'a pas besoin d'être installé séparément.

Les données créées sur chaque PC restent séparées du programme, dans `%LOCALAPPDATA%\Amapola\datos`. Si Amapola a déjà été utilisé sur le PC, réinstaller le programme conserve ces données existantes. Le ZIP ne réinitialise pas une base déjà présente et ne modifie pas les données de l'ancien PC.

## Tout sauvegarder

Dans **Mi información → Copias de seguridad**, choisissez **Descarga / copia local** comme destination, enregistrez le réglage, puis créez et téléchargez une sauvegarde `.amapola`.

Elle contient :

- tous les élèves et contacts, les états Actif / Inactif / En conversation, leurs couleurs et canaux préférés ;
- les téléphones, adresses email, liens Messenger/Instagram enregistrés et notes de suivi ;
- les planifications hebdomadaires ou ponctuelles, dates, horaires, durées, tarifs et modalités ;
- l'historique des classes, annulations, déplacements et modifications individuelles ;
- les états et méthodes de paiement par séance, y compris les paiements anticipés ;
- les blocs **Ocupada**, avec leurs dates, horaires et notes ;
- les informations de l'activité, la devise, le fuseau horaire et les réglages de sauvegarde.

Les prochaines séances récurrentes sont régénérées à partir des planifications ; leurs exceptions et paiements enregistrés sont conservés. Les messages des applications externes (WhatsApp, Messenger, Instagram) ne sont pas importés : la sauvegarde contient le suivi, les notes et les liens saisis dans Amapola. Le choix clair/sombre est une préférence du navigateur propre à chaque PC.

## Restaurer plus tard sur l'autre PC

1. Transférez le fichier `.amapola` en plus du ZIP du programme.
2. Ouvrez Amapola, puis **Mi información → Copias de seguridad → Restaurar una copia**.
3. Sélectionnez le fichier, vérifiez le récapitulatif et saisissez **RESTAURAR**.
4. La restauration remplace les données de ce PC par celles de la sauvegarde. Amapola crée d'abord une copie de sécurité des données remplacées.
5. Si vous utilisez un dossier de sauvegarde synchronisé, vérifiez son chemin sur le nouveau PC : il peut être différent.

Les sauvegardes créées par les anciennes versions v1, v2 et v3 restent lisibles. Le format actuel est v4. La restauration complète sur une base vide a été testée avec les contacts potentiels, tous les moyens de paiement, les exceptions de calendrier et les réglages.

Pour quitter, utilisez **Cerrar aplicación**. Fermer seulement l'onglet laisse l'application en arrière-plan.
