# 📱 Guia Completo: Gerar APK do Gestor Financeiro

## ⚠️ Problema Encontrado

Java 8 instalado, mas precisa **Java 17+** para compilar Android.

---

## ✅ Solução 1: Instalar Java 17 (Recomendado)

### Passo 1: Abra PowerShell **como Administrador**

### Passo 2: Cole este comando

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

Se Chocolatey já instalado, pule este.

### Passo 3: Instale Java 17

```powershell
choco install openjdk17 -y
```

### Passo 4: Feche e reabra PowerShell

### Passo 5: Compile o APK

```bash
cd c:\Workspace\pagamentos\android
.\gradlew.bat assembleDebug
```

Aguarde 5-10 minutos. APK ficará em:
```
c:\Workspace\pagamentos\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 📦 Solução 2: Usar Site Online (Mais Rápido)

Se Java é problema, use serviço online:

1. Acesse [EAS Build](https://docs.expo.dev/build/setup/) (Expo)
2. Ou [Apache Cordova Build](https://build.phonegap.com/)
3. Upload do projeto
4. Gera APK automaticamente

---

## 🔧 Solução 3: Usar Android Studio

Se instalado:
1. File → Open `c:\Workspace\pagamentos\android`
2. Build → Build Bundle(s) / APK(s) → Build APK(s)
3. APK pronto em `android/app/build/outputs/apk/`

---

## 📱 Instalar APK no Celular

Depois de gerar:

**Via USB (Recomendado):**
```bash
adb install c:\Workspace\pagamentos\android\app\build\outputs\apk\debug\app-debug.apk
```

**Via WiFi:**
1. Copiar arquivo para nuvem (Google Drive, OneDrive)
2. Download no celular
3. Abrir arquivo

**Via Bluetooth:**
1. Enviar arquivo via Bluetooth
2. Abrir no celular

---

## ✅ Checklist

- [ ] Java 17 instalado (`java -version` retorna 17+)
- [ ] Gradle funcionando (`.\gradlew.bat --version` no android folder)
- [ ] APK gerado
- [ ] APK instalado no celular
- [ ] App funcionando offline

---

## ❓ Problemas Comuns

**P: JAVA_HOME não está configurada**
R: Execute no PowerShell como admin:
```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\OpenJDK\openjdk-17-jdk", "Machine")
```

**P: Gradle demora muito**
R: Normal na primeira vez. Build posteriores são rápidos (~2min).

**P: APK não instala**
R: Ative "Instalar de fontes desconhecidas" nas configurações do celular.

---

**Próximo passo:** Execute a Solução 1 acima! 🚀
