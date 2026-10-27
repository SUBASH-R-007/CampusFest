$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    & npm.cmd --prefix frontend run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }

    $releaseName = 'CampusFest-php-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    $releaseRoot = Join-Path $projectRoot ('.runtime/releases/' + $releaseName)
    $backendRoot = Join-Path $releaseRoot 'backend'
    $publicRoot = Join-Path $backendRoot 'public'
    $scriptRoot = Join-Path $backendRoot 'scripts'
    New-Item -ItemType Directory -Force -Path $publicRoot, $scriptRoot, (Join-Path $projectRoot 'output') | Out-Null

    # Start from the fresh Vite build, never from runtime data or old built assets.
    Get-ChildItem -LiteralPath 'frontend/dist' -Force | Copy-Item -Destination $publicRoot -Recurse
    foreach ($file in @('index.php', '.htaccess')) {
        Copy-Item -LiteralPath (Join-Path 'backend/public' $file) -Destination $publicRoot
    }
    Copy-Item -LiteralPath 'backend/src' -Destination $backendRoot -Recurse
    # DemoSeed contains the deliberately public local demo credentials.
    $demoSource = Join-Path $backendRoot 'src/services/DemoSeed.php'
    if (Test-Path -LiteralPath $demoSource) { Remove-Item -LiteralPath $demoSource }
    foreach ($file in @('cli.php', 'setup.php', 'organizer.php')) {
        Copy-Item -LiteralPath (Join-Path 'backend/scripts' $file) -Destination $scriptRoot
    }
    Copy-Item -LiteralPath 'docs/HOSTING.md' -Destination (Join-Path $releaseRoot 'DEPLOYMENT.md')
    Copy-Item -LiteralPath 'docs/ASSETS.md' -Destination (Join-Path $releaseRoot 'ASSETS.md')
    Copy-Item -LiteralPath 'LICENSE' -Destination $releaseRoot

    $archivePath = Join-Path $projectRoot ('output/' + $releaseName + '.zip')
    # ZipFile includes .htaccess, which Compress-Archive can omit as a hidden file.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($releaseRoot, $archivePath)
    Write-Output "Hosting package: $archivePath"
    Write-Output 'No runtime state, sessions, local demo accounts, or participant data included.'
} finally {
    Pop-Location
}
