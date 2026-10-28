# 安装、升级与移除

## 首次安装（Windows x64）

1. 已安装并配置好DSH。目前实际验证版本为DSH 0.2.0-rc.2 / Cordis 4.0.4。需要Windows 10/11 x64、.NET Framework 4.8及Microsoft Edge WebView2 Evergreen Runtime。依赖缺少时使用微软官方安装程序；流萤不会自动安装系统组件或申请管理员权限。
2. 从本仓库Releases下载匹配版本的 `Firefly-Windows-0.1.0.zip`，解压到自己选择的固定目录。它包含EXE、WebView2桥接DLL、页面、Live2D模型/贴图/动作和必要脚本，没有DSH、Node、Python或语音模型。**当前本地资源包仍有授权待核对项，发布状态见DISTRIBUTION.md。**
3. 检查脚本后运行组件目录中的 `Configure-Windows.cmd`。它只校验此小型组件，写入当前用户的 `LocalAppData/Firefly/DSH/components.json`，保留旧配置备份，不复制大文件、不改DSH配置。脚本执行策略若阻止运行，请让自己的DSH检查脚本并协助按组织策略执行；不要关闭系统保护。
4. 把仓库URL或下载的 `firefly-dsh-plugin-0.1.0.tgz` 交给DSH，让它先检查包名、版本、bundle、依赖和权限，再由你确认安装到所选Profile。本机验证了本地tgz经DSH插件管理底层接口安装；**未上传GitHub前，不能声称GitHub网络安装已实测。**
5. 启用插件后运行组件目录中的 `Open-Firefly.cmd`，或让DSH在用户确认后运行该脚本。它只寻找已启用的插件连接并打开桌宠，不启动DSH。没有连接会明确报错。多个Profile同时启用时，用 `tools/Open-Firefly.ps1 -Data <该Profile的firefly-data目录>` 明确选择。

DSH插件管理服务/插件页支持inspect检查包；0.2.0-rc.2的`plugin_manager`工具action包括list_bundles、install_bundle、set_bundle、remove_bundle，安装地址/包名放在target字段。inspect不是该工具的action值。是否提供Agent工具和是否实时重载由宿主Profile决定；工具通常由Creator预设提供并要求本次操作审批。CLI共享同一包管理实现，但不能假设任意DSH都有PATH中的dsh/pnpm。无HMR的Profile需重启该Profile后生效，运行中移除可能返回stop-profile；请按DSH提示正常停止该Profile后移除，不强杀其它DSH进程。

## 声音

未配置角色声音时默认使用Windows系统朗读，聊天和桌宠不需要Python。中文声音由系统已安装的语音决定。角色声音复用用户已有、受信任的流萤语音组件：运行 `Configure-Windows.ps1 -VoiceRoot <含voice.json的目录>`；已有GPT-SoVITS服务可再指定 `-VoiceOrigin http://127.0.0.1:<端口>`，同时提供该服务机器本地可读的参考音频清单。当前适配的是GPT-SoVITS API v2 `/tts`，不是所有TTS协议。

不提供接口地址时，只有用户启用角色声音且请求朗读时才按需启动该声音组件。缺少资源、内存不足或生成失败时保留文字和系统语音回退；自启动的模型闲置10分钟释放。插件不会停止用户原先运行的外部语音服务。仓库和本轮Windows组件不包含音频权重。

## 数据与权限

默认资料目录是当前DSH Profile目录中的 `firefly-data`，与包目录分离；可在DSH对firefly-companion行的config.data中另设目录。里面保存流萤自己的会话、确认记忆、日记和窗口状态。首次启用创建空记忆和初始角色文本；升级不覆盖这些资料。模型连接完全由宿主DSH管理，流萤没有API Key输入或凭据迁移步骤。

安装属于受信任的宿主插件：代码在DSH Node进程权限域中运行，**不是安全沙箱**。需要创建本地资料、回环HTTP服务、启动受控桌宠及可选语音子进程；不申请管理员权限。当前流萤会话仅开放已有网页工具，任意命令/文件工具和自动记忆工具不在此次最小版本开放范围。普通DSH会话不注入流萤人格。网页资料不作为指令或记忆。

## 升级

先关闭桌宠，在DSH插件管理中停用流萤；备份该Profile的firefly-data。确认新组件版本/校验值与插件匹配，将新组件解压到新目录，再运行其Configure脚本。它会备份原组件位置配置。由DSH升级插件包并重新启用。不要覆盖DSH运行时、凭据文件或直接删除旧组件。本轮未宣称自动更新或跨版本升级已验收。

## 停用与卸载

- 仅关闭桌宠：右键菜单退出，或 `tools/Open-Firefly.ps1 -Close`。DSH继续运行。
- 停用：使用DSH插件管理将firefly-dsh-plugin bundle设为禁用。启用HMR时应关闭本插件窗口和自有语音进程；无HMR按宿主提示重载。保留数据和包依赖。
- 移除：通过DSH插件管理的remove_bundle移除 `firefly-dsh-plugin`。无HMR时先正常停止该Profile。只移除该依赖，不删除DSH配置、原有插件、凭据或firefly-data。
- Windows组件只是一份可移动目录。停用后，用户可自行删除**自己解压的组件目录**。脚本不递归删除数据，不自动移除系统WebView2/.NET。
- 需要恢复时，重新启用原包，恢复components.json备份指向原组件；原firefly-data仍在。删除私人数据必须由用户单独、明确决定，插件卸载不会代办。
