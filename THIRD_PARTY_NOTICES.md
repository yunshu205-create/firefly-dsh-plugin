# 第三方出处与授权范围

本项目为《崩坏：星穹铁道》流萤角色的非官方同人软件，与米哈游及下述作者无隶属或背书关系。原创代码MIT不包含第三方角色、模型、图片、商标或运行库。

## Live2D 模型、贴图、动作与表情

- 沿用现有流萤客户端的 `public/live2d/firefly/`，包括Moc_0.moc3、Textures_0_0.png、模型配置、物理配置、动作及表情JSON。
- 现有素材来源记录：[hhjk21/Firefly-Companion-AI-](https://github.com/hhjk21/Firefly-Companion-AI-) 的 `resources/live2d/firefly/`。上游README明确将模型来源署名为B站UP主 **是依七哒**，并区分代码MIT与角色/模型权益，注明个人学习交流、禁止商用。
- 发布者提供的公开来源：[ComputerNebuilirion/QwenFireflyNeko](https://github.com/ComputerNebuilirion/QwenFireflyNeko)。该项目README说明开源学习、娱乐用途，并链接模型作者的 [流萤前瞻小人模型](https://www.bilibili.com/video/BV1kJ4m1g7fs/)。保留作者 **是依七哒** 署名；本发行按个人学习、娱乐及非商用范围提供，不授予模型MIT授权或商业用途授权。

## 图片、背景与图标

- `public/assets/character.webp`、`boot.png`、`wallpaper.jpg`继承现有客户端；素材说明记录了 [dsh-theme-firefly](https://github.com/Liu-ZA-81/dsh-theme-firefly)、[dsh-firefly-spring-skin](https://github.com/kang200862/dsh-firefly-spring-skin)、[StarRailRes](https://github.com/Mar-7th/StarRailRes) 等来源。发布者于2026-10-29明确确认，允许非商用公开随包发布的授权覆盖这三份文件。此范围以发布者确认为依据，不以仓库代码MIT替代，也不将这些图片标成MIT。
- `public/brand/`中的流萤应用图标为现有项目于2026-10-25通过imagegen生成、参考已有角色立绘的非官方同人图标；保留角色权利归属，不声称获得官方背书。

## 运行库

- **Microsoft WebView2 SDK桥接DLL/Loader**：Windows组件保留 `licenses/WEBVIEW2-LICENSE.txt`。WebView2 Runtime本身不包含在此包内，用户依微软官方说明安装。
- **PixiJS 6.5.10**：保留原文件MIT标识及 `licenses/PIXI-LICENSE.txt`，上游 [pixijs/pixijs](https://github.com/pixijs/pixijs)。
- **pixi-live2d-display**：保留 `licenses/PIXI-LIVE2D-LICENSE.txt`，上游 [guansss/pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)。
- **Live2D Cubism Core**：Copyright Live2D Inc.，为专有组件，非MIT。组件内原文件头保留可再分发代码标识与 [Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html) 链接。另须遵守适用的 [SDK Release License](https://www.live2d.com/en/sdk/license/) 条件。
- **DSH/Cordis**：仅声明宿主兼容版本和peer依赖，不复制其运行时。

## 语音

不分发GPT-SoVITS、Python、权重或参考音频。默认使用Windows已安装系统朗读；可配置用户自己合法持有的角色声音环境。

## 冻结附件说明

v0.1.0两个程序附件沿用已验证原始文件，没有重新打包。Windows ZIP中准备阶段的素材README、licenses/DISTRIBUTION.md及component.json分发核对字段为历史快照；本次发行的最新出处、确认范围以本文件及GitHub Release说明为准。该核对字段不参与程序启动判断。再分发时请同时保留本说明与各运行库原有许可证。
