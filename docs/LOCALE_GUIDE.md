# 语言包制作指南

本文档说明如何为 Nexusmods-Localization 创建一个新的语言包。

---

## 快速开始

### 1. 复制模板

```bash
cp locales/zh-CN.js locales/你的语言代码.js
```

常见语言代码：

| 代码 | 语言 |
|------|------|
| `zh-CN` | 简体中文 |
| `zh-TW` | 繁体中文 |
| `ja` | 日语 |
| `ko` | 韩语 |
| `fr` | 法语 |
| `de` | 德语 |
| `es` | 西班牙语 |
| `pt-BR` | 巴西葡萄牙语 |
| `ru` | 俄语 |

### 2. 修改文件头

将 `zh-CN` 替换为你的语言代码：

```javascript
const zhCN = { ... };   // 改为：const ja = { ... };
// ...
global.NexusLocales['zh-CN'] = zhCN;  // 改为：global.NexusLocales['ja'] = ja;
```

### 3. 翻译词条

**只修改冒号右边的值，不要修改左边的键名。**

```javascript
// ✅ 正确
'Download': 'ダウンロード',

// ❌ 错误——修改了键名，会导致匹配失败
'下载': 'ダウンロード',

// ❌ 错误——键名大小写不一致
'download': 'ダウンロード',
```

---

## 语言包结构

一个完整的语言包包含以下部分：

```javascript
const xx = {
  // ── 引擎配置 ──
  _conf: {
    routes: [ /* 路由规则 */ ],
  },

  // ── 全站通用词条 ──
  public: {
    'Search': '搜索',
    'Download': '下载',
    // ...
  },

  // ── 页面专用词条（可选，按需添加）──
  home: { ... },
  mod_detail: { ... },
  mod_list: { ... },
  user_profile: { ... },
  collection_detail: { ... },
  collection_list: { ... },
  game_detail: { ... },
  search: { ... },
  premium: { ... },
  account: { ... },
  upload: { ... },
};
```

### `_conf`（引擎配置）

通常直接复制 `zh-CN.js` 中的即可，除非你需要：

- 添加新的路由规则（对应新发现的页面类型）
- 修改忽略选择器

### `public`（全站通用）

**必须提供**。这些词条会在所有页面加载，用于导航栏、通用按钮、状态文字等。

### 页面专用词条（可选）

键名对应 `_conf.routes` 中的页面类型标识。不需要的页面类型可以省略。

- 只包含该页面**特有**的词条
- 公共词条不需要重复
- 如果某个页面不需要额外翻译，可以留空 `{}` 或不写

---

## 翻译注意事项

### 1. 保持原文格式

```javascript
// 英文原文含省略号
'Loading...': '読み込み中…',    // ✅ 保留省略号
'Loading...': '読み込み中',      // ❌ 丢失了省略号

// 英文原文含冒号
'Time range:': '时间范围：',     // ✅ 保留冒号（可转全角）
```

### 2. 括号规范

中文环境使用全角括号 `（）`：

```javascript
'Anime (14)': 'Anime（14）',     // ✅
'Anime (14)': 'Anime (14)',      // ❌ 半角括号不协调
```

### 3. 不翻译的内容

以下内容**不应翻译**：

- 品牌名：`Nexus Mods`, `Vortex`, `NMM`
- 游戏名：`Skyrim`, `Fallout 4`, `Nioh 3`
- 专有名词：`FOMOD`, `Nexus Mod Manager`
- 技术术语：`MD5`, `API`

```javascript
'MD5 hash': 'MD5 校验值',         // ✅ MD5 不翻译
'FOMOD installer': 'FOMOD 安装包', // ✅ FOMOD 不翻译
```

### 4. 暂不翻译的词条

如果某条暂时不确定如何翻译，可以留空字符串，引擎会保持原文显示：

```javascript
'Some unclear term': '',  // 将显示原文 "Some unclear term"
```

---

## 日期本地化

**语言包中不包含日期翻译逻辑。** 日期转换由 `date-localizer.js` 独立模块处理。

如果你的语言需要不同的日期格式，目前有两种方式：

### 方式 A：修改 date-localizer.js（需提交 PR）

在 `convertDateString()` 函数中添加你语言的输出格式。

### 方式 B：禁用内置日期转换，自行处理

通过油猴菜单关闭日期本地化，然后在自己的脚本中实现。

---

## 测试你的语言包

1. 将你的语言包文件放到 `locales/` 目录
2. 修改 `nexusmods-localization.user.js` 的 `@require` 指向你的文件
3. 安装到 Tampermonkey
4. 逐一访问以下页面确认翻译效果：
   - 首页 (`/`)
   - 模组详情页 (`/mods/xxxx`)
   - 模组列表页 (`/mods`)
   - 用户主页 (`/users/xxxx`)
   - 合集页 (`/collections/xxxx`)
   - 搜索结果页 (`/search`)
   - 高级会员页 (`/premium`)

### 重点检查

- [ ] 导航栏是否正确翻译
- [ ] 按钮（下载/上传/搜索）是否正确
- [ ] 日期是否被正确格式化（且游戏名未被误伤）
- [ ] 用户评论区是否保持原文（不应被翻译）
- [ ] 下拉菜单 / 弹窗内的文案
- [ ] 油猴菜单中是否出现你的语言选项

---

## 提交

完成翻译后，请提交 Pull Request。模板：

```markdown
## 语言包：xx-XX

- 语言名称：
- 翻译覆盖率：约 xx%
- 测试页面：[列出已测试的页面]
- 已知问题：[如有]
```

感谢你的贡献！
