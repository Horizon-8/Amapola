# Historial de versiones y copia del código

El proyecto tiene un historial Git local preparado con las versiones **v0.4.1**, **v0.5.0** y **v0.5.1**. Las bases de datos, copias `.amapola`, credenciales, archivos temporales, ejecutables y ZIP están excluidos. Los ejemplos que aparecen en los tests son datos sintéticos que solo se crean al ejecutar esos tests.

## Primera publicación

La cuenta conectada es **Horizon-8**. El conector disponible permite trabajar con repositorios existentes, pero no crear uno nuevo. Para terminar la publicación:

1. Abre `https://github.com/new` con tu cuenta.
2. Crea un repositorio llamado **Amapola**, con visibilidad **Private**. Déjalo vacío, sin añadir README, licencia ni `.gitignore`, porque ya forman parte del proyecto.
3. Abre el repositorio que acabas de crear y copia la URL del navegador, por ejemplo `https://github.com/Horizon-8/Amapola`. También sirve **Code → HTTPS → copiar**, que termina en `.git`. Facilita esa URL para enviar el código desde la conversación, o ejecuta en PowerShell, desde esta carpeta de trabajo del proyecto (donde está el historial preparado):

```powershell
.\windows\Publicar-GitHub.ps1 -RepositoryUrl 'https://github.com/Horizon-8/Amapola.git'
```

Git puede pedir que inicies sesión en GitHub. No introduzcas tokens en los archivos del proyecto ni en la URL del repositorio.

El entorno de trabajo automatizado protege el índice de `.git`. Por eso los commits preparados están en `.local/version-history.git`. El script de publicación importa ese historial al repositorio normal, sin reemplazar tus archivos de trabajo, antes de enviarlo. Tras ejecutar el script desde PowerShell en tu PC, podrás usar los comandos Git habituales siguientes.

## Guardar cambios posteriores

En la carpeta del proyecto:

```powershell
git status
git add app tests windows package.json README.md TESTS-UI.md GUIA-COPIAS.md INSTALLATION-FR.md LEEME.html GITHUB.md .gitignore .gitattributes
git diff --cached --stat
git commit -m "Describe aquí el cambio"
git push
```

Un commit local conserva una versión en este PC; `git push` envía esa versión a GitHub. Si utilizas la aplicación sin modificar el código, no hace falta crear commits por cada clase o pago: esos cambios se guardan con las copias `.amapola`.

## Recuperar el programa

Puedes recuperar las fuentes con `git clone` desde tu repositorio privado. El motor Node.js y los ejecutables generados se obtienen o reconstruyen por separado, siguiendo README.md y windows/build.ps1. Para usar la aplicación en otro PC, el ZIP portátil sigue siendo la opción directa; después restaura tu copia de datos `.amapola` si quieres recuperarlos.

En la conversación anterior se entregó un respaldo del historial hasta 0.5.0, `Amapola-0.5.0-source.bundle`. Contiene esas fuentes y commits, sin datos personales ni el motor Node.js. Puedes guardarlo fuera de este PC mientras se completa la publicación en GitHub. El ZIP actual incluye las fuentes actualizadas a 0.5.1, pero ese respaldo anterior corresponde a 0.5.0. Para recuperar las fuentes desde ese archivo:

```powershell
git clone Amapola-0.5.0-source.bundle Amapola
```
