# Pruebas de la versión 0.5.1 — iconos

1. Extraer todo el ZIP 0.5.1, comprobar el icono de flor con A en Amapola.exe y ejecutar Crear-acceso-directo.vbs para actualizar el acceso directo del escritorio.
2. Cancelar una clase en Semana: el nombre y la hora quedan tachados; la cruz de estado y el icono de pago siguen claros y sin línea encima. Probar también las clases de 15 y 30 minutos y el modo oscuro.
3. Pulsar el estado y el pago: sus acciones se conservan, los botones se pueden activar con teclado y las etiquetas explican el estado actual y el siguiente.

## Pruebas anteriores: estados y borrado individual (0.5.0)

Abre **Amapola.exe del proyecto** y comprueba **v0.5.0** al pie. El ZIP 0.4.1 sigue siendo la distribución anterior.

1. En Semana y Agenda, pulsa el botón de estado situado junto al pago: debe pasar de ? Por confirmar a ✓ Confirmada, después × Cancelada y otra vez ? Por confirmar. Comprueba que las demás clases de la serie mantienen su estado y que el pago no cambia.
2. Pulsa el botón de pago después de confirmar una clase. Registra el método y comprueba que queda pagada y confirmada. Cancela y vuelve a confirmar: el pago debe conservarse.
3. En los detalles, cambia directamente el estado y comprueba que sigue existiendo Realizada. Filtra las clases por Confirmada en la lista global.
4. Cancela una sesión, crea otra clase o un bloque Ocupada en ese horario y reactiva la primera: debe avisar del solapamiento antes de ocuparlo.
5. Abre una clase y pulsa Eliminar esta sesión, o usa la papelera de su fila en Clases. Cancela la confirmación una vez: no se debe borrar. Después confirma: desaparece solo esa sesión y las siguientes se conservan. Comprueba una clase futura, una pasada y una pagada.
6. Mueve o cambia la planificación después de borrar una sesión. No debe reaparecer. Cierra y abre Amapola; descarga y restaura una copia actual: seguirá eliminada.
7. Para recuperar el borrado, descarga la copia Antes de un cambio creada antes de eliminar y restáurala. Deben recuperarse clase, estado y pago anteriores. La restauración afecta a todos los datos, no solo a esa clase.
8. En Mi información revisa las instrucciones de copia. No hace falta cambiar fechas para descargar una copia. Prueba la restauración en otra instalación con versión 0.5.0 o compatible.

## Pruebas anteriores: colores y calendario compacto (0.4.1)

Abrir **Amapola.exe del proyecto**. El pie de página debe mostrar **v0.4.1**.

1. En Alumnos y en una ficha, comprobar los estados verde (Activo), rojo (Inactivo) y violeta (En conversación), también en modo oscuro.
2. Cambiar el canal preferido entre WhatsApp, Messenger e Instagram: deben mostrarse verde, azul y naranja. Filtrar por Instagram, cerrar y volver a abrir para comprobar que se conserva. Pegar un enlace de Instagram en las notas y comprobar su acceso directo.
3. Abrir Calendario en Semana: la misma altura debe mostrar 2,5 veces más horas. Las 96 divisiones siguen alineadas, cada una con pasos de 15 minutos. Se puede desplazar hasta cualquier hora del día.
4. Crear clases de 15, 30, 45 y 60 minutos. Las cortas deben mostrar el nombre entre hora y pago, además de su modalidad. Los nombres largos usan puntos; pasar el cursor o abrir la clase debe mostrar toda la información.
5. Mover y ajustar ambos bordes de clases cortas; comprobar los pasos de 15 minutos, el botón de pago y que Cancelar no guarde. Probar clases contiguas y varias que se solapan. Revisar también los bloques Ocupada.

## Contactos y solapamientos (desde 0.4)

Continúan disponibles los filtros y los avisos de la versión 0.4. Todavía no se ha creado un nuevo ZIP.

