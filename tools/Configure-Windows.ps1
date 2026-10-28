param([string]$ComponentRoot,[string]$VoiceRoot,[string]$VoiceOrigin,[string]$SettingsRoot)
$ErrorActionPreference='Stop'
if(!$ComponentRoot){$ComponentRoot=Split-Path $PSScriptRoot -Parent}
$component=(Resolve-Path -LiteralPath $ComponentRoot).Path
foreach($relative in @('component.json','host\Firefly-Pet.exe','host\Microsoft.Web.WebView2.Core.dll','host\Microsoft.Web.WebView2.Wpf.dll','host\WebView2Loader.dll','host\public\brand\firefly-shell-v3.ico','public\desktop-pet.html','public\live2d\vendor\live2dcubismcore.min.js','public\live2d\firefly\Moc_0.moc3','public\live2d\firefly\Textures_0_0.png')){
 if(!(Test-Path -LiteralPath (Join-Path $component $relative) -PathType Leaf)){throw ('组件文件缺失：'+$relative)}
}
$manifest=Get-Content -LiteralPath (Join-Path $component 'component.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if($manifest.product -ne 'firefly-dsh-plugin-windows' -or $manifest.version -ne '0.1.0'){throw '组件版本不兼容。'}
# Verify only the small desktop component, never a DSH/Python installation.
foreach($row in $manifest.files){
 $file=[IO.Path]::GetFullPath((Join-Path $component $row.path))
 if(!$file.StartsWith($component.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw '组件清单路径无效。'}
 if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $row.sha256){throw ('组件校验不一致：'+$row.path)}
}
$dotnet=Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full' -ErrorAction SilentlyContinue
if(!$dotnet -or $dotnet.Release -lt 528040){throw '需要 .NET Framework 4.8。请从微软安装；本脚本不会自动安装运行库。'}
$settings=if($SettingsRoot){[IO.Path]::GetFullPath($SettingsRoot)}else{Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Firefly\DSH'}
New-Item -ItemType Directory -Path $settings -Force | Out-Null
$file=Join-Path $settings 'components.json'
$value=@{}
if(Test-Path -LiteralPath $file){$old=Get-Content -LiteralPath $file -Raw -Encoding UTF8 | ConvertFrom-Json;foreach($p in $old.PSObject.Properties){$value[$p.Name]=$p.Value};Copy-Item -LiteralPath $file -Destination ($file+'.backup-'+(Get-Date -Format 'yyyyMMdd-HHmmssfff'))}
$value.componentRoot=$component
if($VoiceRoot){$voice=(Resolve-Path -LiteralPath $VoiceRoot).Path;if(!(Test-Path -LiteralPath (Join-Path $voice 'voice.json'))){throw '声音组件缺少 voice.json。'};$value.voiceRoot=$voice}
if($VoiceOrigin){$uri=[uri]$VoiceOrigin;if($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1' -or $uri.AbsolutePath -ne '/'){throw '声音接口必须为本机 http://127.0.0.1:端口。'};if(!$value.voiceRoot){throw '声音接口需配套 voiceRoot 中的参考音频清单。'};$value.voiceOrigin=$uri.GetLeftPart([UriPartial]::Authority)}
[IO.File]::WriteAllText($file,($value | ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
Write-Host '流萤桌宠组件已配置。现在可让 DSH 检查并安装流萤插件。'
Write-Host '未安装或启动任何 DSH、Python、声音权重；没有修改系统环境变量。'
Write-Host '还需要 Microsoft Edge WebView2 Evergreen Runtime；缺少时请使用微软官方安装程序。'
