param([string]$Data,[switch]$Close,[string]$SettingsRoot)
$ErrorActionPreference='Stop'
$settings=if($SettingsRoot){[IO.Path]::GetFullPath($SettingsRoot)}else{Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Firefly\DSH'}
$records=@(Get-ChildItem -LiteralPath (Join-Path $settings 'connections') -Filter '*.json' -File -ErrorAction SilentlyContinue | ForEach-Object {
 try{$v=Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json;if($v.product -eq 'firefly-dsh-plugin' -and (!$Data -or [IO.Path]::GetFullPath($v.data) -eq [IO.Path]::GetFullPath($Data))){
  $r=Get-Content -LiteralPath (Join-Path $v.data 'runtime.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $uri=[uri]$r.origin;if($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1' -or $uri.AbsolutePath -ne '/'){return}
  $h=Invoke-RestMethod -Uri ($r.origin+'/api/health') -TimeoutSec 2
  if($h.product -eq 'firefly-dsh-plugin' -and $h.ready -and $h.pid -eq $v.pid -and $h.instanceId -eq $v.instanceId){$v}
 }}catch{}
})
if($records.Count -eq 0){throw '请先在 DSH 中启用流萤插件。此入口只连接 DSH，不会另启后台。'}
if($records.Count -gt 1){throw '检测到多个流萤 Profile，请通过 -Data 参数明确选择资料目录。'}
$record=$records[0]
$previous=[Environment]::GetEnvironmentVariable('FIREFLY_DATA_DIR','Process')
try{
 $env:FIREFLY_DATA_DIR=$record.data
 $exe=Join-Path $record.hostRoot 'Firefly-Pet.exe'
 if($Close){$p=Start-Process -FilePath $exe -ArgumentList '--close-window' -WindowStyle Hidden -Wait -PassThru;if($p.ExitCode){throw '桌宠没有正常关闭。'}}
 else{Start-Process -FilePath $exe -WindowStyle Hidden | Out-Null}
}finally{[Environment]::SetEnvironmentVariable('FIREFLY_DATA_DIR',$previous,'Process')}
