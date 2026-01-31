param(
  [string]$Registration = "IT23293212",
  [string]$CourseCode = "IT3040"
)

$srcRoot = Split-Path -Parent $PSScriptRoot
$downloads = Join-Path $env:USERPROFILE "Downloads"

$dstOuter = Join-Path $downloads $Registration
$dstInner = Join-Path $dstOuter $Registration
$dstProject = Join-Path $dstInner "${Registration}_Playwright_Project"
$dstResults = Join-Path $dstInner "test-results"
$zipPath = Join-Path $downloads ("{0}.zip" -f $Registration)

New-Item -ItemType Directory -Force -Path $dstInner | Out-Null

if (Test-Path $dstProject) { Remove-Item -LiteralPath $dstProject -Recurse -Force }
if (Test-Path $dstResults) { Remove-Item -LiteralPath $dstResults -Recurse -Force }

# Copy project, but exclude node_modules to keep zip small (marker can run npm install).
Copy-Item -LiteralPath $srcRoot -Destination $dstProject -Recurse -Force
$nm = Join-Path $dstProject "node_modules"
if (Test-Path $nm) { Remove-Item -LiteralPath $nm -Recurse -Force }

# Copy test-results if they exist
$srcResults = Join-Path $srcRoot "test-results"
if (Test-Path $srcResults) { Copy-Item -LiteralPath $srcResults -Destination $dstResults -Recurse -Force }

# Ensure required separate GitHub link file exists at submission root
$gitLink = Join-Path $srcRoot ("{0}_GitHub_Link.txt" -f $Registration)
if (Test-Path $gitLink) {
  Copy-Item -LiteralPath $gitLink -Destination (Join-Path $dstInner ("{0}_GitHub_Link.txt" -f $Registration)) -Force
}

if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -LiteralPath $dstInner -DestinationPath $zipPath -Force

Write-Output "Created: $dstInner"
Write-Output "Zip: $zipPath"
