# 流萤 / Firefly — DSH Windows 桌宠插件

让已有DSH的Windows用户使用流萤人格、透明Live2D桌宠、聊天气泡和可选角色声音。复用宿主Agent、模型配置和工具事件，不捆绑另一套DSH，不启动独立DeepSeek Agent。

**版本：0.1.0。已在DSH 0.2.0-rc.2中完成插件安装、透明桌宠、基本聊天、停用与移除验收。角色资源包公开发布仍以其单独授权确认结果为准。**

## 安装

1. 已安装并配置DSH；本轮只验证DSH 0.2.0-rc.2 / Cordis4.0.4、Windows x64。
2. 从Releases取得匹配版本的Windows组件，解压到自己选择的固定目录，检查并运行其中的 `Configure-Windows.cmd`。
3. 把仓库地址或发布的 `.tgz` 交给自己的DSH，先检查包和权限，再确认安装到所选Profile。不要给未知插件管理员权限。
4. DSH启用插件后，运行组件中的 `Open-Firefly.cmd` 打开桌宠。没有启动DSH时会明确提示，不会偷偷启动第二个后台。

插件包与Windows组件的正式下载入口：[v0.1.0 Release](https://github.com/yunshu205-create/firefly-dsh-plugin/releases/tag/v0.1.0)。资源未获准公开之前，Release可能尚未发布；请以页面实际附件为准。

完成Windows组件配置后，可把下面这段交给DSH：

```text
请在当前DSH Profile中检查并安装流萤插件：
https://github.com/yunshu205-create/firefly-dsh-plugin/releases/download/v0.1.0/firefly-dsh-plugin-0.1.0.tgz
先核对来源、bundle与权限，向我请求本次安装批准，再使用你实际具备的plugin_manager工具：
{"action":"install_bundle","target":"https://github.com/yunshu205-create/firefly-dsh-plugin/releases/download/v0.1.0/firefly-dsh-plugin-0.1.0.tgz","enabled":true}
我已解压Windows组件并运行Configure-Windows.cmd。请复用现有模型连接，不安装另一套DSH，不授予管理员权限。启用后由我运行Open-Firefly.cmd。
如果没有plugin_manager，请告诉我在当前版本的插件页完成安装，不要猜测不存在的命令或修改权限策略。
```

这是交给DSH的请求，不是Windows命令。0.2.0-rc.2的管理工具通常由创造者/Creator预设提供，其他预设默认可能关闭；也可使用DSH插件页。工具需要逐次审批，`inspect`是管理服务/界面能力，不是此版本`plugin_manager`工具的action值。

仅克隆源码仓库没有角色资源与EXE；Windows组件包含桌宠、WebView2桥接DLL、页面和Live2D依赖，不只是一个EXE。它不包含Node/Python/DSH或声音权重。微软.NET4.8与WebView2 Runtime需系统已安装；本项目不自动安装系统组件。

完整步骤、升级、数据位置与卸载：[安装说明](docs/INSTALL.md)。如果DSH不提供实时插件重载，按宿主提示重启相应Profile；不能假设所有版本都能自动安装Windows程序。

卸载时让DSH调用 `plugin_manager`，参数为 `{"action":"remove_bundle","target":"firefly-dsh-plugin"}`；停用使用 `{"action":"set_bundle","target":"firefly-dsh-plugin","enabled":false}`。没有HMR时遵照宿主提示正常停止该Profile后再移除。用户记忆、日记和聊天不会由卸载脚本删除。

## 声音与数据

没有GPT-SoVITS时默认系统朗读。已有受信任声音组件可通过Configure脚本指定；复用已运行的回环接口，不另起同一模型。角色语音生成失败保留系统语音回退。

API连接由DSH管理。本仓库没有密钥输入、复制账号授权或导入私人资料的步骤。首次启用创建空记忆；默认数据保存在当前Profile的 `firefly-data` 中，与插件文件分离。卸载保留这些资料。

## 安全边界

插件代码与DSH宿主共享进程权限，独立Profile不是安全沙箱。本版本启动已知桌宠及可选语音进程、访问本地组件/专用资料、监听经过认证的回环HTTP。桌宠只连接宿主Agent；关闭和卸载不退出DSH。当前流萤会话不开放任意本地命令/文件工具，网页内容按不可信资料处理。

## 开发与发布

- `src/`：现有DSH会话桥、HTTP/SSE、确认记忆API与声音适配。
- `desktop/`：复用的WPF/WebView2透明宿主源码；`ui/`：原生音频桥覆盖文件。
- `resources/`：初始人格、世界观及行为规则，不含私人记忆。
- `tools/`：可审查的本机组件配置及附着启动脚本，无安装生命周期钩子。
- `.gitignore`：排除用户数据、开发profile、凭据适配器、EXE/DLL、资源包及本机日志。

使用现有DSH的插件管理接口，兼容范围和实测见 [验证记录](docs/VERIFICATION.md)。发布文件分为源码仓库、小型插件tgz、Windows资源ZIP，不提交数GB语音模型。原创代码MIT，第三方素材及Cubism Core不适用该MIT授权；许可证与素材出处见 [分发清单](docs/DISTRIBUTION.md)、[LICENSE.md](LICENSE.md)。
