$indexPath = (Join-Path $PSScriptRoot "..\index.html" | Resolve-Path).Path

$chromePaths = @(
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
  Write-Error "Google Chrome Ç™å©Ç¬Ç©ÇËÇ‹ÇπÇÒÅB"
  exit 1
}

Start-Process -FilePath $chrome -ArgumentList $indexPath
Write-Host "Chrome Ç≈äJÇ´Ç‹ÇµÇΩ: $indexPath"
