@echo off
REM Fix Java version after Capacitor sync

echo Fixing Java versions in Gradle files...

REM Fix capacitor.build.gradle
powershell -Command "(Get-Content app\capacitor.build.gradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content app\capacitor.build.gradle"

REM Fix capacitor-cordova-android-plugins
powershell -Command "(Get-Content capacitor-cordova-android-plugins\build.gradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content capacitor-cordova-android-plugins\build.gradle"

echo Done!
