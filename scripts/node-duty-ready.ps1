param(
  [string]$TaskName = 'MembranaNode'
)

$ErrorActionPreference = 'SilentlyContinue'

function Read-CommandText {
  param([string[]]$Command)
  try {
    $output = & $Command[0] $Command[1..($Command.Length - 1)] 2>&1
    return ($output | Out-String)
  } catch {
    return ''
  }
}

$powerAvailability = Read-CommandText @('powercfg', '/a')
$sleepSettings = Read-CommandText @('powercfg', '/query', 'SCHEME_CURRENT', 'SUB_SLEEP')

$winlogonPath = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
$winlogon = Get-ItemProperty -Path $winlogonPath
$task = Get-ScheduledTask -TaskName $TaskName

[pscustomobject]@{
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  taskName = $TaskName
  powercfg = @{
    availability = $powerAvailability
    sleepSettings = $sleepSettings
  }
  autologon = @{
    autoAdminLogon = [string]$winlogon.AutoAdminLogon
    defaultUserNamePresent = -not [string]::IsNullOrWhiteSpace([string]$winlogon.DefaultUserName)
    defaultDomainNamePresent = -not [string]::IsNullOrWhiteSpace([string]$winlogon.DefaultDomainName)
    defaultPasswordPresent = -not [string]::IsNullOrWhiteSpace([string]$winlogon.DefaultPassword)
  }
  scheduledTask = @{
    exists = $null -ne $task
    state = if ($null -ne $task) { [string]$task.State } else { $null }
  }
} | ConvertTo-Json -Depth 6