1. En **Alumnos → Nuevo alumno**, elige **En conversación**, guarda el teléfono con prefijo internacional (+57, +33…), correo, un enlace completo de Messenger y enlaces en las notas. Comprueba el filtro **En conversación**, la búsqueda y el filtro de canal. Los contactos inactivos deben aparecer en su filtro separado.
2. Abre WhatsApp, Email, Messenger y un enlace de las notas desde la ficha o la lista. Solo se abre el chat o el programa de correo; el envío queda en tus manos. El botón de WhatsApp necesita el número con + y código de país. Messenger necesita un enlace completo con https://.
3. Abre un contacto potencial y pulsa **Activar como alumno**: cambia su estado a **Activo**. Debe conservar los datos y desaparecer del filtro En conversación. Ya puedes planificar clases para él.
4. Crea una clase y luego intenta crear otra que la solape: el aviso debe mostrar alumno, título, fecha y horario. Pon un horario contiguo (justo al terminar la otra) y comprueba que no avisa.
5. Crea un bloque **Ocupada** y programa una clase en ese horario; haz también la prueba inversa. El aviso debe identificar la actividad ocupada.
6. Prueba arrastrar y alargar una clase sobre otra. Compara **Solo esta sesión** y **Esta y las siguientes de la planificación**: también deben aparecer coincidencias de semanas posteriores. Una sesión cancelada no debe provocar avisos; una sesión movida individualmente solo ocupa su nuevo horario.
7. Para guardar un solapamiento intencionado, marca **Quiero guardar aunque haya solapamientos**. Si cambias los datos, debes confirmarlo de nuevo. Cerrar o cancelar el formulario no guarda nada.
8. Reinicia Amapola y comprueba que se conservan estados y contactos. Las copias .amapola incluyen el seguimiento y los bloqueos; las copias anteriores siguen siendo restaurables.

## Pruebas anteriores: calendario y disponibilidad

### Pruebas de usuario — Amapola 0.3.0

Volver a ejecutar **Amapola.exe de esta carpeta**. El pie de página debe mostrar **v0.3.0**. No hay un ZIP nuevo para esta versión.

1. Revisar los siete días: todas las líneas deben coincidir a las :00, :15, :30 y :45, también al desplazar el calendario.
2. Crear clases en las tres modalidades y comprobar los iconos azul, violeta y naranja en calendario, agenda y listas. Probar también el modo oscuro.
3. Cambiar entre Semana y Agenda: el botón seleccionado debe quedar rosado y distinguirse claramente.
4. Pulsar **Ocupada**, elegir título, fecha y horario y guardar. El bloque debe aparecer gris claro. Crear otro seleccionando un espacio vacío del calendario y eligiendo **Ocupada**.
5. Arrastrar un bloqueo a otro día u hora; revisar el formulario y guardar. Ajustar sus bordes superior e inferior. Cancelar debe conservar el horario anterior.
6. Abrir Agenda y comprobar que los bloqueos no tienen alumno, tarifa ni botón de pago. Los resúmenes de ingresos y el número de clases deben mantenerse al crear bloqueos.
7. Cerrar y relanzar, exportar/restaurar una copia de prueba y comprobar que los bloqueos se conservan. Eliminar un bloqueo y comprobar la copia de seguridad previa.

Los bloqueos son puntuales. Los avisos de solapamiento se incluyen desde la versión 0.4; la repetición semanal de bloqueos sigue pendiente.

## Pruebas de versiones anteriores

Ouvrir l’exécutable du **dossier du projet**, après avoir fermé l’ancienne instance. Le pied de page doit afficher **v0.2**. Aucun nouveau ZIP n’est généré pour cette phase de tests.

## Nouveautés à tester en priorité

