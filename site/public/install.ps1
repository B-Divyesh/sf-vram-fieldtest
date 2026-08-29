$ErrorActionPreference = 'Stop'
$repo = 'B-Divyesh/sf-vram-fieldtest'
$expected = 'v0.1.2'
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest"
if ($release.tag_name -ne $expected) { throw "Downloads for $expected are not published yet. See https://github.com/$repo/releases" }
$asset = $release.assets | Where-Object { $_.name -match 'windows-x86_64\.zip$' } | Select-Object -First 1
$sums = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS' } | Select-Object -First 1
if (-not $asset -or -not $sums) { throw 'Matching download is being published. See https://github.com/' + $repo + '/releases' }
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('vram-fieldtest-' + [guid]::NewGuid()); New-Item -ItemType Directory $temp | Out-Null
try { Invoke-WebRequest $asset.browser_download_url -OutFile "$temp\tool.zip"; Invoke-WebRequest $sums.browser_download_url -OutFile "$temp\SHA256SUMS"; $wanted = ((Get-Content "$temp\SHA256SUMS" | Where-Object { $_ -match [regex]::Escape($asset.name) }) -split '\s+')[0]; $actual = (Get-FileHash "$temp\tool.zip" -Algorithm SHA256).Hash.ToLower(); if ($wanted.ToLower() -ne $actual) { throw 'SHA256 verification failed.' }; Expand-Archive "$temp\tool.zip" "$temp\unpacked"; $dest = Join-Path $env:LOCALAPPDATA 'VRAMFieldTest'; New-Item -ItemType Directory -Force $dest | Out-Null; Copy-Item "$temp\unpacked\vram-fieldtest.exe" "$dest\vram-fieldtest.exe" -Force; [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ";$dest", 'User'); Write-Output "Installed vram-fieldtest to $dest. Open a new terminal and run: vram-fieldtest demo" } finally { Remove-Item -Recurse -Force $temp }
