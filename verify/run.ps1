# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Vixen420
#
# Rastrokizer is free software: you may redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later
# version. It comes with ABSOLUTELY NO WARRANTY. See the file LICENSE, or
# <https://www.gnu.org/licenses/>, for the full text.

param(
    [string]$Batch = 'refuse',      # a | b | k | k2 | refuse
    [switch]$Preserve,               # test with PRESERVE_BLENDING_OPTIONS = true
    [string]$OutRoot = (Join-Path $PSScriptRoot 'out')
)
# Sends verify.jsx to the running Photoshop 2026 over COM, one job per call. It creates and
# closes only its own throwaway documents and restores the active document afterward.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$fix  = Join-Path (Split-Path $here -Parent) 'Rastrokizer.jsx'
if ($Preserve) {
    $src = Get-Content -Raw -Encoding UTF8 $fix
    $fix = Join-Path $OutRoot 'Rastrokizer (preserve).jsx'
    New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null
    Set-Content -Encoding UTF8 -Path $fix -Value $src.Replace('var PRESERVE_BLENDING_OPTIONS = false;', 'var PRESERVE_BLENDING_OPTIONS = true;')
}
$out = Join-Path $OutRoot ("out-" + $Batch + $(if ($Preserve) { '-preserve' } else { '' }))
New-Item -ItemType Directory -Force -Path $out | Out-Null
Get-ChildItem $out -Filter *.png -ErrorAction SilentlyContinue | Remove-Item -Force

$os = Get-CimInstance Win32_OperatingSystem
$free = [math]::Round($os.FreePhysicalMemory / 1024)
Write-Output ("start {0}  free RAM {1} MB  batch={2}" -f (Get-Date -Format HH:mm:ss), $free, $Batch)
if ($free -lt 2500) { Write-Output "NOT STARTED: free RAM below 2500 MB"; exit 1 }
$app = [Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.200')
Write-Output ("Photoshop {0}, documents open = {1}" -f $app.Version, $app.Documents.Count)

$js = Get-Content -Raw -Encoding UTF8 (Join-Path $here 'verify.jsx')
$js = $js.Replace('//@OUTDIR@',  "var OUTDIR = '"  + $out.Replace('\', '\\') + "';")
$js = $js.Replace('//@FIXFILE@', "var FIXFILE = '" + $fix.Replace('\', '\\') + "';")
$js = $js.Replace('//@BATCH@',   "var BATCH = '$Batch';")
$ok = $false
for ($t = 1; $t -le 60; $t++) {
    try { $r = $app.DoJavaScript($js); Write-Output "accepted attempt ${t}: $r"; $ok = $true; break }
    catch {
        $ex = $_.Exception
        while ($ex.InnerException -and -not ($ex -is [System.Runtime.InteropServices.COMException])) { $ex = $ex.InnerException }
        $code = '{0:X8}' -f $ex.HResult
        if ($code -eq '8001010A' -or $code -eq '80010001') { Start-Sleep -Seconds 2 } else { throw }
    }
}
if (-not $ok) { Write-Output "NOT ACCEPTED: Photoshop stayed busy"; exit 1 }
Write-Output ("end {0}" -f (Get-Date -Format HH:mm:ss))
Get-Content -Encoding UTF8 (Join-Path $out 'report.txt')
Write-Output "--- grade ---"
python (Join-Path $here 'grade.py') $out
