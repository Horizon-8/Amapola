param([string]$NodePath = '', [string]$NodeLicense = '', [switch]$LauncherOnly)
$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeDir = Join-Path $project 'runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
if ($NodePath) { Copy-Item -LiteralPath $NodePath -Destination (Join-Path $runtimeDir 'node.exe') }
if ($NodeLicense) { Copy-Item -LiteralPath $NodeLicense -Destination (Join-Path $runtimeDir 'NODE-LICENSE.txt') }
$node = Join-Path $runtimeDir 'node.exe'
if (!(Test-Path -LiteralPath $node) -or !(Test-Path -LiteralPath (Join-Path $runtimeDir 'NODE-LICENSE.txt'))) {
    throw 'Provide the official Node.js 24 Windows x64 executable and its complete LICENSE in runtime/.'
}
$version = & $node --version
if ($version -notmatch '^v24\.' -or [version]$version.TrimStart('v') -lt [version]'24.13.0') { throw 'Node.js 24.13.0 or newer in the 24.x series is required.' }
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path -LiteralPath $compiler)) { throw '.NET Framework C# compiler not found.' }
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ /reference:System.Windows.Forms.dll "/out:$project\Amapola.exe" "$PSScriptRoot\Launcher.cs"
if ($LASTEXITCODE -ne 0) { throw 'Could not compile the launcher.' }
if ($LauncherOnly) { Write-Output (Join-Path $project 'Amapola.exe'); return }
$release = Join-Path $project 'release'
New-Item -ItemType Directory -Path $release -Force | Out-Null
$packageVersion = (Get-Content -LiteralPath (Join-Path $project 'package.json') -Raw | ConvertFrom-Json).version
$zip = Join-Path $release "Amapola-$packageVersion-Windows.zip"
# Explicit allowlist: never ship development databases, test students or logs.
Compress-Archive -LiteralPath (Join-Path $project 'app'), (Join-Path $project 'runtime'), (Join-Path $project 'windows'), (Join-Path $project 'tests'), (Join-Path $project 'Amapola.exe'), (Join-Path $project 'Crear-acceso-directo.vbs'), (Join-Path $project 'LEEME.html'), (Join-Path $project 'README.md'), (Join-Path $project 'TESTS-UI.md'), (Join-Path $project 'INSTALLATION-FR.md'), (Join-Path $project 'package.json') -DestinationPath $zip -Force
Write-Output $zip
