# Código, versiones y descargas

Repositorio: [Horizon-8/Amapola](https://github.com/Horizon-8/Amapola).

## Descargar la aplicación

Abre [Releases](https://github.com/Horizon-8/Amapola/releases/latest) y descarga **Amapola-0.9.0-Windows.zip** en **Assets**. Extrae todo y abre **Amapola.exe**. Los archivos «Source code (zip/tar.gz)» no incluyen el motor ni el ejecutable preparado.

Cada release conserva su versión del programa. El archivo `.sha256` permite comprobar la integridad de su ZIP con `Get-FileHash` en PowerShell. Las instrucciones de instalación, actualización y traslado están en **INSTALLATION-FR.md** y **GUIA-COPIAS.md**.

## Qué guarda GitHub

El historial contiene las fuentes, pruebas y guías. Se excluyen bases de datos, copias `.amapola`, datos personales, credenciales Google y registros. El ZIP portable lleva el motor Node.js y el ejecutable, pero tampoco contiene datos de usuario.

Los cambios de alumnos, clases o pagos no son commits: se guardan en el PC y se protegen exportando copias `.amapola`. Descargar una release no recupera esos datos por sí solo.

La visibilidad del repositorio determina quién puede acceder al código y a sus releases. Un repositorio público se puede encontrar y descargar sin iniciar sesión ; no es un enlace privado. No publiques datos ni credenciales aunque solo compartas la URL con conocidos.

## Desarrollo y publicación

Para trabajar con el historial remoto, clona el repositorio en una carpeta de desarrollo nueva. No fuerces el envío de un historial local distinto sobre `main`.

```powershell
git clone https://github.com/Horizon-8/Amapola.git
```

El motor Node.js 24.13 o posterior de la rama 24.x y su licencia completa se colocan en `runtime`, fuera del historial. `windows/build.ps1` compila el lanzador y crea el ZIP con una lista explícita de archivos permitidos. Las pruebas se ejecutan con `runtime\node.exe --test`.

El flujo **Release Windows** puede ejecutarse desde Actions o al publicar una rama `release/VERSION` que coincida con `package.json`. Comprueba el motor oficial, ejecuta las pruebas, compila el ZIP, verifica una apertura con una base vacía y publica la release con el ZIP y su SHA-256. La rama de release debe apuntar al mismo commit que `main` antes de lanzarlo. No necesita claves Google ni datos reales.
