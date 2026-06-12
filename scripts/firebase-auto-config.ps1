param(
    [string]$ProjectId,
    [string]$EnvPath = ".env",
    [string]$FirebaseConfigPath = "firebase-config.json"
)

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Error 'Firebase CLI no está instalado. Ejecuta: npm install -g firebase-tools'
    exit 1
}

if (-not $ProjectId) {
    Write-Host 'Debes pasar el projectId de Firebase:'
    Write-Host '  .\scripts\firebase-auto-config.ps1 -ProjectId "tu-project-id"'
    Write-Host 'Puedes listar proyectos con: firebase projects:list'
    exit 1
}

Write-Host "Usando proyecto Firebase: $ProjectId"

# Asegura que el proyecto esté seleccionado localmente
firebase use $ProjectId | Out-Null

Write-Host 'Obteniendo configuración SDK para la app web...'

$jsonRaw = firebase apps:sdkconfig WEB --project $ProjectId --json 2>$null
if (-not $jsonRaw) {
    Write-Error 'No se obtuvo configuración de SDK. Verifica que exista una app web en el proyecto Firebase.'
    exit 1
}

$json = $jsonRaw | ConvertFrom-Json
if (-not $json.config.firebase) {
    Write-Error 'La salida de Firebase CLI no contiene el objeto config.firebase esperado.'
    exit 1
}

$cfg = $json.config.firebase

$envContent = @"
PORT=5173
VITE_FIREBASE_API_KEY=$($cfg.apiKey)
VITE_FIREBASE_AUTH_DOMAIN=$($cfg.authDomain)
VITE_FIREBASE_PROJECT_ID=$($cfg.projectId)
VITE_FIREBASE_STORAGE_BUCKET=$($cfg.storageBucket)
VITE_FIREBASE_MESSAGING_SENDER_ID=$($cfg.messagingSenderId)
VITE_FIREBASE_APP_ID=$($cfg.appId)
"@

$envContent | Set-Content -Path $EnvPath -Encoding UTF8
Write-Host "Archivo '$EnvPath' generado."

$firebaseConfig = [ordered]@{
    apiKey = $cfg.apiKey
    authDomain = $cfg.authDomain
    projectId = $cfg.projectId
    storageBucket = $cfg.storageBucket
    messagingSenderId = $cfg.messagingSenderId
    appId = $cfg.appId
    firestoreDatabaseId = '(default)'
}

$firebaseConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $FirebaseConfigPath -Encoding UTF8
Write-Host "Archivo '$FirebaseConfigPath' generado."
