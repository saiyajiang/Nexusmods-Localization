// ==UserScript==
// @name         Nexusmods Localization
// @name:zh-CN   Nexus Mods 多语言本地化
// @namespace    https://github.com/saiyajiang/Nexusmods-Localization
// @version      1.0.0
// @description  Localization support for Nexus Mods. Built-in Simplified Chinese. Supports custom language packs via the NexusLocales interface.
// @description:zh-CN  Nexus Mods 网站多语言本地化，内置简体中文，支持自定义语言包接口
// @author       Nexusmods-Localization Contributors
// @license      MIT
// @homepageURL  https://github.com/saiyajiang/Nexusmods-Localization
// @supportURL   https://github.com/saiyajiang/Nexusmods-Localization/issues
// @match        https://www.nexusmods.com/*
// @match        https://nexusmods.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @antifeature  adult-content 此脚本运行于包含成人内容的网站（Nexus Mods）
//
// 原项目参考：https://github.com/SychO3/nexusmods-chinese (v0.2.2, MIT License)
//
// ==UserScript==

/**
 * Nexusmods-Localization — 油猴单文件脚本
 * @license MIT
 *
 * ⚠️  声明：本项目代码由 AI 辅助生成，经人工审核后发布。
 *
 * 本文件包含以下三个模块（为符合 Greasy Fork 代码托管规则，内嵌于单文件中）：
 *   1. 翻译引擎 (core)    — 路由检测、词典匹配、DOM 遍历与动态监听
 *   2. 日期本地化 (date)   — 白名单隔离的日期格式转换
 *   3. 简体中文语言包      — 全站 UI 翻译词条
 *
 * 多语言切换接口：
 *   在本脚本执行前，向 window.NexusLocales 注入你的语言包对象即可。
 *   结构参考本文件底部的 zh-CN 语言包。
 *
 *   示例（在另一个油猴脚本中，@run-at document-start）：
 *     window.NexusLocales = window.NexusLocales || {};
 *     window.NexusLocales['ja'] = { _conf: {...}, public: {...}, ... };
 */

