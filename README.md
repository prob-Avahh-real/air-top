# 空气陀螺 Air Top

用空中手势抽打虚拟陀螺：智能戒指调倾角与款式，智能手杖抽打与点地。Capacitor 打包为手机 App，并适配手表小屏。

## 功能

- **陀螺款式**：木质 / 金属 / 霓虹 / 琉璃（摩擦与惯量不同）
- **物理模拟**：转速衰减 · 倾角摇摆 · 过慢或过倾则倒下
- **Web Audio**：转速驱动的嗡鸣与抽打音效
- **可穿戴输入**
  - 戒指：左右调倾角 · 上下切换款式 · 甩动静音
  - 手杖：挥动抽打加速 · 敲击点地补速
- **触控兜底**：抽打 / 点地 / 扶正按钮 · 滑动调倾角
- **手表适配**：`max-width: 280px` 或 `max-height: 300px` 紧凑布局

## 项目结构

```
air-top/
├── protocol/air-top.json   # 手势与陀螺协议
└── mobile/
    ├── index.html
    ├── capacitor.config.json
    ├── package.json
    ├── scripts/build-web.js
    ├── src/
    │   ├── app.js              # UI 与手势路由
    │   ├── audio-engine.js     # 嗡鸣与抽打音
    │   ├── tops.js             # 陀螺款式
    │   ├── physics.js          # 转速 / 倾角 / 倒下
    │   └── wearable-input.js   # 戒指 / 手杖
    └── test/
```

## 快速开始

```bash
cd mobile
npm install
npm run build          # → www/
npm test
```

浏览器预览：

```bash
npx serve www
```

## 在线 Demo

本仓库目前为 **private**，GitHub Free 无法直接开 Pages。可玩 Demo 挂在个人 IP 站点子路径：

- **Demo**：https://prob-avahh-real.github.io/personal-ip/air-top/
- **个人 IP 入口**：https://prob-avahh-real.github.io/personal-ip/（作品集 · 空气陀螺）

同步方式：在 `mobile/` 跑 `npm run build`，把 `www/` 拷到 `personal-ip/public/air-top/` 后推送 personal-ip。若仓库改为 public，可用 `.github/workflows/pages.yml` 单独发布。

## 打包 Android / iOS

```bash
cd mobile
npm install
npx cap add android    # 或 ios
npm run mobile:android
# 或 npm run mobile:ios
```

日常：改 `src/` 或 `index.html` → `npm run build` → `npx cap sync android` → 真机运行。

### iOS 云端构建（A 方案，不占本机 Xcode 空间）

仓库已提供 GitHub Actions 工作流：`.github/workflows/ios-cloud-build.yml`。

1. 把代码推到 GitHub。
2. 打开仓库 **Actions** 页，选择 **iOS Cloud Build**。
3. 点击 **Run workflow**。
4. 构建完成后在本次任务的 **Artifacts** 下载 `airtop-ios-cloud-smoke`。

说明：
- 这是“云端烟测包”流程（会产出 `Release-iphoneos` 的 `.app` 与构建日志），用于验证 Capacitor+iOS 工程可在云端通过编译。
- 要分发到 iPhone（TestFlight/Ad Hoc）仍需要签名证书与描述文件，建议在此基础上接入 Fastlane Match 或 Xcode Cloud 完成签名与上传。

## 手势对照

| 设备 | 动作 | 效果 |
|------|------|------|
| 戒指 | 左右倾 > 5° | 向左/右增加倾角 |
| 戒指 | 上下倾 > 5° | 上一/下一款式 |
| 戒指 | 甩动 > 20° | 切换静音 |
| 手杖 | 挥动 > 3 | 抽打加速 |
| 手杖 | 加速度尖峰 > 8 | 点地补速 |

桌面调试：空格抽打，`T` 点地，`R` 扶正，`←` `→` 倾角，`↑` `↓` 换款，`M` 静音。
