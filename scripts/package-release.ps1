param([string]$OutputDirectory,[switch]$WindowsOnly)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
if(!$OutputDirectory){$OutputDirectory=Join-Path $projectRoot 'release'}
$OutputDirectory=[IO.Path]::GetFullPath($OutputDirectory)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apkPath=Join-Path $OutputDirectory 'Ron1nzStories-Android-1.9.3.apk'
$portablePath=Join-Path $OutputDirectory 'Ron1nzStories-Windows-Portable-1.9.3.zip'
$apk=if(!$WindowsOnly){[IO.Compression.ZipFile]::OpenRead($apkPath)}else{$null}
$portable=[IO.Compression.ZipFile]::OpenRead($portablePath)
$count=0
try{
 if($portable.GetEntry('agreement.accepted')){throw 'Portable archive must not include an installer agreement receipt'}
 if($apk -and @($apk.Entries | Where-Object FullName -Like '*\*').Count){throw 'APK contains Windows-only asset paths'}
 foreach($file in Get-ChildItem -LiteralPath "$projectRoot/dist" -Recurse -File){
  $relative=[IO.Path]::GetRelativePath("$projectRoot/dist",$file.FullName).Replace('\','/')
  $expected=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
  $pairs=,@($portable,"www/$relative")
  if($apk){$pairs+=,@($apk,"assets/www/$relative")}
  foreach($pair in $pairs){
   $entry=$pair[0].GetEntry($pair[1]);if(!$entry){throw "Missing asset: $($pair[1])"}
   $inputStream=$entry.Open();try{$hash=[Security.Cryptography.SHA256]::Create();$actual=[Convert]::ToHexString($hash.ComputeHash($inputStream));$hash.Dispose()}finally{$inputStream.Dispose()}
   if($actual -ne $expected){throw "Asset mismatch: $relative"}
  }
  $count++
 }
}finally{if($apk){$apk.Dispose()};$portable.Dispose()}
Write-Output "PASS: $count files match the selected release packages"
$setupPath=Join-Path $OutputDirectory 'Ron1nzStories-Setup-1.9.3.exe'
$assembly=[Reflection.Assembly]::LoadFile($setupPath)
$payload=$assembly.GetManifestResourceStream('payload.zip')
try{$hash=[Security.Cryptography.SHA256]::Create();$payloadHash=[Convert]::ToHexString($hash.ComputeHash($payload));$hash.Dispose()}finally{$payload.Dispose()}
if($payloadHash -ne (Get-FileHash -LiteralPath $portablePath -Algorithm SHA256).Hash){throw 'Installer payload mismatch'}
Write-Output 'PASS: Installer embeds the verified Windows package'
$stage=Join-Path $projectRoot 'build/source-1.9.3/ron1nz-stories'
New-Item -ItemType Directory -Force -Path $stage,"$stage/native","$stage/scripts" | Out-Null
foreach($folder in @('dist','content')){Copy-Item -LiteralPath "$projectRoot/$folder" -Destination $stage -Recurse -Force}
foreach($file in Get-ChildItem -LiteralPath "$projectRoot/native" -File | Where-Object Extension -ne '.exe'){Copy-Item -LiteralPath $file.FullName -Destination "$stage/native" -Force}
foreach($file in Get-ChildItem -LiteralPath "$projectRoot/scripts" -File | Where-Object Name -ne 'draw-art.cjs'){Copy-Item -LiteralPath $file.FullName -Destination "$stage/scripts" -Force}
foreach($name in @('README.md','CHANGES-1.9.1.md','CHANGES-1.9.2.md','CHANGES-1.9.3.md','ARTWORK.md','EULA.txt','audio-sources.json','.gitignore')){Copy-Item -LiteralPath "$projectRoot/$name" -Destination $stage -Force}
$sourcePath=Join-Path $OutputDirectory 'Ron1nzStories-Source-1.9.3.zip'
Compress-Archive -LiteralPath $stage -DestinationPath $sourcePath -Force
$sourceZip=[IO.Compression.ZipFile]::OpenRead($sourcePath)
try{if(@($sourceZip.Entries | Where-Object FullName -Match '\.(keystore|dpapi)$|signing/|downloads/|qa-native').Count){throw 'Private data in source archive'}}finally{$sourceZip.Dispose()}
Copy-Item -LiteralPath "$projectRoot/README.md" -Destination "$OutputDirectory/Инструкция-1.9.3.md" -Force
Copy-Item -LiteralPath "$projectRoot/CHANGES-1.9.3.md" -Destination "$OutputDirectory/Изменения-1.9.3.md" -Force
$releaseFiles=@($setupPath,$portablePath,$sourcePath)
if(!$WindowsOnly){$releaseFiles+=,$apkPath}
$releaseFiles | ForEach-Object {$value=Get-FileHash -LiteralPath $_ -Algorithm SHA256;"$($value.Hash.ToLower())  $([IO.Path]::GetFileName($_))"} | Set-Content -LiteralPath "$OutputDirectory/SHA256SUMS-1.9.3.txt" -Encoding utf8
Write-Output ('Release 1.9.3 packaged; private signing files excluded. WindowsOnly: '+[bool]$WindowsOnly)
