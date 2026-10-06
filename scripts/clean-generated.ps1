# Remove audited, regenerable artifacts from this checkout only.
# Stop the web dev server and running tests before applying cleanup.
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [switch]$IncludeGraphify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$rootPrefix = $projectRoot + '\'

foreach ($marker in @('pyproject.toml', 'apps\web\package.json', '.git')) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $marker))) {
        throw "Expected agrilok checkout marker is missing: $marker"
    }
}

$trackedFiles = @(git -C $projectRoot -c core.quotepath=false ls-files)
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect tracked files. No cleanup performed.'
}

$targets = @(
    '.mypy_cache', '.ruff_cache', '.pytest_cache',
    'apps\web\.next', 'apps\web\tsconfig.tsbuildinfo',
    'apps\web\test-results', 'apps\web\playwright-report',
    'apps\web\blob-report', 'debug.log', 'apps\web\debug.log'
)

$pythonPackages = @{
    'apps\api' = 'agrilok_api'
    'packages\core' = 'agrilok_core'
    'infra' = 'agrilok_infra'
    'services\crawler' = 'crawler'
    'services\ingestion' = 'ingestion'
    'services\evaluation' = 'evaluation'
}
foreach ($component in ($pythonPackages.Keys | Sort-Object)) {
    foreach ($cache in @('.mypy_cache', '.ruff_cache', '.pytest_cache')) {
        $targets += "$component\$cache"
    }
    $targets += "$component\tests\__pycache__"
    $targets += "$component\src\$($pythonPackages[$component])\__pycache__"
}
if ($IncludeGraphify) {
    $targets += 'graphify-out'
}

$failures = @()
foreach ($relativePath in $targets) {
    $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $relativePath))
    if (-not $target.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Cleanup target is outside the checkout: $target"
    }

    # Never remove a tracked file or a directory containing tracked files.
    $gitPath = $relativePath.Replace('\', '/')
    $trackedMatches = @($trackedFiles | Where-Object {
        $_ -ieq $gitPath -or $_.StartsWith($gitPath + '/', [StringComparison]::OrdinalIgnoreCase)
    })
    if ($trackedMatches.Count -gt 0) {
        throw "Refusing to remove tracked content: $relativePath"
    }

    try {
        # Check every ancestor before accessing the target: no junction traversal.
        $cursor = Get-Item -LiteralPath $projectRoot -Force
        if ($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw 'The checkout root is a junction or symbolic link.'
        }
        $missing = $false
        foreach ($part in $relativePath.Split('\')) {
            $next = Join-Path $cursor.FullName $part
            if (-not (Test-Path -LiteralPath $next)) {
                $missing = $true
                break
            }
            $cursor = Get-Item -LiteralPath $next -Force
            if ($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Refusing a junction or symbolic link: $($cursor.FullName)"
            }
        }
        if ($missing) { continue }

        # Inspect children without following links before any recursive deletion.
        $queue = [Collections.Generic.Queue[IO.FileSystemInfo]]::new()
        $queue.Enqueue($cursor)
        while ($queue.Count -gt 0) {
            $item = $queue.Dequeue()
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Refusing a nested junction or symbolic link: $($item.FullName)"
            }
            if ($item.PSIsContainer) {
                foreach ($child in (Get-ChildItem -LiteralPath $item.FullName -Force)) {
                    $queue.Enqueue($child)
                }
            }
        }

        if ($PSCmdlet.ShouldProcess($target, 'Permanently delete generated artifact')) {
            Remove-Item -LiteralPath $target -Recurse -Force
            Write-Host "Removed: $relativePath"
        }
    }
    catch {
        $failures += $relativePath
        Write-Warning "Skipped ${relativePath}: $($_.Exception.Message)"
    }
}

if ($failures.Count -gt 0) {
    throw "Cleanup incomplete. Could not inspect or remove: $($failures -join ', ')"
}
