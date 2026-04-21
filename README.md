# Nexusmods-Localization

> 为 [Nexus Mods](https://www.nexusmods.com/) 网站提供多语言界面本地化的油猴脚本。  
> 内置简体中文，支持通过标准接口添加任意语言包。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> ⚠️ **声明**：本项目代码由 AI 辅助生成，经人工审核后发布。

---

## 特性

- **模块化架构**：翻译引擎 / 日期本地化 / 语言包三层完全解耦
- **日期安全**：日期转换严格限定在 `<time>` 等语义元素内，**不会**误伤游戏名称（如 `Nioh 3` 不会变成 `01-03`）
- **动态页面支持**：通过 `MutationObserver` 实时翻译异步加载内容
- **Shadow DOM 支持**：拦截 `attachShadow`，覆盖 Web Components 内的文本
- **SPA 路由感知**：Hook `history.pushState`，切换页面后自动重载对应词典
- **多语言切换**：油猴菜单一键切换，设置持久保存
- **开放接口**：第三方可注入自定义语言包，无需修改本脚本

---

## 安装

### 前提

安装 [Tampermonkey](https://www.tampermonkey.net/)（推荐）或 Violentmonkey。

### 一键安装（推荐）

点击以下链接，油猴会弹出安装确认页：

```
https://raw.githubusercontent.com/saiyajiang/Nexusmods-Localization/main/nexusmods-localization.user.js
```

### 手动安装

1. 打开 Tampermonkey 管理面板 → **新建脚本**
2. 将 `nexusmods-localization.user.js` 的内容复制粘贴进去
3. 保存，刷新 Nexus Mods 页面

---

## 使用

安装后访问 Nexus Mods，界面会自动翻译为简体中文。

### 油猴菜单

点击浏览器工具栏的 Tampermonkey 图标，可看到：

| 菜单项 | 说明 |
|--------|------|
| `✓ zh-CN` | 当前激活的语言（带勾号） |
| `日期本地化：开启 ✓` | 切换日期格式转换开关 |

切换后页面自动刷新生效。

---

## 项目结构

```
Nexusmods-Localization/
├── nexusmods-localization.user.js   # 油猴主入口脚本
├── src/
│   ├── core.js                      # 翻译引擎（路由/词典/DOM监控）
│   └── date-localizer.js            # 日期本地化模块（白名单隔离）
├── locales/
│   └── zh-CN.js                     # 简体中文语言包
├── docs/
│   ├── CONTRIBUTING.md              # 贡献指南
│   └── LOCALE_GUIDE.md              # 语言包制作指南
├── LICENSE
└── README.md
```

---

## 添加新语言 / 自定义翻译

### 方式一：独立脚本注入（推荐，无需 fork）

新建一个油猴脚本，`@run-at document-start`，并在 `NexusLocales` 上挂载你的语言包：

```javascript
// ==UserScript==
// @name         Nexusmods-Localization: 日本語
// @match        https://www.nexusmods.com/*
// @run-at       document-start
// ==UserScript==

window.NexusLocales = window.NexusLocales || {};
window.NexusLocales['ja'] = {
  _conf: {
    routes: [
      ['^/$', 'home'],
      ['/mods/\\d+', 'mod_detail'],
      // ... 其余路由同 zh-CN.js
    ],
  },
  public: {
    'Download': 'ダウンロード',
    'Upload':   'アップロード',
    // ...
  },
  mod_detail: {
    'About this mod': 'このModについて',
    // ...
  },
};
```

然后在本脚本的油猴菜单中切换到 `ja` 即可。

### 方式二：Fork 并提交 PR

参见 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)。

---

## 日期本地化说明

本项目对原项目的日期处理做了**根本性重构**，解决了原版的一个重大 BUG：

> **原版问题**：对整个 DOM 进行正则扫描，导致游戏名 `Nioh 3` 被误识别为月份缩写 `Nov` + 数字 `3`，渲染成 `01-03`。

**本项目的解决方案：**

日期转换**只作用于**被 CSS 选择器白名单明确标记的时间戳容器：

```
time, [data-date], [data-timestamp],
.uploaded-time, .last-updated time,
td.table-date, .notification-time ...
```

游戏标题、Mod 名称、用户内容区域全部在黑名单内，**绝不触碰**：

```
.mod-title, h1.game-name, .game-title, a.mod-name,
.mod_description_container, .prose-lexical.prose ...
```

如果发现某个区域被误转换，可在另一个脚本中调用：

```javascript
window.NexusDateLocalizer.addIgnoreSelectors('.your-custom-selector');
```

---

## 许可证

[MIT](LICENSE) © Nexusmods-Localization Contributors
