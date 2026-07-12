# Script para configurar CORS en Firebase Storage
# Este script usa la API de Google Cloud Storage para configurar CORS

param(
    [string]$ProjectId = "",
    [string]$BucketName = ""
)

# Colores para output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Reset = "`e[0m"

Write-Host "${Yellow}Configurando CORS para Firebase Storage...${Reset}"

# Verificar que gsutil esté instalado
$gsutil = Get-Command gsutil -ErrorAction SilentlyContinue
if (-not $gsutil) {
    Write-Host "${Red}Error: gsutil no está instalado.${Reset}"
    Write-Host "Instala Google Cloud SDK desde: https://cloud.google.com/sdk/docs/install"
    Write-Host "O usa el siguiente comando manual en Firebase Console:"
    Write-Host "1. Ve a https://console.cloud.google.com/apis/credentials"
    Write-Host "2. Selecciona tu proyecto"
    Write-Host "3. Ve a 'Firebase Storage' > 'Configuración' > 'CORS'"
    Write-Host "4. Configura las reglas CORS manualmente"
    exit 1
}

# Obtener Project ID si no se proporcionó
if (-not $ProjectId) {
    $ProjectId = gcloud config get-value project 2>$null
    if (-not $ProjectId) {
        Write-Host "${Red}Error: No se pudo obtener el Project ID.${Reset}"
        Write-Host "Especifica el Project ID: .\scripts\setup-cors.ps1 -ProjectId 'tu-proyecto-id'"
        exit 1
    }
}

# Obtener Bucket Name si no se proporcionó
if (-not $BucketName) {
    $BucketName = "${ProjectId}.appspot.com"
}

Write-Host "${Yellow}Project ID: ${ProjectId}${Reset}"
Write-Host "${Yellow}Bucket: ${BucketName}${Reset}"

# Crear archivo temporal de configuración CORS
$corsConfig = @"
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "DELETE"],
    "maxAgeSeconds": 3600
  },
  {
    "origin": ["*"],
    "method": ["PUT", "POST"],
    "maxAgeSeconds": 3600,
    "allowedHeaders": ["Content-Type", "Authorization", "FirebaseStorage-*"]
  }
]
"@

$corsFile = "$env:TEMP\cors-config.json"
$corsConfig | Out-File -FilePath $corsFile -Encoding utf8

Write-Host "${Yellow}Aplicando configuración CORS...${Reset}"

# Aplicar configuración CORS
try {
    gsutil cors set $corsFile gs://$BucketName
    Write-Host "${Green}✅ CORS configurado exitosamente para gs://${BucketName}${Reset}"
} catch {
    Write-Host "${Red}❌ Error al configurar CORS: ${_}${Reset}"
    Write-Host ""
    Write-Host "${Yellow}Configuración manual:${Reset}"
    Write-Host "1. Ve a https://console.cloud.google.com/storage/browser/${BucketName}"
    Write-Host "2. Click en 'Configuración' > 'CORS'"
    Write-Host "3. Agrega la siguiente configuración:"
    Write-Host ""
    Write-Host $corsConfig
    exit 1
} finally {
    # Limpiar archivo temporal
    if (Test-Path $corsFile) {
        Remove-Item $corsFile
    }
}

Write-Host ""
Write-Host "${Green}✅ Configuración CORS completada${Reset}"
Write-Host ""
Write-Host "${Yellow}Próximos pasos:${Reset}"
Write-Host "1. Recarga la página del AdminDashboard"
Write-Host "2. Intenta subir una imagen nuevamente"
Write-Host "3. Verifica en la consola del navegador que no haya errores de CORS"