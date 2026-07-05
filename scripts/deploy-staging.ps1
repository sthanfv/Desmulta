# Desmulta Staging Deployment Script
# v8.9.5

Write-Host "🚀 Iniciando despliegue en STAGING..." -ForegroundColor Cyan

# 1. Validar sesión de Firebase
$activeProject = firebase projects:list | Select-String "staging"
if (-not $activeProject) {
    Write-Error "❌ Error: El alias 'staging' no está configurado en .firebaserc o no tienes acceso."
    exit 1
}

# 2. Instalar dependencias de Functions
Write-Host "📦 Instalando dependencias de Functions..." -ForegroundColor Yellow
cd functions
npm install
cd ..

# 3. Desplegar reglas e índices
Write-Host "🔥 Desplegando Firestore (Rules & Indexes)..." -ForegroundColor Yellow
firebase deploy --only firestore -P staging

# 4. Desplegar Cloud Functions
Write-Host "☁️ Desplegando Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions -P staging

# 5. Aviso de Vercel (Frontend)
Write-Host "`n✅ Backend de STAGING actualizado." -ForegroundColor Green
Write-Host "⚠️ RECUERDA: El frontend debe ser desplegado en Vercel apuntando a las variables de entorno de Staging." -ForegroundColor Magenta
Write-Host "ID del Proyecto Staging: desmulta-staging-7f2a1" -ForegroundColor Gray
