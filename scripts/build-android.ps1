param([string]$AndroidSdk,[string]$JavaHome,[string]$OutputDirectory,[string]$SigningDirectory)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
if(!$AndroidSdk){$AndroidSdk=$env:ANDROID_HOME}
if(!$JavaHome){$JavaHome=$env:JAVA_HOME}
if(!$AndroidSdk -or !$JavaHome){$unity=Get-ChildItem -Path 'C:/Program Files/Unity/Hub/Editor/*/Editor/Data/PlaybackEngines/AndroidPlayer' -Directory -ErrorAction SilentlyContinue | Select-Object -Last 1;if($unity){if(!$AndroidSdk){$AndroidSdk=Join-Path $unity.FullName 'SDK'};if(!$JavaHome){$JavaHome=Join-Path $unity.FullName 'OpenJDK'}}}
if(!(Test-Path -LiteralPath "$JavaHome/bin/javac.exe")){throw 'Set JavaHome to JDK 17 or newer'}
$toolsDirectory=(Get-ChildItem -LiteralPath "$AndroidSdk/build-tools" -Directory | Sort-Object Name | Select-Object -Last 1).FullName
$androidJar=Join-Path $AndroidSdk 'platforms/android-36/android.jar'
if(!(Test-Path -LiteralPath $androidJar)){throw 'Install Android SDK platform 36'}
if(!$OutputDirectory){$OutputDirectory=Join-Path $projectRoot 'release'}
if(!$SigningDirectory){$SigningDirectory=Join-Path (Split-Path -Parent $projectRoot) 'signing-reader'}
$buildDirectory=Join-Path $projectRoot 'build/android-reader'
New-Item -ItemType Directory -Force -Path "$buildDirectory/classes","$buildDirectory/dex","$buildDirectory/res/drawable","$buildDirectory/assets/www",$OutputDirectory,$SigningDirectory | Out-Null
Copy-Item -Path "$projectRoot/dist/*" -Destination "$buildDirectory/assets/www" -Recurse -Force
Copy-Item -LiteralPath "$projectRoot/dist/assets/icon.png" -Destination "$buildDirectory/res/drawable/icon.png" -Force
function Run([string]$Executable,[string[]]$Arguments){& $Executable @Arguments;if($LASTEXITCODE -ne 0){throw "Build tool failed: $Executable"}}
Run "$JavaHome/bin/javac.exe" @('-encoding','UTF-8','-source','8','-target','8','-bootclasspath',"$androidJar;$toolsDirectory/core-lambda-stubs.jar",'-d',"$buildDirectory/classes","$projectRoot/native/MainActivity.java")
Run "$JavaHome/bin/jar.exe" @('cf',"$buildDirectory/classes.jar",'-C',"$buildDirectory/classes",'.')
Run "$JavaHome/bin/java.exe" @('-cp',"$toolsDirectory/lib/d8.jar",'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','26','--output',"$buildDirectory/dex","$buildDirectory/classes.jar")
Run "$toolsDirectory/aapt2.exe" @('compile','--dir',"$buildDirectory/res",'-o',"$buildDirectory/res.zip")
Run "$toolsDirectory/aapt2.exe" @('link','-o',"$buildDirectory/unsigned.apk",'-I',$androidJar,'--manifest',"$projectRoot/native/AndroidManifest.xml",'-R',"$buildDirectory/res.zip",'--auto-add-overlay')
# Java's jar tool writes portable slash-separated asset paths on Windows.
Run "$JavaHome/bin/jar.exe" @('uf',"$buildDirectory/unsigned.apk",'-C',$buildDirectory,'assets','-C',"$buildDirectory/dex",'classes.dex')
Run "$toolsDirectory/zipalign.exe" @('-f','-p','4',"$buildDirectory/unsigned.apk","$buildDirectory/aligned.apk")
$keystore=Join-Path $SigningDirectory 'ron1nz-stories.keystore'
$passwordFile=Join-Path $SigningDirectory 'android-password.dpapi'
if(!(Test-Path -LiteralPath $passwordFile)){
 if(Test-Path -LiteralPath $keystore){throw 'Signing password is missing for an existing keystore; refusing to replace it'}
 $randomBytes=New-Object byte[] 32;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
 $password=[Convert]::ToBase64String($randomBytes)
 ConvertTo-SecureString $password -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath $passwordFile
}else{$secure=(Get-Content -Raw -LiteralPath $passwordFile).Trim() | ConvertTo-SecureString;$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);try{$password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}}
$env:RON1NZ_SIGN_PASSWORD=$password
try{
 if(!(Test-Path -LiteralPath $keystore)){Run "$JavaHome/bin/keytool.exe" @('-genkeypair','-keystore',$keystore,'-storepass:env','RON1NZ_SIGN_PASSWORD','-keypass:env','RON1NZ_SIGN_PASSWORD','-alias','ron1nz-stories','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=_ron1nz_, O=Ron1nz Stories','-noprompt')}
 Run "$JavaHome/bin/java.exe" @('-jar',"$toolsDirectory/lib/apksigner.jar",'sign','--v4-signing-enabled','false','--ks',$keystore,'--ks-key-alias','ron1nz-stories','--ks-pass','env:RON1NZ_SIGN_PASSWORD','--key-pass','env:RON1NZ_SIGN_PASSWORD','--out',"$OutputDirectory/Ron1nzStories-Android-1.9.3.apk","$buildDirectory/aligned.apk")
 Run "$JavaHome/bin/java.exe" @('-jar',"$toolsDirectory/lib/apksigner.jar",'verify','--verbose','--print-certs',"$OutputDirectory/Ron1nzStories-Android-1.9.3.apk")
}finally{Remove-Item Env:RON1NZ_SIGN_PASSWORD -ErrorAction SilentlyContinue;$password=$null}
Run "$toolsDirectory/aapt2.exe" @('dump','badging',"$OutputDirectory/Ron1nzStories-Android-1.9.3.apk")
Write-Output "Android build complete: $OutputDirectory"
