# ─────────────────────────────────────────────────────────────────────────────
# Publicación semanal del blog desde el PC local (reemplaza a GitHub Actions)
#
# La programa el Programador de tareas de Windows (tarea "Desmulta - Noticias del blog").
# Pasos: actualizar main → importar noticias (npm run blog:sync) → validar MDX → commit y push.
# Si algún artículo no compila, se descartan los cambios y no se publica nada.
# Registro: logs/blog-sync.log (ignorado por Git).
# ─────────────────────────────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
New-Item -ItemType Directory -Force -Path (Join-Path $repo 'logs') | Out-Null
$log = Join-Path $repo 'logs\blog-sync.log'

function Write-Log([string]$message) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
    Add-Content -Path $log -Value $line -Encoding utf8
    Write-Output $line
}

try {
    Write-Log 'Inicio de la publicación semanal del blog'

    # Solo se publica sobre una copia limpia de main (no mezclar trabajo en curso)
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne 'main') { throw "La rama actual es '$branch'; se esperaba main." }
    if (git status --porcelain src/content/blog) { throw 'Hay cambios sin publicar en src/content/blog.' }

    git pull --quiet origin main
    npm run blog:sync *>> $log

    $cambios = git status --porcelain src/content/blog
    if (-not $cambios) {
        Write-Log 'Sin noticias nuevas.'
        exit 0
    }

    node scripts/validate-blog-mdx.mjs *>> $log
    if ($LASTEXITCODE -ne 0) {
        git checkout -- src/content/blog
        git clean -fdq -- src/content/blog
        throw 'Hay artículos que no compilan: se descartaron los cambios.'
    }

    git add -A src/content/blog
    # --no-verify: solo contenido MDX (ya validado arriba); evita correr tsc en cada publicación
    git commit --no-verify -m 'característica: importar noticias del blog (tarea semanal)' | Out-Null
    git push --quiet origin main
    Write-Log 'Noticias publicadas en main (Vercel las desplegará en unos minutos).'
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}
