@echo off
REM Build APK com correção de Java 21 -> 17

echo Building Gestor Financeiro...
echo.

REM Step 1: Build React
echo [1/4] Building React app...
call npm run build
if %errorlevel% neq 0 exit /b 1

REM Step 2: Sync Capacitor
echo.
echo [2/4] Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 exit /b 1

REM Step 3: Fix Java versions
echo.
echo [3/4] Fixing Java versions...
cd android
powershell -Command "(Get-Content app\capacitor.build.gradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content app\capacitor.build.gradle"
powershell -Command "(Get-Content capacitor-cordova-android-plugins\build.gradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content capacitor-cordova-android-plugins\build.gradle"
powershell -Command "(Get-Content ..\node_modules\@capacitor\app\android\build.gradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content ..\node_modules\@capacitor\app\android\build.gradle"

REM Step 4: Build APK
echo.
echo [4/4] Building APK...
set ANDROID_HOME=C:\Android\sdk
.\gradlew.bat clean assembleDebug
if %errorlevel% neq 0 exit /b 1

echo.
echo ==================================
echo   BUILD  SUCCESSFUL!
echo ==================================
echo.
echo APK: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Install with:
echo   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
echo.
