# 🧸 宝宝小游戏 · Baby Games

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

给 2 岁左右宝宝玩的网页小游戏。纯静态 HTML/CSS/JavaScript，无需安装、无广告、无外链，手机、平板、电脑浏览器都能打开。

**在线试玩：<https://ml4u417-tech.github.io/>**

[English](#english)

## 游戏

| 游戏 | 路径 | 玩法 |
| --- | --- | --- |
| 🐶 宝宝点点乐 | [`tap/`](tap/) | 点一点大大的小动物，会跳一跳、冒泡泡，并用中文说出名字和叫声。 |
| 🗣️ 宝宝学说话 | [`talk/`](talk/) | 看图听词、跟着说，说完有表扬和彩纸。家长可开启麦克风互动（只检测音量，不录音、不保存）。 |

另有实验性页面 [`robot/`](robot/)：手机四驱机器人的蓝牙控制页（需安卓 Chrome + Web Bluetooth），与宝宝游戏无关。

## 特点

- **零依赖**：每个游戏都是单个 `index.html`，不需要构建工具或后端。
- **中文语音**：使用浏览器自带的语音合成（Web Speech API `speechSynthesis`），效果取决于设备的语音引擎。
- **音效**：用 Web Audio API 现场合成，不需要额外的音频文件。
- **隐私友好**：没有统计和第三方请求；家长设置只保存在本机浏览器（`localStorage`）。麦克风仅用于检测音量。
- **家长设置**：游戏右上角的小按钮长按 2 秒打开，防止宝宝误触。

## 本地运行

```bash
git clone https://github.com/ml4u417-tech/ml4u417-tech.github.io.git
cd ml4u417-tech.github.io
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/
```

也可以直接双击 `index.html` 打开；但麦克风等功能通常要求 `localhost` 或 HTTPS 环境，建议用上面的本地服务器。

## 参与贡献

欢迎提交 Issue 和 Pull Request！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE) © 2026 ml4u417-tech

---

<a id="english"></a>
## English

Simple web games for toddlers (around 2 years old). Pure static HTML/CSS/JavaScript: no install, no ads, no external links. Works in mobile, tablet and desktop browsers. The UI and voice are in Chinese.

**Live demo: <https://ml4u417-tech.github.io/>**

### Games

- **🐶 Tap & Play** (`tap/`) — tap big animals; they bounce, make bubbles, and say their names and sounds in Chinese.
- **🗣️ Learn to Talk** (`talk/`) — look at a picture, hear the word, say it back, and get praise and confetti. Parents can enable an optional microphone mode (volume detection only; nothing is recorded or stored).
- `robot/` is an unrelated experimental Web Bluetooth control page for a phone robot (Android Chrome).

### Features

- Zero dependencies — each game is a single `index.html`.
- Chinese text-to-speech via the browser's Web Speech API; quality depends on the device.
- Sound effects synthesized with the Web Audio API.
- No analytics or third-party requests; parent settings stay in `localStorage`.
- Parent settings: long-press the small button at the top-right for 2 seconds.

### Run locally

```bash
git clone https://github.com/ml4u417-tech/ml4u417-tech.github.io.git
cd ml4u417-tech.github.io
python3 -m http.server 8000
# open http://localhost:8000/
```

### Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

### License

[MIT](LICENSE) © 2026 ml4u417-tech
