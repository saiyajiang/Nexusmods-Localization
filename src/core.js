/**
 * Nexusmods-Localization - Core Engine
 * @license MIT
 *
 * 核心翻译引擎：负责路由检测、词典匹配、DOM 遍历与动态监听。
 * 与日期本地化模块 (date-localizer.js) 严格分离，
 * 日期模块仅处理时间戳类文本，绝不接触游戏/Mod 名称字段。
 */

(function (global) {
  'use strict';

  // ─────────────────────────────────────────────
  //  常量 & 默认配置
  // ─────────────────────────────────────────────

  const DEFAULT_CONFIG = {
    /** 当前语言包标识，需与 locales/ 下的文件名一致 */
    lang: 'zh-CN',
    /**
     * 超过此字符数的纯文本节点跳过翻译。
     * 防止误伤 Mod 简介、评论等用户原创内容。
     */
    maxTextLength: 400,
    /**
     * 永远不翻译的 CSS 选择器（用户内容区域）。
     * 这些容器内的所有子节点均不参与翻译。
     */
    ignoreSelectors: [
      '.mod_description_container',  // Mod 详情长描述
      '.prose-lexical.prose',         // 富文本编辑器
      '.collection_description',      // 合集描述
      '.changelog',                   // 变更日志
      '[data-no-i18n]',               // 标记为不翻译
    ],
    /**
     * 允许翻译的属性名列表（attribute 翻译白名单）。
     */
    translatableAttrs: ['placeholder', 'title', 'aria-label', 'data-tooltip'],
  };

  // ─────────────────────────────────────────────
  //  工具函数
  // ─────────────────────────────────────────────

  /**
   * 节流函数：在 wait 毫秒内最多执行一次 fn。
   */
  function throttle(fn, wait) {
    let timer = null;
    return function (...args) {
      if (timer) return;
      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
      }, wait);
    };
  }

  /**
   * 防抖函数：在 wait 毫秒无新调用后才执行 fn。
   */
  function debounce(fn, wait) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /**
   * 规范化字符串：折叠连续空白，去除首尾空格。
   */
  function normalize(str) {
    return str.replace(/\s+/g, ' ').trim();
  }

  // ─────────────────────────────────────────────
  //  路由检测
  // ─────────────────────────────────────────────

  /**
   * 根据路由规则检测当前页面类型。
   * @param {Array<[string|RegExp, string]>} routes  路由规则列表，每项为 [pattern, pageType]
   * @returns {string|null}  匹配到的 pageType，或 null
   */
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
    /**
     * @param {object} config   合并后的配置
     * @param {object} locale   语言包对象，结构：{ public: {}, [pageType]: {}, _regexp: [] }
     */
    constructor(config, locale) {
      this.config = config;
      this.locale = locale;

      // 翻译结果缓存：Map<原文, 译文>
      this._cache = new Map();
      // 已处理的 TextNode 缓存（WeakSet 避免内存泄漏）
      this._processedNodes = new WeakSet();
      // 当前页面词典（public + pageType 合并后的平铺字典）
      this._dict = null;
      // 正则规则列表（仅 UI 文本用途，不包含日期）
      this._regexpRules = [];
    }

    /**
     * 切换/初始化当前页面词典。
     * @param {string|null} pageType  页面类型
     */
    setPageType(pageType) {
      const publicDict = this.locale.public || {};
      const pageDict = (pageType && this.locale[pageType]) ? this.locale[pageType] : {};
      // 页面词典优先级高于公共词典
      this._dict = Object.assign(Object.create(null), publicDict, pageDict);
      // 清空缓存（切页后词典可能变化）
      this._cache.clear();
      this._processedNodes = new WeakSet();
      // 加载正则规则（非日期类）
      this._regexpRules = (this.locale._regexpRules || []).filter(r => !r._dateOnly);
    }

    /**
     * 查找一段文本的翻译。
     * 优先精确匹配词典，其次尝试正则规则。
     * @param {string} text  原始文本
     * @returns {string|null}  译文，或 null（无需翻译）
     */
    translate(text) {
      const key = normalize(text);
      if (!key || key.length > this.config.maxTextLength) return null;

      // 命中缓存
      if (this._cache.has(key)) return this._cache.get(key);

      let result = null;

      // 1. 精确匹配
      if (this._dict[key]) {
        result = this._dict[key];
      } else {
        // 2. 正则规则匹配（UI 文本专用，不含日期规则）
        for (const rule of this._regexpRules) {
          const translated = key.replace(rule.pattern, rule.replacement);
          if (translated !== key) {
            result = translated;
            break;
          }
        }
      }

      this._cache.set(key, result);
      return result;
    }

    /**
     * 翻译一个文本节点。
     * @param {Text} node
     */
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

    /**
     * 翻译元素的可翻译属性。
     * @param {Element} el
     */
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

    /**
     * 判断节点是否在忽略区域内。
     * @param {Node} node
     * @returns {boolean}
     */
    _isIgnored(node) {
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!el) return false;
      return this.config.ignoreSelectors.some(sel => el.closest(sel) !== null);
    }

    /**
     * 递归翻译一个 DOM 子树。
     * @param {Node} root
     */
    translateSubtree(root) {
      if (this._isIgnored(root)) return;

      // 处理元素属性
      if (root.nodeType === Node.ELEMENT_NODE) {
        this.translateAttributes(/** @type {Element} */ (root));
      }

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 忽略 script / style
              const tag = node.tagName.toLowerCase();
              if (tag === 'script' || tag === 'style') {
                return NodeFilter.FILTER_REJECT;
              }
              // 忽略标注区域
              if (this._isIgnored(node)) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_SKIP; // 继续遍历子节点
            }
            // TEXT_NODE
            if (this._isIgnored(node)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      // 先翻译根的属性（如果是 Element）
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          this.translateTextNode(/** @type {Text} */ (node));
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          this.translateAttributes(/** @type {Element} */ (node));
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  //  MutationObserver 监听器
  // ─────────────────────────────────────────────

  class DOMWatcher {
    /**
     * @param {Translator} translator
     * @param {function} onLargeChange  大规模 DOM 变化回调（触发整页重翻译）
     */
    constructor(translator, onLargeChange) {
      this.translator = translator;
      this.onLargeChange = onLargeChange;
      this._observer = null;
      this._pendingNodes = new Set();
      this._flushScheduled = false;
    }

    start(target = document.documentElement) {
      if (this._observer) this._observer.disconnect();
      this._observer = new MutationObserver((mutations) => {
        this._onMutations(mutations);
      });
      this._observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: this.translator.config.translatableAttrs,
      });
    }

    stop() {
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
    }

    _onMutations(mutations) {
      let totalNodes = 0;
      for (const m of mutations) {
        totalNodes += m.addedNodes.length;
      }

      // 大规模变化：直接触发整页重翻译
      if (totalNodes >= 20) {
        this.onLargeChange();
        return;
      }

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
      requestAnimationFrame(() => {
        this._flush();
        this._flushScheduled = false;
      });
    }

    _flush() {
      for (const node of this._pendingNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          this.translator.translateTextNode(/** @type {Text} */ (node));
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          this.translator.translateSubtree(/** @type {Element} */ (node));
        }
      }
      this._pendingNodes.clear();
    }
  }

  // ─────────────────────────────────────────────
  //  Shadow DOM 拦截
  // ─────────────────────────────────────────────

  /**
   * Hook Element.prototype.attachShadow，对新挂载的 Shadow Root 立即翻译并监听。
   * 必须在 document-start 时机调用，确保在站点代码之前执行。
   */
  function hookShadowDOM(watcher, translator) {
    const _attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
      const shadow = _attachShadow.call(this, init);
      // 延迟一帧，等待 Shadow DOM 内容填充
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

  /**
   * 监听 history API 和 popstate，在路由变化时重新检测页面类型并翻译。
   * @param {function} onRouteChange
   */
  function watchRouteChanges(onRouteChange) {
    const _pushState = history.pushState;
    const _replaceState = history.replaceState;
    const debouncedChange = debounce(onRouteChange, 500);

    history.pushState = function (...args) {
      _pushState.apply(this, args);
      debouncedChange();
    };
    history.replaceState = function (...args) {
      _replaceState.apply(this, args);
      debouncedChange();
    };
    window.addEventListener('popstate', debouncedChange);
  }

  // ─────────────────────────────────────────────
  //  主应用入口
  // ─────────────────────────────────────────────

  class NexusLocalization {
    /**
     * @param {object} userConfig  用户覆盖配置（可选）
     */
    constructor(userConfig = {}) {
      this.config = Object.assign({}, DEFAULT_CONFIG, userConfig);
      this.translator = null;
      this.watcher = null;
      this._currentPageType = null;
    }

    /**
     * 加载语言包并启动引擎。
     * @param {object} locale  通过 require/外部脚本注入的语言包对象
     */
    init(locale) {
      if (!locale) {
        console.warn('[NexusLocalization] 语言包未加载，跳过初始化。');
        return;
      }

      this.translator = new Translator(this.config, locale);

      this.watcher = new DOMWatcher(this.translator, () => {
        // 大规模变化时整页重翻译
        this.translatePage();
      });

      // 在 document-start 时机尽早 hook Shadow DOM
      hookShadowDOM(this.watcher, this.translator);

      // 监听路由变化
      watchRouteChanges(() => this._onRouteChange(locale));

      // DOM 就绪后执行首次翻译
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._onReady(locale));
      } else {
        this._onReady(locale);
      }
    }

    _onReady(locale) {
      this._onRouteChange(locale);
      this.watcher.start();
    }

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

  // ─────────────────────────────────────────────
  //  导出
  // ─────────────────────────────────────────────

  global.NexusLocalization = NexusLocalization;

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
