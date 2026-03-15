#!/bin/bash
# Build APK for Gestor Financeiro usando Capacitor

cd "$(dirname "$0")"

echo "📦 Building APK for Gestor Financeiro..."
echo ""
echo "Pré-requisitos:"
echo "  ✓ Java 17+ (JAVA_HOME deve estar configurada)"
echo "  ✓ Android SDK"
echo ""

# Build
npx cap add android 2>/dev/null
npx cap sync

cd android

echo "🔨 Compilando APK..."
./gradlew assembleDebug

echo ""
echo "✅ APK gerado com sucesso!"
echo "📍 Localização: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Para instalar no celular:"
echo "  1. Conectar via USB"
echo "  2. adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo "  Ou"
echo "  1. Copiar arquivo para celular"
echo "  2. Abrir arquivo no celular"