- **Clases** dans le menu : historique global, onglets passé/futur/tout, filtres par élève, dates, état de classe, paiement et méthode. Vérifier le total des montants et la pagination si plus de 50 séances sont présentes.
- **Création au calendrier** : un clic dans une case vide doit préremplir le jour et une heure au quart d’heure. Un clic-glissement vers le bas ou le haut doit préremplir la durée ; tester une séance unique puis une répétition hebdomadaire.
- **Déplacement** : glisser une classe vers une autre heure ou un autre jour. Annuler le dialogue doit laisser les données intactes. Refaire en choisissant « Solo esta sesión » et vérifier les semaines suivantes.
- **Durée** : étirer puis raccourcir par les poignées du haut et du bas. Vérifier l’heure de début, de fin et les pas de 15 minutes. Le tarif doit rester le même.
- **Planification** : déplacer une séance future et choisir « Esta y las siguientes ». Vérifier que les anciennes semaines restent inchangées, que les prochaines suivent le nouveau créneau et qu’aucune séance n’est en double.
- **Paiements** : ouvrir la pastille $, enregistrer un paiement et son moyen, vérifier le vert sur le calendrier et dans Clases. Enregistrer aussi un paiement anticipé. Déplacer la classe : le paiement doit rester attaché à cette séance seulement.
- **Couleurs** : une séance terminée impayée doit être rouge, une future impayée blanche. Une annulation impayée ou une séance gratuite reste sans dette.
- **Conservation** : fermer et relancer, vérifier paiements et méthodes ; exporter/restaurer une copie de test. Tester une planification avec une séance future payée et une exception annulée avant de changer la série.

## Parcours général

Effectuer ces essais avec des élèves fictifs, avant de saisir les vraies données.

1. **Démarrage** : ouvrir `Amapola.exe` dans le dossier du projet et vérifier que le navigateur affiche Amapola en espagnol, version v0.2. Réouvrir l’exécutable : il doit retrouver la même application et les mêmes données.
2. **Élèves** : créer deux élèves avec des couleurs différentes, coordonnées, canaux WhatsApp/Messenger et notes. Les retrouver dans la liste, ouvrir leur fiche, modifier les informations et vérifier les filtres de recherche.
3. **Planification** : créer une classe hebdomadaire avec un tarif. Vérifier que « Cada semana » et « En línea » sont présélectionnés. Ajouter aussi une séance unique et essayer les modalités maison/voiture.
4. **Calendrier** : vérifier jours, heures, couleurs et icônes, puis naviguer entre les semaines. Tester aussi la vue Agenda et deux cours qui se chevauchent.
5. **Exception** : déplacer une seule séance, changer son tarif, puis en annuler une. Vérifier que les autres semaines conservent leurs horaires. Modifier ensuite une planification avec une date d’effet future : les cours précédant cette date doivent rester présents.
6. **Historique** : créer un horaire avec une date de début passée ; vérifier l’onglet des cours passés sur l’élève. Modifier le tarif de la série : l’ancien tarif doit rester dans l’historique.
7. **Rapports** : vérifier manuellement le total de la semaine et de la suivante ; une annulation doit être exclue. Le tarif est un prix par séance, indépendant de la durée.
8. **Paramètres** : enregistrer le nom de l’activité et les informations personnelles. Essayer les modes clair/sombre/système, puis fermer et réouvrir l’application.
9. **Sauvegarde** : télécharger une copie `.amapola`, modifier un élève fictif, restaurer la copie puis vérifier que la modification a été annulée. Vérifier qu’une copie « Antes de un cambio » est disponible. Tester la copie vers un dossier kDrive synchronisé si ce mode est utilisé.
10. **Suppression et fermeture** : supprimer un élève fictif et vérifier l’avertissement ainsi que la copie préalable. Quitter par « Cerrar aplicación », relancer et vérifier les données restantes.

Pour un problème, indiquer l’écran, les étapes, le résultat attendu et celui observé. Une capture peut aider. Le test d’envoi API kDrive nécessite le compte réel et n’a pas été validé avec des identifiants réels.
