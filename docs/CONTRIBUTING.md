# 贡献指南

感谢你对 Nexusmods-Localization 的关注！以下是参与贡献的方式和规范。

---

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [提交规范](#提交规范)
- [语言包规范](#语言包规范)
- [问题反馈](#问题反馈)

---

## 行为准则

- 友善、尊重、建设性
- 翻译应准确、通顺，避免机翻腔
- 不提交含攻击性、歧视性内容的翻译

---

## 如何贡献

### 翻译贡献（最常见）

1. Fork 本仓库
2. 复制 `locales/zh-CN.js` 作为模板，重命名为你的语言代码（如 `locales/ja.js`）
3. 翻译所有词条（**不要修改键名，只修改值**）
4. 提交 Pull Request

### 代码贡献

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m "feat: 简短描述"`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### Bug 反馈

在 [Issues](https://github.com/yourusername/Nexusmods-Localization/issues) 页面提交，请包含：

- Nexus Mods 页面 URL
- 浏览器 + 油猴版本
- 预期行为 vs 实际行为
- 截图（如有）

---

## 开发流程

### 本地测试

1. 安装 Tampermonkey
2. 修改 `nexusmods-localization.user.js` 中的 `@require` 路径指向本地文件（或直接把所有源码合并进一个脚本）
3. 在 Tampermonkey 中安装修改后的脚本
4. 访问 Nexus Mods 网站测试

### 文件结构

```
src/core.js           → 翻译引擎，不要修改语言包数据
src/date-localizer.js → 日期模块，只改白名单选择器
locales/xx.js         → 语言包，只包含翻译数据
```

**核心原则**：引擎代码与翻译数据严格分离。

---

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat:` | 新功能 | `feat: 添加日语语言包` |
| `fix:` | Bug 修复 | `fix: 修复详情页评论区误翻译` |
| `locale:` | 翻译相关 | `locale: 更新 zh-CN 首页词条` |
| `refactor:` | 重构 | `refactor: 优化 DOM 遍历性能` |
| `docs:` | 文档 | `docs: 更新贡献指南` |

---

## 语言包规范

详见 [LOCALE_GUIDE.md](LOCALE_GUIDE.md)，核心要点：

1. **键名必须与英文原文完全一致**（含大小写、标点、空格）
2. **不要在语言包中添加日期正则**——日期由 `date-localizer.js` 独立处理
3. **`_conf.routes`** 可以根据语言习惯调整（通常直接复制 `zh-CN.js` 的即可）
4. 条目按功能分组，每组之间用注释分隔
5. 值为空字符串 `''` 表示该词条暂不翻译（保持原文显示）

---

## 问题反馈

- [GitHub Issues](https://github.com/yourusername/Nexusmods-Localization/issues)
- 提交前请先搜索是否已有相同问题
