# Amapola 0.9.0 — installation et mise à jour

## Installer sur un autre PC

1. Dans [les releases GitHub](https://github.com/Horizon-8/Amapola/releases/latest), téléchargez **Amapola-0.9.0-Windows.zip**, dans **Assets**. Les fichiers « Source code » sont destinés au développement.
2. Sous Windows 10/11 64 bits, faites **Extraire tout** dans un dossier permanent, par exemple `Documents\Amapola-0.9.0`. Gardez tous les fichiers et sous-dossiers ensemble.
3. Ouvrez **Amapola.exe** depuis le dossier extrait. Le navigateur affiche l'application ; le pied de page indique **v0.9.0**. Node.js est fourni, sans installation séparée.
4. Ouvrez **Crear-acceso-directo.vbs** pour créer ou actualiser le raccourci du bureau avec l'icône de fleur.

Sur un PC où Amapola n'a jamais été utilisée, l'application démarre sans élève, classe, paiement ni connexion Google. Le ZIP ne contient aucune donnée personnelle, sauvegarde ou clé Google. Si le PC a déjà des données Amapola, elles sont conservées : extraire ce ZIP ne les efface pas.

Les données restent dans `%LOCALAPPDATA%\Amapola\datos`, séparément du programme. Les deux ordinateurs ont des données locales indépendantes ; GitHub conserve le programme, pas les classes ni les paiements.

## Mettre à jour une version 0.5.x à 0.9.0 sur le même PC

1. Dans l'ancienne version, ouvrez **Mi información → Copias de seguridad**, choisissez **Descarga / copia local**, enregistrez le réglage et téléchargez une copie `.amapola`. Gardez cette copie et le dossier de l'ancienne application.
2. Utilisez **Cerrar aplicación** avant de changer de version.
3. Extrayez le nouveau ZIP complet dans un nouveau dossier. Ne copiez pas uniquement `Amapola.exe` : le programme utilise aussi `app` et `runtime`.
4. Ouvrez le nouvel **Amapola.exe**. Il retrouve les données du même compte Windows et crée une copie avant la migration. Vérifiez les élèves, planifications et paiements, puis actualisez le raccourci.

Le format actuel des données et sauvegardes est **v8**, avec lecture des copies v1 à v7. Les migrations depuis les anciens schémas v5 et v7 ont été vérifiées avec conservation des données. Une ancienne version ne peut pas ouvrir une base migrée en v8. Pour revenir en arrière, utilisez une copie créée avant la mise à jour avec la version qui la lisait.

## Transférer les données sur l'autre PC

1. Téléchargez une copie `.amapola` depuis le PC d'origine et transférez-la en plus du ZIP du programme.
2. Sur l'autre PC, ouvrez **Mi información → Copias de seguridad → Restaurar una copia**.
3. Choisissez la copie, vérifiez son récapitulatif et saisissez **RESTAURAR**. La restauration remplace les données du PC de destination, après une copie de sécurité préalable.
4. Vérifiez la devise, le fuseau horaire et le chemin de sauvegarde, qui peut différer entre les deux PC.

Les copies comprennent les élèves et prospects, leurs notes et liens de contact, tarifs habituels, planifications et répétitions toutes les deux semaines, historique et exceptions, annulations, états et méthodes de paiement, indisponibilités et réglages métier. Les liens de synchronisation Google sont conservés. Les messages WhatsApp/Messenger/Instagram ne sont pas importés ; seules les notes et coordonnées saisies dans Amapola sont sauvegardées.

## Google Calendar

La connexion est facultative : Amapola fonctionne localement sans Internet. Sur le même PC, la mise à jour conserve normalement la connexion existante. Les identifiants OAuth et jetons Google sont protégés séparément et ne sont inclus ni dans le ZIP ni dans les copies `.amapola`.

Sur un nouveau PC, suivez **GOOGLE-CALENDAR.md** pour reconfigurer la connexion dans **Mi información → Google Calendar**, retrouver l'agenda Amapola existant et choisir les agendas reçus. Après une restauration, contrôlez la connexion et les agendas avant de relancer les échanges ; la synchronisation est mise en pause pour cette vérification.

À l'ouverture, Amapola reçoit les changements Google des 30 prochains jours si la connexion est active. **Actualizar desde Google** reçoit ; **Enviar a Google** envoie uniquement les cours Amapola vers l'agenda Amapola. L'envoi reste manuel. Google Calendar ne remplace pas une sauvegarde des données Amapola, notamment des paiements et planifications.

## Fermer et rouvrir

Utilisez **Cerrar aplicación** pour arrêter le programme ; vous pouvez envoyer à Google avant de fermer. Fermer uniquement l'onglet laisse le programme local en arrière-plan. Après une interaction, le navigateur affiche son avertissement natif de fermeture ; son texte dépend du navigateur.

Le programme nécessite Windows 10/11 64 bits, un navigateur récent et .NET Framework 4.8, habituellement présent sous Windows. En cas de problème de lancement, vérifiez que tout le ZIP a été extrait ; le journal local est `%LOCALAPPDATA%\Amapola\datos\amapola.log`.

Guide des sauvegardes en espagnol : **GUIA-COPIAS.md**.
