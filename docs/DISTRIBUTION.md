# 分发清单与发布门槛

本仓库、npm式插件包、Windows组件分别管理。不包含DSH运行时、Node、Python、GPT-SoVITS或数GB权重。`.local`、本机凭据适配器、个人配置和测试记录不进入上传目录。

| 项目 | 来源/当前证据 | 分发处理 |
|---|---|---|
| 流萤适配源码、WPF宿主源码 | 从现有流萤项目复用并修改；2026-10-28用户明确选择原创代码MIT | 原创代码使用MIT，第三方资源除外 |
| DSH / Cordis | 已安装宿主；包声明peer版本兼容性，不附带运行时 | 使用朋友自己的DSH。当前只验证0.2.0-rc.2 / Cordis4.0.4 |
| WebView2桥接DLL、Loader | 原项目WEBVIEW2-LICENSE.txt；微软BSD式分发通知 | Windows组件附原许可证；WebView2 Runtime本身不打包，用户按微软说明安装 |
| PixiJS 6.5.10 | 原JS内版权/MIT声明 | 保留原头部；补充上游LICENSE |
| pixi-live2d-display | guansss/pixi-live2d-display，原JS内MIT声明 | 保留原头部；补充上游LICENSE，实际本地构建版本待作者资料进一步确认 |
| Cubism Core Web | Live2D专有组件 | 不上传Git源码历史。公开资源包前须核对并满足Live2D Proprietary/SDK Release条件；不能按MIT处理 |
| 流萤立绘、背景、头像、Live2D模型/贴图/动作/表情 | 发布者提供QwenFireflyNeko作为模型公开来源，并于2026-10-29明确确认非商用公开随包范围覆盖三张静态图 | 保留是依七哒等出处和角色权益说明，按学习、娱乐、非商用及各自条款提供；不是MIT素材 |
| 参考音频、角色声音权重 | 之前用户确认自制/允许赠送 | 本轮不附带；按用户已有环境连接 |

已核对官方来源：

- WebView2分发：[Microsoft Learn](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution)
- Cubism Core专有分发说明：[Live2D SDK Manual](https://docs.live2d.com/en/cubism-sdk-manual/cubism-sdk-for-web/)
- SDK下载及许可入口：[Live2D](https://www.live2d.com/en/sdk/download/web/)
- PixiJS：[上游仓库](https://github.com/pixijs/pixijs)
- pixi-live2d-display：[上游仓库](https://github.com/guansss/pixi-live2d-display)

## v0.1.0发行记录

独立firefly-dsh-plugin仓库只提交审查后的源代码、脚本、说明和bundle配置。Windows组件和匹配tgz作为Releases资产，不进入Git历史。无自动下载/执行脚本，无postinstall/prepare钩子，不要求用户批准不透明的构建脚本。

已在发布者确认的账号 `yunshu205-create` 下创建同名公开源码仓库，未覆盖旧仓库。2026-10-29完成静态图确认；具体出处与范围见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。两个程序附件保持原始文件与SHA256，不重新构建。

第三方素材及Cubism Core不适用原创代码MIT，不能据此推断商业再分发权。请同时保留发布说明、THIRD_PARTY_NOTICES.md以及组件内已有的运行库许可证。冻结包内准备阶段的旧核对状态不作最新授权说明。
