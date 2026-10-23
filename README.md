# Amapola

## Versión 0.5.1 — icono de Windows e indicadores legibles

El ejecutable incorpora la flor con una A. El icono de Windows incluye tamaños de 16 a 256 píxeles. Para crear o actualizar el acceso directo del escritorio, ejecuta **Crear-acceso-directo.vbs** después de extraer toda la aplicación; utiliza el icono `windows/Amapola.ico`.

El estado de clase y el pago utilizan iconos SVG. En las clases canceladas se tachan el nombre y el horario, mientras que los indicadores siguen legibles. La cruz de cancelación es más grande y gruesa. Las acciones y los pagos conservan su funcionamiento.

El paquete portable actual es **Amapola-0.5.1-Windows.zip**, sin datos personales ni bases de datos. Se conserva el formato de copia v5.

## Versión 0.5.0 — lista para pruebas

Abre **Amapola.exe del proyecto** y comprueba **v0.5.0** al pie. Todavía no se ha generado un ZIP 0.5.0.

- Botón de estado junto al pago en el calendario y en la lista: **? Por confirmar → ✓ Confirmada (verde) → × Cancelada → ? Por confirmar**. Cada clic cambia solo esa sesión. El pago es independiente. Al reactivar una clase cancelada se avisa si coincide con otras actividades.
- El estado **Realizada** sigue disponible en los detalles de la clase para conservar el seguimiento histórico.
- Borrado individual desde los detalles de una clase o desde la lista. Pide confirmación, crea antes una copia local y conserva las demás sesiones de la planificación. Una sesión borrada no se vuelve a generar al editar la serie ni al restaurar la copia actual. Al borrar una clase pagada se advierte que su pago dejará de aparecer en los totales.
- Base de datos y copias **v5**, con migración automática y copia de seguridad previa. La versión nueva restaura copias v1–v4. Los estados y las sesiones borradas se conservan al trasladar los datos.
- **GUIA-COPIAS.md** explica cómo descargar una copia, recuperar un borrado o pasar los datos a otro PC. También hay instrucciones dentro de Mi información. **GITHUB.md** explica cómo conservar el código y publicar sus versiones; GitHub y las copias de datos cumplen funciones distintas.

## Paquet Windows 0.4.1 — prêt pour un autre PC

Le ZIP **Amapola-0.4.1-Windows.zip** contient la version actuelle, sans base de données ni sauvegarde embarquée. Extraire l'ensemble puis ouvrir **Amapola.exe**. Au premier lancement sur un PC sans données Amapola, toutes les listes sont vides. Les données de ce PC restent dans `%LOCALAPPDATA%\Amapola\datos` ; réinstaller ne supprime pas une base existante.

Voir **INSTALLATION-FR.md** pour l'installation et le transfert ultérieur d'une sauvegarde complète. Le format `.amapola` v4 contient élèves et contacts potentiels, statuts, coordonnées, liens et notes, planifications, historique et exceptions, états et méthodes de paiement, blocs Ocupada et réglages. Les messages des applications de chat ne sont pas importés. La préférence visuelle clair/sombre reste propre au navigateur. La restauration sur une base vide est couverte par `tests/backup-transfer.test.mjs`.

## Versión 0.4.1 — calendario compacto y colores

Abrir **Amapola.exe** después de extraer todo el ZIP y comprobar **v0.4.1** al pie de página.

- Cada cuarto de hora ocupa 12 píxeles en lugar de 30: caben 2,5 veces más horas en la misma altura. La cuadrícula mantiene sus líneas alineadas, los pasos de 15 minutos y el acceso a las 24 horas mediante desplazamiento.
- Las clases de 15, 30 y 45 minutos muestran hora, nombre del alumno, modalidad y pago en una misma línea. Los nombres largos se abrevian con puntos y el texto completo queda en la descripción al pasar el cursor y al abrir la clase.
- Estados destacados: activo verde, inactivo rojo y en conversación violeta. Canales: WhatsApp verde, Messenger azul, Instagram naranja, correo violeta y teléfono turquesa. Adaptados al modo oscuro.
- Instagram se puede seleccionar como canal preferido y filtrar en la lista. Los enlaces de Instagram guardados en las notas muestran un acceso identificado con su icono.

## Versión 0.4 — lista para pruebas

Abre **Amapola.exe en este directorio**. El pie de página muestra **v0.4.0**. No se ha generado un ZIP nuevo y Google Calendar queda pendiente.

