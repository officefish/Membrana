<#
.SYNOPSIS
  Установка приложения полевого узла Membrana одним прогоном (ADR-0027; b5 спринта
  firebat-node-device, #1998). Узел: Windows Home (без RDP/службы как таковой) — приложение
  регистрируется задачей планировщика «при входе пользователя», с перезапуском при сбое.

.DESCRIPTION
  Что делает (идемпотентно):
    1. Проверяет node и ffmpeg (ставит через winget, если нет — winget спрашивает владельца).
    2. Кладёт комплект узла в C:\membrana-node: firebat-poller.mjs, field-capture.mjs,
       lib\capture-sidecar.mjs (тракт записи — тот же, что у field:capture).
    3. Пишет .env узла из параметров: адрес сервера, устройство, КЛЮЧ УЗЛА.
       Служебного токена медиа-сервиса в .env узла НЕТ и быть не может (ADR-0027 Р3):
       ключ узла получает оператор один раз (POST /v1/devices/:id/node-key) и передаёт сюда.
    4. Регистрирует задачу планировщика MembranaNode: при входе пользователя → node firebat-poller.mjs,
       перезапуск каждые 1 мин при падении, без ограничения длительности.
       Почему вход пользователя, а не ONSTART/SYSTEM: захват звука через dshow живёт в
       интерактивной сессии; автовход настраивает владелец (netplwiz) — названо в docs/field/firebat-node.md.
    5. Запускает задачу сразу и печатает её состояние.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File firebat-service-install.ps1 `
    -MediaUrl https://media.membrana.space -DeviceId <uuid> -NodeKey <raw key> -KitSource D:\membrana-node

.NOTES
  -Uninstall снимает задачу и НЕ трогает записи; комплект и .env остаются для отладки.
  Запуск от имени пользователя, под которым будет писаться звук (на узле: firebat-t6\indic).
#>
[CmdletBinding()]
param(
  [string]$MediaUrl,
  [string]$DeviceId,
  [string]$NodeKey,
  [int]$PollMs = 5000,
  [int]$Rate = 48000,
  [string]$KitSource = (Split-Path -Parent $MyInvocation.MyCommand.Path),
  [string]$InstallDir = 'C:\membrana-node',
  [string]$TaskName = 'MembranaNode',
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

function Say([string]$msg) { Write-Host "node-install — $msg" }

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Say "задача $TaskName снята; комплект в $InstallDir оставлен"
  } else {
    Say "задачи $TaskName нет — снимать нечего"
  }
  exit 0
}

foreach ($p in @('MediaUrl', 'DeviceId', 'NodeKey')) {
  if (-not (Get-Variable -Name $p -ValueOnly)) { throw "node-install — параметр -$p обязателен (ключ узла выдаёт оператор: POST /v1/devices/:deviceId/node-key)" }
}

# 1. Инструменты: node и ffmpeg. winget — интерактивен, запускает владелец.
foreach ($tool in @(@{ cmd = 'node'; id = 'OpenJS.NodeJS.LTS' }, @{ cmd = 'ffmpeg'; id = 'Gyan.FFmpeg' })) {
  if (Get-Command $tool.cmd -ErrorAction SilentlyContinue) { Say "$($tool.cmd): есть"; continue }
  $wingetLink = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links'
  if ($tool.cmd -eq 'ffmpeg' -and (Test-Path (Join-Path $wingetLink 'ffmpeg.exe'))) { Say 'ffmpeg: есть (WinGet Links)'; continue }
  Say "$($tool.cmd) не найден — ставлю через winget ($($tool.id))"
  winget install --id $tool.id -e --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw "node-install — winget не поставил $($tool.id); поставить руками и повторить" }
}

# 2. Комплект узла — три файла тракта. Берётся из KitSource (флешка / папка репозитория scripts/).
$kit = @('firebat-poller.mjs', 'field-capture.mjs', 'lib\capture-sidecar.mjs')
New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'lib') | Out-Null
foreach ($f in $kit) {
  $src = Join-Path $KitSource $f
  if (-not (Test-Path $src)) { throw "node-install — в комплекте нет $f (искал $src)" }
  # Комплект уже лежит в InstallDir (владелец скопировал руками, 19.08) — файл сам в себя не копируется.
  $dst = Join-Path $InstallDir $f
  if ((Test-Path $dst) -and ((Resolve-Path $src).Path -ieq (Resolve-Path $dst).Path)) { continue }
  Copy-Item -Force $src $dst
}
Say "комплект положен в $InstallDir ($($kit -join ', '))"

# 3. .env узла — только контракт узла; служебного токена тут нет по построению.
$envLines = @(
  "# .env полевого узла Membrana — записан установщиком $(Get-Date -Format s)",
  "VITE_MEDIA_SERVER_URL=$MediaUrl",
  "FIELD_NODE_DEVICE_ID=$DeviceId",
  "FIELD_NODE_KEY=$NodeKey",
  "FIELD_NODE_POLL_MS=$PollMs",
  "FIELD_NODE_RATE=$Rate"
)
[System.IO.File]::WriteAllLines((Join-Path $InstallDir '.env'), $envLines, (New-Object System.Text.UTF8Encoding $false))
Say '.env узла записан (UTF-8 без BOM; служебного токена нет)'

# 4. Задача планировщика: при входе пользователя, перезапуск при сбое, без лимита времени.
$nodeExe = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument 'firebat-poller.mjs' -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Days 0) -StartWhenAvailable -MultipleInstances IgnoreNew
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Set-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings | Out-Null
  Say "задача $TaskName обновлена"
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
    -Description 'Membrana field node: outbound poll to media (ADR-0027)' | Out-Null
  Say "задача $TaskName зарегистрирована (при входе пользователя $env:USERNAME)"
}

# 5. Запуск и состояние.
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Say "состояние: $((Get-ScheduledTask -TaskName $TaskName).State) · последний запуск $($info.LastRunTime) · код $($info.LastTaskResult)"
Say "проверка руками: cd $InstallDir; node firebat-poller.mjs --once"
