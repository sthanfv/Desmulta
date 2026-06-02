<#
.SYNOPSIS
    Actualiza FIREBASE_PRIVATE_KEY en .env desde un archivo JSON de cuenta de servicio de Firebase.

.USAGE
    .\scripts\update-firebase-key.ps1 -JsonPath "C:\ruta\a\serviceAccountKey.json"
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$JsonPath
)

$envPath = Join-Path $PSScriptRoot ".." ".env"
$envPath = Resolve-Path $envPath

# Leer y parsear el JSON de Firebase
if (-not (Test-Path $JsonPath)) {
    Write-Error "No se encontró el archivo JSON: $JsonPath"
    exit 1
}

$json = Get-Content $JsonPath -Raw | ConvertFrom-Json

$projectId   = $json.project_id
$clientEmail = $json.client_email
$privateKey  = $json.private_key   # Ya contiene newlines reales

if (-not $privateKey -or -not $privateKey.StartsWith("-----BEGIN PRIVATE KEY-----")) {
    Write-Error "El JSON no contiene una clave privada válida."
    exit 1
}

# Convertir newlines reales a \n literal para el .env
$keyForEnv = $privateKey.Replace("`n", "\n").Replace("`r", "")

# Leer .env actual
$envContent = [System.IO.File]::ReadAllText($envPath, [System.Text.UTF8Encoding]::new($false))

# Reemplazar valores
$envContent = [regex]::Replace($envContent, '(?m)^FIREBASE_PROJECT_ID=.*$',   "FIREBASE_PROJECT_ID=$projectId")
$envContent = [regex]::Replace($envContent, '(?m)^FIREBASE_CLIENT_EMAIL=.*$', "FIREBASE_CLIENT_EMAIL=$clientEmail")

# La private key puede ser muy larga — reemplazar línea completa
$envContent = [regex]::Replace(
    $envContent,
    '(?m)^FIREBASE_PRIVATE_KEY=.*$',
    "FIREBASE_PRIVATE_KEY=$keyForEnv",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

[System.IO.File]::WriteAllText($envPath, $envContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "✅ FIREBASE_PROJECT_ID   → $projectId"
Write-Host "✅ FIREBASE_CLIENT_EMAIL → $clientEmail"
Write-Host "✅ FIREBASE_PRIVATE_KEY  → actualizada ($(($keyForEnv.Length)) chars)"
Write-Host ""
Write-Host "✅ .env actualizado. Reinicie 'npm run dev' para aplicar los cambios."