(function () {
  'use strict';

  const _global = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  模块 1：翻译引擎 (Core Engine)                              ║
  // ╚══════════════════════════════════════════════════════════════╝

  (function (global) {
    'use strict';

    // ─────────────────────────────────────────────
    //  常量 & 默认配置
    // ─────────────────────────────────────────────

    const DEFAULT_CONFIG = {
      lang: 'zh-CN',
      maxTextLength: 400,
      ignoreSelectors: [
        '.mod_description_container',
        '.prose-lexical.prose',
        '.collection_description',
        '.changelog',
        '[data-no-i18n]',
      ],
      translatableAttrs: ['placeholder', 'title', 'aria-label', 'data-tooltip'],
    };

    // ─────────────────────────────────────────────
    //  工具函数
    // ─────────────────────────────────────────────

    function throttle(fn, wait) {
      let timer = null;
      return function (...args) {
        if (timer) return;
        timer = setTimeout(() => { fn.apply(this, args); timer = null; }, wait);
      };
    }

    function debounce(fn, wait) {
      let timer = null;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
      };
    }

    function normalize(str) {
      return str.replace(/\s+/g, ' ').trim();
    }

    // ─────────────────────────────────────────────
    //  路由检测
    // ─────────────────────────────────────────────

    function detectPageType(routes) {
      const path = location.pathname + location.search;
      for (const [pattern, type] of routes) {
        const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        if (re.test(path)) return type;
      }
      return null;
    }

    // ─────────────────────────────────────────────
    //  翻译核心
    // ─────────────────────────────────────────────

    class Translator {
      constructor(config, locale) {
        this.config = config;
        this.locale = locale;
        this._cache = new Map();
        this._processedNodes = new WeakSet();
        this._dict = null;
        this._regexpRules = [];
      }

      setPageType(pageType) {
        const publicDict = this.locale.public || {};
        const pageDict = (pageType && this.locale[pageType]) ? this.locale[pageType] : {};
        this._dict = Object.assign(Object.create(null), publicDict, pageDict);
        this._cache.clear();
        this._processedNodes = new WeakSet();
        this._regexpRules = (this.locale._regexpRules || []).filter(r => !r._dateOnly);
      }

      translate(text) {
        const key = normalize(text);
        if (!key || key.length > this.config.maxTextLength) return null;
        if (this._cache.has(key)) return this._cache.get(key);

        let result = null;
        if (this._dict[key]) {
          result = this._dict[key];
        } else {
          for (const rule of this._regexpRules) {
            const translated = key.replace(rule.pattern, rule.replacement);
            if (translated !== key) { result = translated; break; }
          }
        }
        this._cache.set(key, result);
        return result;
      }

      translateTextNode(node) {
        if (this._processedNodes.has(node)) return;
        const original = node.nodeValue;
        if (!original || !original.trim()) return;
        const translated = this.translate(original);
        if (translated && translated !== original) {
          node.nodeValue = translated;
        }
        this._processedNodes.add(node);
      }

      translateAttributes(el) {
        for (const attr of this.config.translatableAttrs) {
          const val = el.getAttribute(attr);
          if (!val) continue;
          const translated = this.translate(val);
          if (translated && translated !== val) {
            el.setAttribute(attr, translated);
          }
        }
      }

      _isIgnored(node) {
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!el) return false;
        return this.config.ignoreSelectors.some(sel => el.closest(sel) !== null);
      }

      translateSubtree(root) {
        if (this._isIgnored(root)) return;
        if (root.nodeType === Node.ELEMENT_NODE) {
          this.translateAttributes(root);
        }

        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();
                if (tag === 'script' || tag === 'style') return NodeFilter.FILTER_REJECT;
                if (this._isIgnored(node)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_SKIP;
              }
              if (this._isIgnored(node)) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            },
          }
        );

        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeType === Node.TEXT_NODE) {
            this.translateTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            this.translateAttributes(node);
          }
        }
      }
    }

    // ─────────────────────────────────────────────
    //  MutationObserver 监听器
    // ─────────────────────────────────────────────

    class DOMWatcher {
      constructor(translator, onLargeChange) {
        this.translator = translator;
        this.onLargeChange = onLargeChange;
        this._observer = null;
        this._pendingNodes = new Set();
        this._flushScheduled = false;
      }

      start(target = document.documentElement) {
        if (this._observer) this._observer.disconnect();
        this._observer = new MutationObserver((mutations) => this._onMutations(mutations));
        this._observer.observe(target, {
          childList: true, subtree: true, characterData: true,
          attributes: true, attributeFilter: this.translator.config.translatableAttrs,
        });
      }

      stop() {
        if (this._observer) { this._observer.disconnect(); this._observer = null; }
      }

      _onMutations(mutations) {
        let totalNodes = 0;
        for (const m of mutations) totalNodes += m.addedNodes.length;
        if (totalNodes >= 20) { this.onLargeChange(); return; }

        for (const m of mutations) {
          if (m.type === 'childList') {
            for (const node of m.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                this._pendingNodes.add(node);
              }
            }
          } else if (m.type === 'characterData') {
            this._pendingNodes.add(m.target);
          } else if (m.type === 'attributes') {
            this._pendingNodes.add(m.target);
          }
        }
        this._scheduleFlush();
      }

      _scheduleFlush() {
        if (this._flushScheduled) return;
        this._flushScheduled = true;
        requestAnimationFrame(() => { this._flush(); this._flushScheduled = false; });
      }

      _flush() {
        for (const node of this._pendingNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            this.translator.translateTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            this.translator.translateSubtree(node);
          }
        }
        this._pendingNodes.clear();
      }
    }

    // ─────────────────────────────────────────────
    //  Shadow DOM 拦截
    // ─────────────────────────────────────────────

    function hookShadowDOM(watcher, translator) {
      const _attachShadow = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (init) {
        const shadow = _attachShadow.call(this, init);
        requestAnimationFrame(() => {
          translator.translateSubtree(shadow);
          watcher.start(shadow);
        });
        return shadow;
      };
    }

    // ─────────────────────────────────────────────
    //  SPA 路由监听
    // ─────────────────────────────────────────────

    function watchRouteChanges(onRouteChange) {
      const _pushState = history.pushState;
      const _replaceState = history.replaceState;
      const debouncedChange = debounce(onRouteChange, 500);
      history.pushState = function (...args) { _pushState.apply(this, args); debouncedChange(); };
      history.replaceState = function (...args) { _replaceState.apply(this, args); debouncedChange(); };
      window.addEventListener('popstate', debouncedChange);
    }

    // ─────────────────────────────────────────────
    //  主应用入口
    // ─────────────────────────────────────────────

    class NexusLocalization {
      constructor(userConfig = {}) {
        this.config = Object.assign({}, DEFAULT_CONFIG, userConfig);
        this.translator = null;
        this.watcher = null;
        this._currentPageType = null;
      }

      init(locale) {
        if (!locale) {
          console.warn('[NexusLocalization] 语言包未加载，跳过初始化。');
          return;
        }
        this.translator = new Translator(this.config, locale);
        this.watcher = new DOMWatcher(this.translator, () => this.translatePage());
        hookShadowDOM(this.watcher, this.translator);
        watchRouteChanges(() => this._onRouteChange(locale));
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this._onReady(locale));
        } else {
          this._onReady(locale);
        }
      }

      _onReady(locale) { this._onRouteChange(locale); this.watcher.start(); }

      _onRouteChange(locale) {
        const routes = (locale._conf && locale._conf.routes) || [];
        const pageType = detectPageType(routes);
        if (pageType !== this._currentPageType) {
          this._currentPageType = pageType;
          this.translator.setPageType(pageType);
        }
        this.translatePage();
      }

      translatePage() {
        if (!this.translator) return;
        this.translator.translateSubtree(document.documentElement);
      }
    }

    global.NexusLocalization = NexusLocalization;

  })(_global);

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  模块 2：日期本地化 (Date Localizer)                          ║
  // ║                                                              ║
  // ║  ⚠️ 日期转换只作用于白名单 CSS 选择器内的文本，                 ║
  // ║    不会误伤游戏名/Mod名（如 "Nioh 3" → "01-03" 的问题已杜绝）  ║
  // ╚══════════════════════════════════════════════════════════════╝

  (function (global) {
    'use strict';

    const MONTH_MAP = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
      apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
      aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
      nov: 11, november: 11, dec: 12, december: 12,
    };

    // 白名单：只有这些容器内的文本才会做日期转换
    const DATE_CONTAINER_SELECTORS = [
      'time', '.stat time', '.uploaded-time', '.last-updated time',
      '.mod-stats time', '[data-date]', '[data-timestamp]',
      'td.table-date', '.file-expander-header time',
      '.notification-time', '.comment-time', '.review-date time',
      '.profile-stats time',
    ];
    const DATE_SELECTOR_COMBINED = DATE_CONTAINER_SELECTORS.join(', ');

    // 黑名单：即使祖先命中白名单，这些区域也不处理
    const DATE_IGNORE_SELECTORS = [
      '[data-no-date-i18n]',
      '.mod-title', 'h1.game-name', '.game-title', 'a.mod-name', '.collection-title',
      '.mod_description_container', '.prose-lexical.prose', '.changelog',
    ];
    const DATE_IGNORE_SELECTOR_COMBINED = DATE_IGNORE_SELECTORS.join(', ');

    function to24Hour(hour, ampm) {
      if (!ampm) return hour;
      if (ampm === 'am') return hour === 12 ? 0 : hour;
      return hour === 12 ? 12 : hour + 12;
    }
    function pad2(n) { return String(n).padStart(2, '0'); }

    function convertDateString(text) {
      let m;
      // "15 Nov 2025" / "15 November 2025, 9:16AM"
      m = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i);
      if (m) {
        const month = MONTH_MAP[m[2].toLowerCase()];
        if (!month) return null;
        if (m[4] !== undefined) {
          return `${m[3]}-${pad2(month)}-${pad2(parseInt(m[1],10))} ${pad2(to24Hour(parseInt(m[4],10),(m[6]||'').toLowerCase()))}:${m[5]}`;
        }
        return `${m[3]}-${pad2(month)}-${pad2(parseInt(m[1],10))}`;
      }
      // "Uploaded at 21:21 03 Nov 2025"
      m = text.match(/^Uploaded at\s+(\d{1,2}):(\d{2})\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
      if (m) { const mo = MONTH_MAP[m[4].toLowerCase()]; if (!mo) return null; return `上传于 ${m[5]}-${pad2(mo)}-${pad2(parseInt(m[3],10))} ${m[1]}:${m[2]}`; }
      // "Updated at 21:21 03 Nov 2025"
      m = text.match(/^Updated at\s+(\d{1,2}):(\d{2})\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
      if (m) { const mo = MONTH_MAP[m[4].toLowerCase()]; if (!mo) return null; return `更新于 ${m[5]}-${pad2(mo)}-${pad2(parseInt(m[3],10))} ${m[1]}:${m[2]}`; }
      // "4 weeks ago"
      m = text.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
      if (m) { const u = {second:'秒',minute:'分钟',hour:'小时',day:'天',week:'周',month:'个月',year:'年'}; return `${m[1]} ${u[m[2].toLowerCase()]||m[2]}前`; }
      // "just now"
      if (/^just now$/i.test(text)) return '刚刚';
      // "Today at 14:32"
      m = text.match(/^Today at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
      if (m) return `今天 ${pad2(to24Hour(parseInt(m[1],10),(m[3]||'').toLowerCase()))}:${m[2]}`;
      // "Yesterday at 14:32"
      m = text.match(/^Yesterday at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
      if (m) return `昨天 ${pad2(to24Hour(parseInt(m[1],10),(m[3]||'').toLowerCase()))}:${m[2]}`;
      // "Time range: 7 Days"
      m = text.match(/^Time range:\s*(\d+)\s*Days?$/i);
      if (m) return `时间范围：${m[1]} 天`;
      return null;
    }

    function isInIgnoredArea(node) {
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!el) return false;
      try { return el.closest(DATE_IGNORE_SELECTOR_COMBINED) !== null; } catch (e) { return false; }
    }

    function isInDateContainer(node) {
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!el) return false;
      try { return el.closest(DATE_SELECTOR_COMBINED) !== null; } catch (e) { return false; }
    }

    function processTextNode(node) {
      const raw = node.nodeValue;
      if (!raw || !raw.trim()) return;
      const converted = convertDateString(raw.trim());
      if (converted && converted !== raw.trim()) {
        node.nodeValue = raw.replace(raw.trim(), converted);
      }
    }

    function localizeSubtree(root) {
      const containers = [];
      if (root.nodeType === Node.ELEMENT_NODE) {
        try { if (root.matches && root.matches(DATE_SELECTOR_COMBINED) && !root.matches(DATE_IGNORE_SELECTOR_COMBINED)) containers.push(root); } catch (e) { /* ignore */ }
        try { root.querySelectorAll(DATE_SELECTOR_COMBINED).forEach(el => { if (!el.matches(DATE_IGNORE_SELECTOR_COMBINED) && !isInIgnoredArea(el)) containers.push(el); }); } catch (e) { /* ignore */ }
      }
      for (const container of containers) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let n; while ((n = walker.nextNode())) processTextNode(n);
      }
    }

    let _observer = null;
    function startWatching() {
      if (_observer) return;
      _observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) localizeSubtree(node);
            else if (node.nodeType === Node.TEXT_NODE && isInDateContainer(node) && !isInIgnoredArea(node)) processTextNode(node);
          }
          if (m.type === 'characterData' && isInDateContainer(m.target) && !isInIgnoredArea(m.target)) processTextNode(m.target);
        }
      });
      _observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    }

    global.NexusDateLocalizer = {
      init() { localizeSubtree(document.documentElement); startWatching(); },
      localizeSubtree,
      convert: convertDateString,
      addContainerSelectors(...s) { DATE_CONTAINER_SELECTORS.push(...s); },
      addIgnoreSelectors(...s) { DATE_IGNORE_SELECTORS.push(...s); },
    };

  })(_global);

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  模块 3：简体中文语言包 (zh-CN Locale)                        ║
  // ╚══════════════════════════════════════════════════════════════╝

  (function (global) {
    'use strict';

    const zhCN = {
      _conf: {
        routes: [
          ['^/$', 'home'],
          ['/mods/\\d+', 'mod_detail'],
          ['/mods/?$', 'mod_list'],
          ['/users/\\d+', 'user_profile'],
          ['/collections/\\d+', 'collection_detail'],
          ['/collections/?$', 'collection_list'],
          ['/games/\\d+', 'game_detail'],
          ['/games/?$', 'game_list'],
          ['/news', 'news'],
          ['/premium', 'premium'],
          ['/donate', 'donate'],
          ['/contact', 'contact'],
          ['/search', 'search'],
          ['/modmanager', 'mod_manager'],
          ['/account', 'account'],
          ['/uploads', 'upload'],
        ],
      },

      public: {
        // 导航
        'Home': '首页', 'Games': '游戏', 'Mods': '模组', 'Collections': '合集',
        'News': '资讯', 'Forums': '论坛', 'Premium': '高级会员',
        'Log in': '登录', 'Sign up': '注册', 'Sign out': '退出登录',
        'Sign Up': '注册', 'Log out': '退出',
        'My account': '我的账户', 'My profile': '我的主页',
        'My mods': '我的模组', 'My collections': '我的合集', 'My games': '我的游戏',
        'Dashboard': '控制台', 'Settings': '设置', 'Notifications': '通知', 'Messages': '消息',
        // 通用按钮/操作
        'Search': '搜索', 'Search mods': '搜索模组',
        'Submit': '提交', 'Cancel': '取消', 'Confirm': '确认',
        'Save': '保存', 'Save changes': '保存更改',
        'Delete': '删除', 'Edit': '编辑', 'Close': '关闭',
        'Back': '返回', 'Next': '下一步', 'Previous': '上一步',
        'Continue': '继续', 'Done': '完成', 'Apply': '应用',
        'Reset': '重置', 'Clear': '清除', 'Filter': '筛选', 'Sort by': '排序方式',
        'View all': '查看全部', 'Show more': '显示更多', 'Show less': '显示更少',
        'Load more': '加载更多', 'Copy': '复制', 'Share': '分享',
        'Report': '举报', 'Follow': '关注', 'Unfollow': '取消关注',
        'Endorse': '认可', 'Endorsed': '已认可', 'Abstain': '弃权',
        'Like': '点赞', 'Dislike': '踩',
        // 下载
        'Download': '下载', 'Downloads': '下载量',
        'Manual Download': '手动下载', 'Mod Manager Download': '模组管理器下载',
        'Slow Download': '普通下载', 'Fast Download': '快速下载',
        'Download file': '下载文件', 'Download history': '下载历史',
        'Total downloads': '总下载量',
        // 上传
        'Upload': '上传', 'Upload file': '上传文件',
        'Upload mod': '上传模组', 'Uploading...': '上传中…',
        // 分类
        'Category': '分类', 'Categories': '分类',
        'All games': '全部游戏', 'All mods': '全部模组',
        'Popular': '热门', 'Trending': '趋势', 'Latest': '最新',
        'Updated': '已更新', 'Top rated': '最高评分',
        'Most endorsed': '最多认可', 'Most downloaded': '最多下载',
        'New today': '今日新增', 'New this week': '本周新增',
        'Recently updated': '最近更新',
        // 状态
        'Active': '活跃', 'Inactive': '不活跃', 'Hidden': '已隐藏',
        'Published': '已发布', 'Draft': '草稿', 'Archived': '已归档',
        'Deleted': '已删除', 'Banned': '已封禁',
        'Verified': '已验证', 'Unverified': '未验证',
        'Loading': '加载中', 'Loading...': '加载中…',
        'No results found': '未找到结果', 'No results': '无结果',
        'Error': '错误', 'Success': '成功', 'Warning': '警告',
        // 内容标签
        'Description': '描述', 'Files': '文件', 'Images': '图片',
        'Videos': '视频', 'Articles': '文章', 'Comments': '评论',
        'Reviews': '评价', 'Changelog': '更新日志',
        'Permissions': '使用权限', 'Requirements': '前置要求',
        'Tags': '标签', 'Bugs': '问题反馈', 'Logs': '日志',
        'Stats': '统计', 'Credits': '致谢',
        'About this mod': '关于本模组', 'About this collection': '关于本合集',
        // 表单/输入
        'Email': '邮箱', 'Email address': '电子邮箱', 'Password': '密码',
        'Username': '用户名', 'Name': '名称', 'Title': '标题',
        'Optional': '可选', 'Required': '必填',
        'Enter your email': '请输入邮箱', 'Enter your password': '请输入密码',
        'Search...': '搜索…', 'Search mods...': '搜索模组…',
        // 数量/统计
        'views': '次浏览', 'View': '浏览', 'Views': '浏览量',
        'endorsements': '次认可', 'Endorsements': '认可数',
        'Unique downloads': '独立下载', 'Total unique downloads': '总独立下载',
        'Followers': '关注者', 'Following': '正在关注',
        'Members': '成员', 'Posts': '帖子',
        // 时间
        'Today': '今天', 'Yesterday': '昨天',
        'This week': '本周', 'This month': '本月', 'This year': '今年',
        'All time': '历史总计', 'Last 7 days': '最近 7 天',
        'Last 30 days': '最近 30 天', 'Last 90 days': '最近 90 天',
        'Last year': '过去一年',
        // 通知
        'New comment': '新评论', 'New reply': '新回复',
        'New endorsement': '新认可', 'New follower': '新关注者',
        'Mod updated': '模组已更新', 'Mark all as read': '全部标为已读',
        'No notifications': '暂无通知',
        // 杂项
        'Version': '版本', 'Author': '作者', 'Authors': '作者',
        'Size': '大小', 'Language': '语言', 'Website': '网站',
        'Source code': '源代码', 'License': '许可证',
        'Adult content': '成人内容', 'NSFW': '成人内容',
        'Spoiler': '剧透', 'Pinned': '已置顶', 'Stickied': '已置顶',
        'Locked': '已锁定', 'Closed': '已关闭', 'Open': '开放',
        'Free': '免费', 'Paid': '付费', 'Featured': '精选',
        'Staff pick': '员工推荐', 'Hot': '热门',
      },

      home: {
        'Featured mods': '精选模组', 'Featured collections': '精选合集',
        'Latest mods': '最新模组', 'Popular games': '热门游戏',
        'Trending mods': '趋势模组', 'New and updated mods': '新增与更新模组',
        'Browse all games': '浏览全部游戏', 'Browse all mods': '浏览全部模组',
        'Explore Nexus Mods': '探索 Nexus Mods', 'Join the community': '加入社区',
        'Discover the best mods': '探索最佳模组',
        'Safe to use': '安全使用', 'Totally free': '完全免费',
        'Community-driven': '社区驱动',
      },

      mod_detail: {
        'About this mod': '关于本模组',
        'Requirements and permissions': '前置与权限',
        'File information': '文件信息', 'Main files': '主文件',
        'Optional files': '可选文件', 'Old versions': '旧版本',
        'Miscellaneous': '其他文件', 'FOMOD installer': 'FOMOD 安装包',
        'Description tab': '描述', 'Files tab': '文件',
        'Images tab': '图片', 'Videos tab': '视频',
        'Articles tab': '文章', 'Changelog tab': '更新日志',
        'Bugs tab': '问题反馈', 'Logs tab': '日志',
        'Stats tab': '统计', 'Permissions tab': '权限',
        'Requirements tab': '前置要求', 'Posts tab': '帖子',
        'Comments tab': '评论', 'Reviews tab': '评价', 'Credits tab': '致谢',
        'Add to collection': '添加到合集', 'Remove from collection': '从合集移除',
        'Track this mod': '追踪此模组', 'Stop tracking': '停止追踪',
        'Report this mod': '举报此模组', 'Endorse this mod': '认可此模组',
        'Mod details': '模组详情', 'Mod page': '模组页面',
        'Original upload date': '首次上传日期', 'Last updated': '最后更新',
        'Virus scan': '病毒扫描', 'Safe to use': '安全可用',
        'Tags': '标签', 'Category': '分类', 'Type': '类型',
        'Unique downloads': '独立下载', 'Total downloads': '总下载',
        'Endorsements': '认可数', 'Author\'s instructions': '作者说明',
        'Permissions': '使用权限',
        'You must be logged in': '您需要先登录',
        'Log in to endorse': '登录后认可', 'Log in to download': '登录后下载',
        'Log in to track': '登录后追踪',
        'Mod requirements': '前置模组', 'This mod requires': '此模组需要',
        'No requirements': '无前置要求',
        'Mods requiring this file': '依赖此文件的模组',
        'File size': '文件大小', 'Upload date': '上传日期',
        'MD5 hash': 'MD5 校验值', 'Preview file contents': '预览文件内容',
        'Download this file': '下载此文件', 'Delete this file': '删除此文件',
        'View changelog': '查看更新日志',
        'Sticky': '置顶帖', 'Pinned post': '置顶帖子',
        'Post your comment': '发表评论', 'Show replies': '显示回复',
        'Hide replies': '隐藏回复', 'Reply': '回复', 'Quote': '引用',
        'Edit comment': '编辑评论', 'Delete comment': '删除评论',
        'Report comment': '举报评论', 'No comments yet': '暂无评论',
        'Be the first to comment': '成为第一个评论的人',
        'Write a review': '撰写评价', 'Your review': '您的评价',
        'Overall rating': '综合评分', 'No reviews yet': '暂无评价',
        'Submitted': '已提交',
        'This is an adult content mod': '这是成人内容模组',
      },

      mod_list: {
        'Sort by': '排序方式', 'Relevance': '相关性', 'Name': '名称',
        'Date added': '上传日期', 'Date updated': '更新日期',
        'Rating': '评分', 'Endorsements': '认可数', 'Downloads': '下载量',
        'File size': '文件大小', 'Category': '分类', 'All categories': '全部分类',
        'Filter by': '按条件筛选', 'Clear filters': '清除筛选',
        'Show NSFW': '显示成人内容', 'Hide NSFW': '隐藏成人内容',
        'Adult content': '成人内容', 'Results per page': '每页显示',
        'Showing': '显示', 'of': '共', 'results': '个结果',
        'No mods found': '未找到模组', 'Try adjusting your search': '尝试调整搜索条件',
      },

      user_profile: {
        'Profile': '主页', 'Activity': '动态', 'Mods': '模组',
        'Collections': '合集', 'Images': '图片', 'Videos': '视频',
        'Tracking': '追踪', 'Tracked mods': '追踪的模组',
        'Endorsements given': '已给出的认可', 'Endorsements received': '获得的认可',
        'Files uploaded': '已上传文件', 'Member since': '注册时间',
        'Last active': '最后活跃', 'Reputation': '声誉',
        'Unique author downloads': '作者独立下载', 'Mod downloads': '模组下载',
        'Send a message': '发送消息', 'Follow this user': '关注此用户',
        'Unfollow this user': '取消关注', 'Block this user': '封锁此用户',
        'Report this user': '举报此用户',
        'This user is a Supporter': '该用户是支持者',
        'This user is a Premium Member': '该用户是高级会员',
        'Private profile': '私密主页',
        'This user\'s profile is private': '该用户的主页已设为私密',
        'No mods uploaded': '暂未上传模组', 'No activity': '暂无动态',
      },

      collection_detail: {
        'About this collection': '关于本合集', 'Mods in this collection': '合集中的模组',
        'Curated by': '由…整理', 'Collection requirements': '合集前置要求',
        'Install collection': '安装合集', 'Add to library': '添加到库',
        'Remove from library': '从库中移除',
        'Revision': '修订版本', 'Revisions': '修订历史',
        'View revisions': '查看修订历史', 'Overall rating': '综合评分',
        'Mods': '模组', 'Mods included': '包含模组',
        'Required mods': '必需模组', 'Optional mods': '可选模组',
        'Adult content': '成人内容', 'No description': '暂无描述',
        'Collection stats': '合集统计', 'Installs': '安装次数',
        'Endorsements': '认可数', 'Followers': '关注者',
      },

      collection_list: {
        'Browse collections': '浏览合集', 'Featured collections': '精选合集',
        'New collections': '最新合集', 'Top collections': '最热合集',
        'Sort by': '排序方式', 'Installs': '安装次数',
        'Endorsements': '认可数', 'Date created': '创建日期',
        'Date updated': '更新日期', 'Rating': '评分', 'Mods count': '模组数量',
      },

      game_detail: {
        'Browse mods': '浏览模组', 'Top mods': '热门模组',
        'New mods': '最新模组', 'Total mods': '模组总数',
        'Total downloads': '总下载量', 'Total endorsements': '总认可数',
        'Forum': '论坛', 'Wiki': '维基', 'Nexus Mods page': 'Nexus Mods 页面',
        'Game details': '游戏详情', 'Release date': '发行日期',
        'Genre': '类型', 'Developer': '开发商', 'Publisher': '发行商',
        'Platforms': '平台', 'Track this game': '追踪此游戏',
        'Stop tracking this game': '停止追踪',
      },

      search: {
        'Search results': '搜索结果', 'All results': '全部结果',
        'Mods': '模组', 'Collections': '合集', 'Games': '游戏',
        'Users': '用户', 'Articles': '文章', 'Search for': '搜索',
        'Did you mean': '您是否想搜索', 'No results for': '未找到与之匹配的结果：',
        'Try a different search': '请尝试其他关键词', 'Advanced search': '高级搜索',
      },

      premium: {
        'Premium': '高级会员', 'Go Premium': '开通高级会员',
        'Premium Member': '高级会员', 'Supporter': '支持者',
        'Benefits': '权益', 'Features': '功能',
        'Fast downloads': '快速下载', 'No ads': '无广告',
        'Priority support': '优先支持', 'Ad-free browsing': '无广告浏览',
        'Unlimited collections': '无限合集',
        'Per month': '每月', 'Per year': '每年', 'Billed annually': '按年结算',
        'Cancel anytime': '随时取消', 'Most popular': '最受欢迎',
        'Get started': '立即开始', 'Learn more': '了解更多',
        'Already a member?': '已是会员？', 'Manage subscription': '管理订阅',
      },

      account: {
        'Account settings': '账户设置', 'Profile settings': '主页设置',
        'Notification settings': '通知设置', 'Privacy settings': '隐私设置',
        'Security': '安全', 'Change password': '修改密码',
        'Change email': '修改邮箱', 'Two-factor authentication': '两步验证',
        'API key': 'API 密钥', 'Delete account': '删除账户',
        'Linked accounts': '关联账户', 'Display name': '显示名称',
        'About me': '个人简介', 'Avatar': '头像',
        'Profile visibility': '主页可见性', 'Public': '公开', 'Private': '私密',
        'Friends only': '仅好友可见', 'Email notifications': '邮件通知',
        'Site notifications': '站内通知', 'Save settings': '保存设置',
        'Current password': '当前密码', 'New password': '新密码',
        'Confirm new password': '确认新密码',
        'Password changed successfully': '密码已成功修改',
        'Wallet': '钱包', 'Balance': '余额', 'Transaction history': '交易记录',
      },

      upload: {
        'Upload a mod': '上传模组', 'Edit mod': '编辑模组',
        'Mod name': '模组名称', 'Summary': '摘要', 'Description': '描述',
        'Category': '分类', 'Tags': '标签', 'Version number': '版本号',
        'Changelog': '更新日志', 'Requirements': '前置要求',
        'Permissions': '使用权限', 'Adult content': '成人内容',
        'Publish': '发布', 'Save as draft': '保存为草稿', 'Preview': '预览',
        'Add file': '添加文件', 'Remove file': '移除文件',
        'File name': '文件名', 'File type': '文件类型',
        'File description': '文件描述', 'Required files': '必需文件',
        'Optional files': '可选文件', 'FOMOD': 'FOMOD',
        'Main file': '主文件', 'Miscellaneous': '其他',
        'Old version': '旧版本', 'Image gallery': '图片图库',
        'Add image': '添加图片', 'Primary image': '主图',
        'Thumbnail': '缩略图', 'Credit other mods': '致谢其他模组',
        'Credit other users': '致谢其他用户', 'External credit': '外部致谢',
      },
    };

    if (!global.NexusLocales) global.NexusLocales = {};
    global.NexusLocales['zh-CN'] = zhCN;

  })(_global);

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  主入口：初始化引擎 & 日期模块 & 注册菜单                       ║
  // ╚══════════════════════════════════════════════════════════════╝

  const CURRENT_LANG = GM_getValue('nx_lang', 'zh-CN');
  const DATE_L10N_ENABLED = GM_getValue('nx_date_l10n', true);

  function getLocale(lang) {
    return (_global.NexusLocales || {})[lang] || null;
  }

  // 注册油猴菜单
  const locales = _global.NexusLocales || {};
  Object.keys(locales).forEach(lang => {
    const isActive = lang === CURRENT_LANG;
    GM_registerMenuCommand(`${isActive ? '✓ ' : ''}${lang}`, () => {
      GM_setValue('nx_lang', lang);
      location.reload();
    });
  });
  GM_registerMenuCommand(`日期本地化：${DATE_L10N_ENABLED ? '开启 ✓' : '关闭'}`, () => {
    GM_setValue('nx_date_l10n', !DATE_L10N_ENABLED);
    location.reload();
  });

  // 启动翻译引擎
  const locale = getLocale(CURRENT_LANG);
  if (!locale) {
    console.warn(`[NexusLocalization] 未找到语言包：${CURRENT_LANG}`);
    return;
  }

  const engine = new _global.NexusLocalization();
  engine.init(locale);

  // 启动日期本地化
  if (DATE_L10N_ENABLED && _global.NexusDateLocalizer) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => _global.NexusDateLocalizer.init());
    } else {
      _global.NexusDateLocalizer.init();
    }
  }

  _global.NexusLocalization_instance = engine;

})();
