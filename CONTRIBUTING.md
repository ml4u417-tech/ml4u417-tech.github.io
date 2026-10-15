# 贡献指南 · Contributing

感谢你愿意改进宝宝小游戏！ / Thanks for helping improve Baby Games!

## 中文

### 报告问题 / 提建议
- 使用 [Issue 模板](../../issues/new/choose) 提交 Bug 或新功能建议。
- 报 Bug 时请写明设备、系统、浏览器版本和复现步骤。

### 提交代码
1. Fork 本仓库，从 `main` 新建分支（如 `feat/new-animal`）。
2. 用 `python3 -m http.server 8000` 本地运行并测试，至少在一种手机浏览器上试过。
3. 提交 Pull Request，说明改了什么、为什么改，最好附截图。

### 原则
- **保持零依赖**：纯 HTML/CSS/JS，不引入构建工具、框架或第三方 CDN。
- **宝宝友好**：大按钮、无广告、无外链、不收集数据；家长功能要防误触。
- **隐私第一**：不上传任何数据，麦克风等权限只在本地使用。
- 你提交的贡献将按 [MIT 许可证](LICENSE) 授权。

## English

### Issues
- Use the [issue templates](../../issues/new/choose) for bugs and feature requests.
- For bugs, include device, OS, browser version and steps to reproduce.

### Pull requests
1. Fork the repo and branch from `main` (e.g. `feat/new-animal`).
2. Test locally with `python3 -m http.server 8000`, ideally on at least one mobile browser.
3. Open a PR describing what and why, with screenshots if possible.

### Principles
- Zero dependencies: plain HTML/CSS/JS, no build step, frameworks or third-party CDNs.
- Toddler-friendly: big targets, no ads, no external links, no data collection; parent features guarded against accidental taps.
- Privacy first: nothing leaves the device.
- Contributions are licensed under the [MIT License](LICENSE).
