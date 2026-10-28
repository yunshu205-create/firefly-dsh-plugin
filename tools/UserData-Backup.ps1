param([switch]$Restore)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
$message='插件版资料由当前 DSH Profile 管理。请先在 DSH 中停用流萤，再备份该 Profile 的 firefly-data 目录。恢复前也需停用插件，保留当前资料副本后再恢复。此窗口没有执行备份、恢复或删除。'
[System.Windows.Forms.MessageBox]::Show($message,'流萤') | Out-Null
