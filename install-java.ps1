# Install Java 17 via Chocolatey
# Run as Administrator

# First, install Chocolatey if not present
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install Java 17
Write-Host "Installing Java 17..."
choco install openjdk17 -y

# Set JAVA_HOME
$javaPath = "C:\Program Files\OpenJDK\openjdk-17.0.1_windows-x64_bin\jdk-17.0.1"
if (Test-Path $javaPath) {
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaPath, "User")
    [Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$javaPath\bin", "User")
    Write-Host "JAVA_HOME set to $javaPath"
} else {
    Write-Host "⚠️ Could not find Java installation. Check C:\Program Files\"
}

Write-Host "Done! Please restart PowerShell and try again."
