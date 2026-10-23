param([Parameter(Mandatory=$true)][string]$RepositoryUrl)
$ErrorActionPreference = 'Stop'
if ($RepositoryUrl -notmatch '^https://github\.com/[A-Za-z0-9-]+/[A-Za-z0-9_.-]+(?:\.git)?/?$') {
    throw 'Indica la URL HTTPS de tu repositorio GitHub, sin usuario, contraseña ni token en la URL.'
}
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $project
try {
    if (!(Test-Path -LiteralPath (Join-Path $project '.git'))) {
        & git init -b main
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el repositorio local.' }
    }
    $branches = & git for-each-ref '--format=%(refname)' refs/heads
    if ($branches -notcontains 'refs/heads/main') {
        $preparedHistory = Join-Path $project '.local\version-history.git'
        if (!(Test-Path -LiteralPath $preparedHistory)) { throw 'No se encontró el historial preparado. Facilita la URL del repositorio para terminar la publicación desde la conversación.' }
        & git fetch --no-tags $preparedHistory 'refs/heads/main:refs/heads/main' 'refs/tags/*:refs/tags/*'
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo recuperar el historial local preparado.' }
        & git reset --mixed main
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el índice de Git.' }
    }
    $changes = & git status --porcelain
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el repositorio local.' }
    if ($changes) { throw 'Hay cambios sin confirmar. Crea un commit antes de publicar para elegir qué versión se envía.' }
    $branch = & git branch --show-current
    if ($branch -ne 'main') { throw 'Publica desde la rama main después de revisar los cambios.' }
    $remotes = & git remote
    if ($remotes -contains 'origin') {
        $origin = & git remote get-url origin
        if ($origin.TrimEnd('/').Replace('.git','') -ne $RepositoryUrl.TrimEnd('/').Replace('.git','')) { throw 'origin ya apunta a otro repositorio. Revísalo antes de publicar.' }
    } else {
        & git remote add origin $RepositoryUrl
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar el destino origin.' }
    }
    & git push --set-upstream origin main
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo enviar el código. Comprueba que el repositorio exista y que tu cuenta tenga acceso.' }
    & git push origin --tags
    if ($LASTEXITCODE -ne 0) { throw 'El código se envió, pero faltan las etiquetas de versión. Revisa el acceso y vuelve a intentarlo.' }
    Write-Output 'Código y versiones enviados a GitHub. Los datos personales no se han incluido.'
} finally { Pop-Location }