- **Alumnos → En conversación**: contactos potenciales separados de los activos e inactivos, con búsqueda y filtro de canal. En la ficha se puede cambiar el estado a Activo conservando notas y contactos. Los contactos en conversación no generan recurrencias activas.
- Accesos a WhatsApp (teléfono con + y código de país), correo, teléfono y Messenger (enlace completo). Los enlaces http/https de las notas son pulsables. Abrirlos no envía ningún mensaje.
- Avisos al crear o editar clases, planificaciones y bloques Ocupada, también después de arrastrar o ajustar bordes. Se comprueban todas las repeticiones dentro del intervalo de fechas admitido por la aplicación (hasta 2100), se conservan las excepciones y se excluyen las sesiones canceladas. El aviso incluye actividad, alumno, fecha y horario; los horarios contiguos no cuentan como solapados.
- Guardar una coincidencia requiere marcar la confirmación del aviso. Los avisos se actualizan al modificar el formulario y se vuelven a comprobar antes de guardar. Las consultas no guardan cambios en el calendario.
- Archivo de copias y base de datos **v4**, con seguimiento de contactos incluido. La migración crea antes una copia que incluye los bloqueos de disponibilidad. Se pueden restaurar las copias v1, v2 y v3.

## Versión 0.3.0 — calendario y disponibilidad

Abrir **Amapola.exe del proyecto** para reiniciar automáticamente cualquier proceso anterior y cargar esta versión. No se ha generado un ZIP nuevo.

- Cuadrícula continua de 96 cuartos de hora, alineada en los siete días y con posiciones enteras para mejorar la nitidez.
- Modalidades más visibles: ordenador azul, casa violeta y coche naranja. Selector Semana/Agenda con selección rosada e indicadores accesibles.
- Botón **Ocupada**, o selección de un espacio vacío → **Ocupada**. Los bloqueos son puntuales, de color gris claro, editables y eliminables. Admiten arrastre y ajuste de ambos bordes, en pasos de 15 minutos. Se muestran en Semana y Agenda.
- Los bloqueos son recordatorios de indisponibilidad: no generan clases, pagos ni ingresos, y no impiden por sí solos programar una clase en ese horario.
- Copias de seguridad v3 con bloqueos incluidos. Las versiones anteriores v1/v2 siguen siendo restaurables. Al abrir una base v2 se crea primero una copia de seguridad antes de migrarla.

## Version 0.2 — tests dans le projet

Cette version est modifiée directement dans ce dossier. Aucun nouveau ZIP n’a été généré. Fermer l’instance ouverte avec **Cerrar aplicación**, puis ouvrir **Amapola.exe dans le dossier du projet** pour charger les nouveaux écrans et routes. Le pied de page affiche v0.2. Le ZIP 0.1 précédemment distribué reste une ancienne version.

- **Clases** : historique global et séances futures, filtres par dates, élève, état de classe, état et méthode de paiement ; totaux sur toute la sélection et pagination. L’historique n’est pas limité à un an. Les récurrences futures sont affichées jusqu’à un an à l’avance.
- **Calendario** : création par clic dans un espace vide (60 minutes par défaut) ou sélection par glissement ; déplacement d’un bloc ; modification du début ou de la fin par ses poignées. Toutes les nouvelles heures et durées sont des multiples de 15 minutes. Un formulaire reste disponible au clavier.
- Après un changement de séance : choix **Solo esta sesión** ou **Esta y las siguientes de la planificación**. Le second choix est réservé aux séries hebdomadaires et aux séances qui n’ont pas commencé. Le passé est conservé ; les exceptions restent individuelles. Les paiements anticipés suivent leur occurrence sans être dupliqués. Annuler le dialogue laisse le calendrier inchangé.
- Paiement par séance : payée/non payée et méthode (espèces, virement, carte, Nequi, DaviPlata, PayPal, autre). La pastille **$** ouvre son formulaire, aussi pour une séance future. Vert = payé, rouge = séance terminée et impayée, blanc = en attente ou sans encaissement requis. Les annulations impayées et les séances gratuites ne génèrent pas de dette.
- Le tarif par séance ne change pas automatiquement lorsqu’on ajuste sa durée.
- Migration SQLite v1 → v2 automatique, avec archive de sécurité avant modification. Les anciennes archives restent restaurables. Les horaires historiques antérieurs hors des quarts d’heure ne sont pas déplacés automatiquement.

Pour compiler seulement le lanceur, sans créer de ZIP : `windows\build.ps1 -LauncherOnly`.

Application Windows locale de gestion des élèves et des cours. Interface en espagnol, tons rosés, modes clair, sombre et système. Fonctionne hors ligne, dans le navigateur, avec SQLite sur le PC.

## Utilisation sur Windows

1. Extraire **tout** `Amapola-0.4.1-Windows.zip` dans un dossier permanent, par exemple `Documents\Amapola`.
2. Double-cliquer sur **Amapola.exe**. Le navigateur s’ouvre sur `http://127.0.0.1:3847` (ou un autre port si celui-ci est occupé).
3. Facultatif : lancer `Crear-acceso-directo.vbs` pour créer le raccourci sur le bureau. On peut aussi créer ce raccourci avec le menu Windows.
4. Quitter avec **Cerrar aplicación** dans le menu de l’application. Fermer seulement l’onglet laisse le serveur local actif.

Windows 10/11 64 bits, navigateur récent et .NET Framework 4.8 (habituellement fourni avec Windows). Le moteur Node.js 24.19.0 est inclus. Aucune installation de Node, Git, Docker ou PostgreSQL n’est nécessaire. Le programme n’est pas signé numériquement ; ne pas contourner un blocage de sécurité de l’ordinateur.

