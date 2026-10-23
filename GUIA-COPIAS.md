# Guardar tus datos y cambiar de ordenador

## Guardado diario

Amapola guarda cada modificación automáticamente en el PC. También crea copias locales después de los cambios y al cerrar con **Cerrar aplicación**. No hay que editar una fecha, un día ni una clase para activar las copias.

Las copias locales están en el mismo ordenador: para conservar los datos si se avería, guarda además un archivo `.amapola` en un USB u otra ubicación fuera del PC.

## Descargar una copia completa

1. Abre **Mi información** en el menú lateral.
2. Busca **Copias de seguridad**.
3. En **Destino de la copia manual**, elige **Descarga / copia local**.
4. Pulsa **Guardar cambios** arriba.
5. Pulsa **Descargar copia** y conserva el archivo `.amapola` descargado. Cópialo también a un USB o a tu carpeta sincronizada.

Puedes descargar otra copia cuando quieras, sin modificar ningún dato antes. Se incluyen todos los alumnos y contactos potenciales, estados y canales, notas y enlaces, planificaciones, histórico, tarifas, modalidades, estados de clase, pagos y métodos, bloques **Ocupada** y configuración. Las sesiones eliminadas siguen eliminadas al restaurar.

El seguimiento «En conversación» y los enlaces se guardan; los mensajes de las aplicaciones externas no se importan. La apariencia clara/oscura es una preferencia del navegador.

## Copiar a kDrive

Si tienes la aplicación de kDrive instalada en el PC, puedes elegir **Carpeta sincronizada de kDrive**, indicar la ruta completa de una carpeta existente y pulsar **Guardar cambios**. Después pulsa **Copiar a carpeta kDrive** y comprueba que kDrive la haya sincronizado.

Este destino se aplica al botón de copia manual. Las copias automáticas de Amapola siguen siendo locales. También queda disponible **Descargar copia local**. El modo API requiere configurar el identificador de kDrive, la carpeta privada y un token con permiso de escritura; el token no se conserva.

## Recuperar una copia o usar otro PC

1. Descarga una copia `.amapola` en el PC de origen.
2. Copia el ZIP de la aplicación y el archivo `.amapola` al PC de destino.
3. Extrae **todo el ZIP** en una carpeta permanente y abre **Amapola.exe**.
4. Abre **Mi información → Copias de seguridad → Restaurar una copia**.
5. Selecciona el archivo `.amapola`, revisa el resumen y escribe **RESTAURAR** para confirmar.

La restauración reemplaza los datos del PC de destino. Antes se crea una copia local de seguridad de lo que había. Si usas una carpeta sincronizada, comprueba su ruta después de restaurar: puede cambiar entre ordenadores.

El formato actual de copia es **v5**, disponible desde Amapola **0.5.0**. Usa esa versión o una posterior compatible en el PC de destino. La aplicación nueva también puede restaurar copias v1, v2, v3 y v4.

## Recuperar una sesión borrada por error

Antes de cada eliminación Amapola crea una copia. En **Mi información → Copias locales recientes**, busca la copia **Antes de un cambio**, descárgala y restáurala con el procedimiento anterior. Se recupera el estado completo de esa copia, por lo que también se revierte cualquier cambio posterior. Descarga una copia del estado actual antes de restaurar si quieres conservarlo.

## Código del programa en GitHub

GitHub conserva el código y su historial de versiones. Tus datos de alumnos y pagos se conservan mediante los archivos `.amapola`; son dos copias distintas y complementarias. Las bases de datos, archivos de copia, credenciales, ejecutables generados y ZIP se excluyen de los commits del proyecto.
