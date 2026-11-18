param([string]$WebViewPackage,[string]$OutputDirectory)
$ErrorActionPreference='Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if(!$WebViewPackage){$WebViewPackage=Join-Path (Split-Path -Parent $projectRoot) 'downloads/webview2'}
if(!$OutputDirectory){$OutputDirectory=Join-Path $projectRoot 'release'}
$WebViewPackage=[IO.Path]::GetFullPath($WebViewPackage)
$buildDirectory=Join-Path $projectRoot 'build/windows'
New-Item -ItemType Directory -Force -Path $buildDirectory,$OutputDirectory | Out-Null
$compilerCandidates=@("$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319/csc.exe")
$vsCompiler=Get-ChildItem -Path 'C:/Program Files/Microsoft Visual Studio/*/*/MSBuild/Current/Bin/Roslyn/csc.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
$compilerPath=if($vsCompiler){$vsCompiler.FullName}else{$compilerCandidates[0]}
function Compile([string[]]$Arguments){& $compilerPath @Arguments;if($LASTEXITCODE -ne 0){throw 'C# compilation failed'}}
$references=@('/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll')
$webReferences=@("/reference:$WebViewPackage/lib/net462/Microsoft.Web.WebView2.Core.dll","/reference:$WebViewPackage/lib/net462/Microsoft.Web.WebView2.WinForms.dll")
Compile (@('/nologo','/target:winexe','/platform:x64',"/out:$buildDirectory/Ron1nzStories.exe","/win32icon:$projectRoot/native/app.ico")+$references+$webReferences+@("$projectRoot/native/Reader.cs"))
Compile (@('/nologo','/target:winexe','/platform:x64',"/out:$buildDirectory/Uninstall.exe")+$references+@("$projectRoot/native/Uninstall.cs"))
Copy-Item -LiteralPath "$WebViewPackage/lib/net462/Microsoft.Web.WebView2.Core.dll","$WebViewPackage/lib/net462/Microsoft.Web.WebView2.WinForms.dll","$WebViewPackage/runtimes/win-x64/native/WebView2Loader.dll" -Destination $buildDirectory -Force
Copy-Item -LiteralPath "$WebViewPackage/LICENSE.txt" -Destination "$buildDirectory/WebView2-LICENSE.txt" -Force
Copy-Item -LiteralPath "$WebViewPackage/NOTICE.txt" -Destination "$buildDirectory/WebView2-NOTICE.txt" -Force
Copy-Item -LiteralPath "$projectRoot/native/app.ico","$projectRoot/EULA.txt","$projectRoot/audio-sources.json" -Destination $buildDirectory -Force
New-Item -ItemType Directory -Force -Path "$buildDirectory/www" | Out-Null
Copy-Item -Path "$projectRoot/dist/*" -Destination "$buildDirectory/www" -Recurse -Force
$payload=Join-Path $projectRoot 'build/payload.zip'
Compress-Archive -Path "$buildDirectory/*" -DestinationPath $payload -Force
Compile (@('/nologo','/target:winexe','/platform:x64',"/out:$OutputDirectory/Ron1nzStories-Setup-1.9.2.exe","/win32icon:$projectRoot/native/app.ico","/resource:$payload,payload.zip","/resource:$projectRoot/EULA.txt,EULA.txt","/resource:$projectRoot/native/app.ico,app.ico","/resource:$projectRoot/dist/assets/original-art.png,cover.png",'/reference:System.IO.Compression.dll','/reference:System.IO.Compression.FileSystem.dll','/reference:Microsoft.CSharp.dll')+$references+@("$projectRoot/native/Setup.cs","$projectRoot/native/InstallerAgreement.cs"))
Copy-Item -LiteralPath $payload -Destination "$OutputDirectory/Ron1nzStories-Windows-Portable-1.9.2.zip" -Force
Write-Output "Windows build complete: $OutputDirectory"
