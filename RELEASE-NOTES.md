# Amapola 0.9.0

Version portable Windows 10/11 64 bits : téléchargez **Amapola-0.9.0-Windows.zip**, faites **Extraire tout**, puis ouvrez **Amapola.exe**. Aucun moteur à installer séparément. Le ZIP ne contient ni données personnelles ni connexion Google.

Depuis la précédente release 0.5.1 :

- Connexion Google Calendar avec réception des agendas choisis et envoi des cours vers l'agenda Amapola. Échanges distincts sur les 30 prochains jours, réception à l'ouverture, statut et animation pendant l'opération.
- Calendrier plus compact : choix des agendas visibles dans un menu, boutons Google colorés, repère de l'heure actuelle et événements externes hachurés.
- Répétition des cours toutes les deux semaines, en plus des séances ponctuelles et hebdomadaires.
- Tarif habituel par élève, proposé à la création d'une classe ou planification et modifiable pour chaque séance. Avertissement visible quand le montant est zéro.
- Titres Google « Clase con Ana », avec le préfixe « [Cancelada] » pour les annulations. Les noms complets restent dans la description.
- Avertissement natif à la fermeture de l'onglet après interaction ; **Cerrar aplicación** propose d'envoyer avant d'arrêter le programme.
- Interface répartie en modules et correction du blocage d'ouverture sans connexion Google.

**Mise à jour :** téléchargez une sauvegarde `.amapola`, fermez l'ancienne application et extrayez le nouveau ZIP complet dans un nouveau dossier. Sur le même PC et le même compte Windows, les données existantes sont reprises automatiquement. Le format actuel est v8 ; les copies v1 à v7 restent lisibles. Une ancienne application ne peut pas lire la base déjà migrée.

**Autre PC :** vous pouvez démarrer sans données ou restaurer une copie `.amapola`. La connexion Google se configure séparément sur ce PC. Voir **INSTALLATION-FR.md** et **GOOGLE-CALENDAR.md**.

**Validation :** 105 tests automatisés réussis, dont les migrations, sauvegardes/restaurations, tarifs et échanges Google simulés. Vérification du ZIP et d'une ouverture locale sans données, sans test dans un navigateur réel.