## Fonctionnalités

- Alumnos : liste, recherche, filtres, création, modification et suppression ; téléphone, email, canal WhatsApp/Messenger/autre, notes, couleur personnalisée, actif/inactif.
- Fiche élève : coordonnées et onglets **Planificación** et **Clases pasadas**.
- Planification hebdomadaire ou séance unique : jour, heure, durée, tarif par séance, dates de début/fin. Répétition hebdomadaire et distanciel sélectionnés par défaut.
- Trois modalités : **En línea** (ordinateur), **Presencial** (maison), **A domicilio** (voiture).
- Calendrier par semaine et vue Agenda, couleurs des élèves et navigation entre semaines ; séances simultanées affichées côte à côte.
- Modification d’une séance : déplacement, tarif, modalité, notes, réalisée ou annulée. Une exception ne modifie pas la série.
- Modification des horaires avec une date d’effet : les séances passées et les exceptions sont conservées ; l’ancien horaire est conservé jusqu’à cette date.
- Informes : estimation de la semaine sélectionnée et de la suivante, détail par élève, heures et nombre de cours. Les annulations sont exclues. Les estimations ne suivent pas les encaissements.
- Mi información : coordonnées, nom de l’activité, devise, fuseau horaire, apparence et sauvegardes. COP et America/Bogota par défaut. Changer la devise ne convertit pas les montants.

## Données et sauvegardes

Les données sont séparées du programme dans **`%LOCALAPPDATA%\Amapola\datos`**. Une première ouverture crée une base vide. Les préférences d’apparence seules sont conservées dans le navigateur.

Les fichiers `.amapola` contiennent élèves, planifications, séances et paramètres. Ce sont des archives JSON compressées, validées avant restauration. Les copies automatiques sont créées après les modifications et à la fermeture. Conservation : les 30 plus récentes plus une copie par jour sur 30 jours distincts. Les copies manuelles et celles précédant une suppression/restauration sont conservées.

Dans **Mi información → Copias de seguridad** :

- **Descarga / copia local** : exporter une archive à conserver sur un autre support.
- **Carpeta sincronizada de kDrive** : indiquer un dossier local existant ; l’application y copie l’archive. Vérifier ensuite la synchronisation dans kDrive.
- **Envío directo a kDrive (API)** : identifiant du drive, dossier de l’espace privé et jeton API avec droit d’écriture. Le jeton est utilisé seulement pour l’envoi en cours et n’est pas conservé. Une connexion Internet est nécessaire.
- **Restaurar una copia** : sélectionner l’archive, vérifier le résumé puis saisir `RESTAURAR`. Une copie des données actuelles est créée avant remplacement.

Les archives ne sont pas chiffrées. Conserver les sauvegardes dans un emplacement privé. Supprimer un élève supprime aussi ses horaires et son historique ; une copie est créée auparavant. Désactiver l’élève permet de conserver son historique.

Pour changer d’ordinateur : exporter une archive, copier l’application sur le nouveau PC, la démarrer et restaurer l’archive. Pour mettre à jour : exporter une copie, fermer Amapola, remplacer les fichiers du programme puis relancer. Ne pas remplacer le dossier de données.

## Développement et paquet Windows

Sans dépendance npm externe. Node.js **24.13.0 à 24.x** est requis (`node:sqlite`).

```powershell
.\runtime\node.exe --test
.\runtime\node.exe --check app/public/app.js
.\runtime\node.exe app/server.mjs --open
```

Les tests HTTP utilisent un port temporaire sur l’interface locale. Un environnement qui interdit les connexions locales empêche ces tests de s’exécuter ; cela doit être distingué d’une validation complète sur le PC de destination.

Pour reconstruire le ZIP : placer l’exécutable officiel Node.js Windows x64 et son fichier LICENSE complet dans `runtime`, puis exécuter `windows\build.ps1`. Ce script compile le lanceur avec le compilateur .NET Framework de Windows et assemble uniquement les fichiers distribuables. Le code source et les tests sont inclus ; aucune donnée de développement n’est distribuée.

Variables facultatives : `AMAPOLA_DATA_DIR` (autre dossier de données), `AMAPOLA_PORT` (port préféré). Le serveur écoute exclusivement sur `127.0.0.1`. Chaque lancement réutilise l’instance ouverte pour le même dossier de données.

## Limites de cette version

Une utilisatrice sur un PC ; suivi manuel des paiements par séance, sans encaissement en ligne ni facturation. Pas d’espace élève en ligne ni de synchronisation entre ordinateurs. Les sauvegardes kDrive sont déclenchées manuellement ; les sauvegardes automatiques sont locales. L’envoi API est couvert par des tests simulés et reste à vérifier avec le compte kDrive réel. Un installateur Windows signé n’est pas inclus : il s’agit d’un paquet portable avec lanceur `.exe`.

Node.js et ses composants : voir `runtime/NODE-LICENSE.txt`.
