$ErrorActionPreference = 'Stop'
$repo = 'B-Divyesh/sf-vram-fieldtest'
$expected = 'v0.1.10'
$releaseApi = if ($env:VRAM_FIELDTEST_RELEASE_API) { $env:VRAM_FIELDTEST_RELEASE_API } else { "https://api.github.com/repos/$repo/releases/latest" }
$identityUrl = if ($env:VRAM_FIELDTEST_IDENTITY_URL) { $env:VRAM_FIELDTEST_IDENTITY_URL } else { 'https://vram-fieldtest.sociobot.in/release.json' }
$commitApi = if ($env:VRAM_FIELDTEST_COMMIT_API) { $env:VRAM_FIELDTEST_COMMIT_API } else { "https://api.github.com/repos/$repo/commits/$expected" }
$release = Invoke-RestMethod $releaseApi
if ($release.tag_name -ne $expected) { throw "Downloads for $expected are not published yet. See https://github.com/$repo/releases" }
$identity = Invoke-RestMethod $identityUrl
$expectedCommit = $identity.source_commit
$publishedCommit = (Invoke-RestMethod $commitApi).sha
if ($identity.tag -ne $expected -or -not $expectedCommit -or $publishedCommit -ne $expectedCommit) { throw "Downloads for $expected do not match this site build yet. See https://github.com/$repo/releases" }
$asset = $release.assets | Where-Object { $_.name -match 'windows-x86_64\.zip$' } | Select-Object -First 1
$sums = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS' } | Select-Object -First 1
$provenance = $release.assets | Where-Object { $_.name -eq 'PROVENANCE.json' } | Select-Object -First 1
if (-not $asset -or -not $sums -or -not $provenance) { throw 'Matching download is being published. See https://github.com/' + $repo + '/releases' }
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('vram-fieldtest-' + [guid]::NewGuid()); New-Item -ItemType Directory $temp | Out-Null
try {
  Invoke-WebRequest $asset.browser_download_url -OutFile "$temp\tool.zip"
  Invoke-WebRequest $sums.browser_download_url -OutFile "$temp\SHA256SUMS"
  Invoke-WebRequest $provenance.browser_download_url -OutFile "$temp\PROVENANCE.json"
  if ((Get-Content "$temp\PROVENANCE.json" -Raw | ConvertFrom-Json).source_commit -ne $expectedCommit) { throw 'Release provenance does not match this site build.' }
  $wanted = ((Get-Content "$temp\SHA256SUMS" | Where-Object { $_ -match [regex]::Escape($asset.name) }) -split '\s+')[0]
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $actual = [System.BitConverter]::ToString($sha256.ComputeHash([System.IO.File]::ReadAllBytes("$temp\tool.zip"))).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha256.Dispose()
  }
  if ($wanted.ToLower() -ne $actual) { throw 'SHA256 verification failed.' }
  Expand-Archive "$temp\tool.zip" "$temp\unpacked"
  $dest = Join-Path $env:LOCALAPPDATA 'VRAMFieldTest'
  New-Item -ItemType Directory -Force $dest | Out-Null
  Copy-Item "$temp\unpacked\vram-fieldtest.exe" "$dest\vram-fieldtest.exe" -Force
  [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ";$dest", 'User')
  Write-Output "Installed vram-fieldtest to $dest. Open a new terminal and run: vram-fieldtest demo"
} finally {
  Remove-Item -Recurse -Force $temp
}
