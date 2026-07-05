$botToken = "8490018286:AAEsnCJDuAycTk3PKcjhHTzlgpMMbRXkcAs"
$nuevaUrl = "https://us-central1-studio-9140393615-6d1a3.cloudfunctions.net/telegramWebhook"
$secret = "telegram_webhook_secreto_local_12345"

# 1. Primero eliminar webhook actual
$deleteResult = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/deleteWebhook" -Method POST
Write-Output "DELETE: $($deleteResult | ConvertTo-Json -Compress)"

Start-Sleep -Seconds 2

# 2. Registrar nuevo webhook apuntando a Firebase Cloud Function
$body = @{
    url = $nuevaUrl
    secret_token = $secret
    allowed_updates = @("message", "callback_query")
} | ConvertTo-Json -Compress

$setResult = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setWebhook" -Method POST -Body $body -ContentType "application/json"
Write-Output "SET: $($setResult | ConvertTo-Json -Compress)"

Start-Sleep -Seconds 2

# 3. Verificar que quedó bien
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getWebhookInfo"
Write-Output "VERIFICACION: $($info | ConvertTo-Json -Compress)"
