# air-top

空气陀螺 Air Top 用空中手势抽打虚拟陀螺：智能戒指调倾角与款式，智能手杖抽打与点地。Capacitor 打包为手机 App，并适配手表小屏。 功能 - **陀螺款式**：木质 / 金属 / 霓虹 / 琉璃（摩擦与惯量不同） - **物理模拟**：转速衰减 · 倾角摇摆 · 过慢或过倾则倒下 - **Web Audio**：转速驱动的嗡鸣与抽打音效 - **可穿戴输入** - 戒指：左右调倾角 · 上下切换款式 · 甩动静音 - 手杖：挥动抽打加速 · 敲击点地补速

## 用途与 Target 判定

空气陀螺：戒指调倾角、手杖抽打

- 移动端：需要
- 智能硬件：需要

## 目标平台

| 平台 | 方式 | 产出 |
|------|------|------|
| 🤖 Android | Capacitor → Gradle | APK |
| 🍎 iOS | Capacitor（若已加 ios/） | IPA |
| ⌚ 手表 | 窄屏 `@media (max-width:280px)` 等 | 同 App |
| 💍 智能戒指 | DeviceOrientation | 见实现 |
| 🦯 智能手杖 | DeviceMotion | 见实现 |

## 技术栈信号

- 检测到：capacitor, mobile/

## 命令

```bash
# 见 README
```

## 同步说明

原生工程变更后按各栈惯例同步（`cap sync` / `flutter build` / Gradle）。

## 智能硬件约定

- 戒指：DeviceOrientation（倾斜/摇动），注意 iOS 权限需在用户手势内请求
- 手杖：DeviceMotion（加速度尖峰=轻点，摆动=方向）
- 手表：`@media (max-width: 280px), (max-height: 300px)`
- 优先复用兄弟项目的 `wearable-input.js` / `air-shared`，避免再复制漂移

## 助手约束

- Loop：先定可验证 Done 与停止条件；每切片过验证环；失败回灌；详见 docs/LOOP_ENGINEERING.md
- Harness：遵循根 AGENTS「Harness Engineering」；Guide=本文件，Sensor=测试/CI；同类失误二次须沉淀规则或测试（棘轮）。详见 docs/HARNESS_ENGINEERING.md
- 遵循仓库根 `AGENTS.md`：通用性/扩展性、分阶段里程碑、默认双 Target（**仅当用途适合**）
- 可选 Target 未做时可搁置；不要为不适用形态硬加 APK/穿戴
- 改动保持聚焦；公共逻辑抽到 shared/`tools/`，禁止静默失败
