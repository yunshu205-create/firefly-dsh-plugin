# 0.1.0 定向安装验收

日期：2026-10-28。仅核对本次分享整理相关的安装、路径、基本连接和移除；不重跑旧搜索、语音或压力回归。

| 检查 | 实际结果 |
|---|---|
| DSH格式 | 已装DSH 0.2.0-rc.2 / Cordis4.0.4；真实package.json的dsh.bundle.patch和YAML插入行被宿主识别 |
| 安装 | 新独立Profile，DSH官方runPluginCommand/operations调用现有pnpm离线安装交付tgz，退出0；增加一个插件依赖，没有新增DSH、Node或Python |
| 管理器识别 | pluginManager.listBundles列出firefly-dsh-plugin，enabled=true、removable=true，无加载错误 |
| 独立Windows组件 | 普通ZIP解压到新的中文、空格目录；无junction或开发机资源引用。辅助脚本校验该小组件清单通过，未重校验原数万语音文件 |
| 打开 | 最终ZIP内Open脚本发现宿主连接、启动EXE；模型加载、窗口及托盘创建有真实日志。用户确认“桌宠和聊天正常”，包括角色可见、透明和收到回复 |
| 基本聊天 | 真实宿主DSH Agent处理用户发出的安装检查消息；22个流式片段、1次模型调用、无搜索。没有启动旧独立版Agent |
| 停用 | DSH管理器setBundleEnabled(false)返回application=applied；桌宠关闭，原DSH进程仍响应，资料保留 |
| 重新启用 | DSH管理器setBundleEnabled(true)返回applied；使用最终普通解压组件连接。中间为更新测试夹具正常重启过一次隔离Profile，不是插件停用导致宿主退出 |
| 移除 | 同一宿主中removeBundle返回applied、pnpm退出0，插件从依赖及bundle列表移除；桌宠进程退出。宿主进程1748仍在，SDK基础bundle与其它服务保留，随后另发状态请求确认仍能响应 |
| 保留数据 | 移除前后记忆、会话、人格、世界观及规则文件SHA256逐一比对，不删除用户资料 |
| 无私人文件 | 上传目录由显式白名单建立；不含.local、凭据适配器、账号授权、个人会话、记忆、日记、微信凭据、语音权重或开发机node_modules |

## 实际发现的问题

- Windows自带PowerShell5.1误读无BOM中文脚本；改为UTF8 BOM。随后发现UTF8 JSON清单中的中文路径也需显式Encoding UTF8读取，一并修复。最终ZIP脚本已实际配置成功。
- 最初资源组合遗漏宿主硬性读取的public/brand/firefly-shell-v3.ico，产生DirectoryNotFoundException；补齐该文件并纳入前置检查与组件清单。沿用原EXE，没有重做桌宠。
- 测试夹具的空YAML最初不是数组，修正为[]；为加入管理器重新启用操作，正常重启过隔离Profile一次。均保留本机失败证据，不计为产品功能通过。

## 尚未宣称通过

- 未上传GitHub，因此未测试从公开URL真实下载、Git网络认证或朋友电脑安装。已验证本地发布tgz经同一DSH包管理实现安装。
- 仅本机当前DSH版本；不保证任意旧版/新版兼容。当前测试会话继承开发工具权限，普通权限干净Windows仍待验证。
- 系统TTS默认与既有角色声音适配代码保留，本轮按要求不重复听音/搜索/压力测试；没有把旧结果改写为本轮通过。
- 公开角色资源分发许可仍未全部取得依据；MIT原创代码授权不能替代模型/美术或Cubism条款。
- 更新安装说明已准备，但本轮没有额外执行跨版本升级。

小型tgz在定向验收后只更新文档和经用户确认的MIT许可；运行源码与已安装测试版本逐文件一致，具体摘要见交付根目录核验清单。没有执行第二轮功能回归。
