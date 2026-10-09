@echo off
REM Gera o APK de debug. Precisa de JDK 21 (Capacitor 8) e do Android SDK.

echo Building Gestor Financeiro...
echo.

REM Java: usa JAVA_HOME se definido; senao procura um JDK 21 instalado
if not defined JAVA_HOME (
  for /d %%J in ("C:\Program Files\Microsoft\jdk-21*" "C:\Program Files\Java\jdk-21*" "C:\Program Files\Eclipse Adoptium\jdk-21*") do set "JAVA_HOME=%%~J"
)
if not defined JAVA_HOME (
  echo JDK 21 nao encontrado. Instale com: winget install Microsoft.OpenJDK.21
  exit /b 1
)
echo Java: %JAVA_HOME%

REM Android SDK: usa ANDROID_HOME se definido; senao o caminho padrao do projeto
if not defined ANDROID_HOME set "ANDROID_HOME=C:\Android\sdk"
echo Android SDK: %ANDROID_HOME%

REM Step 1: Build React
echo.
echo [1/3] Building React app...
call npm run build
if %errorlevel% neq 0 exit /b 1

REM Step 2: Sync Capacitor
echo.
echo [2/3] Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 exit /b 1

REM Step 3: Build APK
echo.
echo [3/3] Building APK...
cd android
call .\gradlew.bat clean assembleDebug
if %errorlevel% neq 0 exit /b 1
cd ..

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
