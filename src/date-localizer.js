/**
 * Nexusmods-Localization - Date Localizer
 * @license MIT
 *
 * 日期本地化模块：将界面中的英文日期/相对时间转换为符合中文习惯的格式。
 *
 * ⚠️  重要设计原则：
 *   本模块 **绝对不会** 处理以下节点/元素：
 *   - Mod 标题、游戏名称（如 "Nioh 3" 不会被解析为日期）
 *   - 用户自定义内容区域（描述、评论、变更日志）
 *   - 任何包含在 [data-no-date-i18n] 属性的元素内的文本
 *
 *   日期转换 **只作用于** 被 CSS 选择器白名单明确标记的时间戳容器，
 *   例如 <time> 元素、带有特定 class 的日期显示组件。
 *   这与原项目对整个 DOM 进行正则扫描的方式截然不同，
 *   从根本上杜绝了将 "nioh3" 误识别为 "01-03" 的问题。
 */

(function (global) {
  'use strict';

  // ─────────────────────────────────────────────
  //  月份映射表
  // ─────────────────────────────────────────────

  const MONTH_MAP = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  // ─────────────────────────────────────────────
  //  日期容器白名单 CSS 选择器
  //  只有匹配这些选择器的元素内的文本才会进行日期转换。
  //  请勿使用通配符或过于宽泛的选择器！
  // ─────────────────────────────────────────────

  const DATE_CONTAINER_SELECTORS = [
    // HTML5 语义化时间元素（最安全）
    'time',
    // Nexus Mods 常见的时间戳 class
    '.stat time',
    '.uploaded-time',
    '.last-updated time',
    '.mod-stats time',
    '[data-date]',          // 带有 data-date 属性的元素
    '[data-timestamp]',     // 带有 data-timestamp 属性的元素
    // 文件列表中的上传日期列
    'td.table-date',
    '.file-expander-header time',
    // 通知/消息时间戳
    '.notification-time',
    '.comment-time',
    '.review-date time',
    // 用户资料页统计日期
    '.profile-stats time',
    // Next.js SPA 常见的日期包裹元素
    'time[datetime]',
    'span[datetime]',
    'abbr[title]',          // <abbr title="ISO date">human date</abbr>
    'small time',
    '.date time',
    '.timestamp',
    '.file-updated time',
    // 更宽泛的容器：带特定 aria 属性的时间戳
    '[aria-label*="date" i]',
    '[aria-label*="time" i]',
    '[aria-label*="uploaded" i]',
    '[aria-label*="updated" i]',
    // Images / 通用页面更宽泛的容器
    '[class*="date" i]',
    '[class*="time" i]',
    '[class*="uploaded" i]',
    '[class*="updated" i]',
    '.image-stats',
    '.image-meta',
    '.mod-info',
    '.file-info',
    // 更通用的 span/p 容器（images 页面日期常见）
    'span.text-sm',
    'p.text-sm',
    'span.text-xs',
    'p.text-xs',
  ];

  // 合并为单个选择器字符串，便于 matches() 调用
  const DATE_SELECTOR_COMBINED = DATE_CONTAINER_SELECTORS.join(', ');

  // ─────────────────────────────────────────────
  //  永远不翻译日期的选择器（黑名单）
  //  即使祖先节点命中白名单，这些容器内也不处理。
  // ─────────────────────────────────────────────

  const DATE_IGNORE_SELECTORS = [
    '[data-no-date-i18n]',
    // Mod / 游戏标题区域（防止 "Nioh 3" → "01-03"）
    '.mod-title',
    'h1.game-name',
    '.game-title',
    'a.mod-name',
    '.collection-title',
    // 用户内容区域
    '.mod_description_container',
    '.prose-lexical.prose',
    '.changelog',
  ];

  const DATE_IGNORE_SELECTOR_COMBINED = DATE_IGNORE_SELECTORS.join(', ');

  // ─────────────────────────────────────────────
  //  格式化工具
  // ─────────────────────────────────────────────

  /**
   * 将 12 小时制时间转换为 24 小时制。
   * @param {number} hour
   * @param {string} ampm  'am' | 'pm' | ''
   * @returns {number}
   */
  function to24Hour(hour, ampm) {
    if (!ampm) return hour;
    if (ampm === 'am') return hour === 12 ? 0 : hour;
    // pm
    return hour === 12 ? 12 : hour + 12;
  }

  /**
   * 将数字补零至两位。
   */
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * 将 24h 小时转为 12h 格式字符串，如 "7:15PM"
   */
  function to12Hour(h, min) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${pad2(min)}${ampm}`;
  }

  /**
   * 获取当前时间格式偏好。
   * @returns {boolean} true=24小时制, false=12小时制
   */
  function use24HourFormat() {
    try {
      // 尝试读取油猴 GM_getValue（如果在油猴环境中运行）
      if (typeof GM_getValue === 'function') {
        return GM_getValue('nx_time24', true);
      }
    } catch (e) { /* ignore */ }
    return true; // 默认 24 小时制
  }

  /**
   * 格式化时间部分，根据 24/12 小时制偏好返回对应格式。
   * @param {number} h24  24小时制的小时数
   * @param {number|string} min  分钟
   * @returns {string}
   */
  function formatTime(h24, min) {
    const minNum = typeof min === 'string' ? parseInt(min, 10) : min;
    return use24HourFormat() ? `${pad2(h24)}:${pad2(minNum)}` : to12Hour(h24, minNum);
  }

  // ─────────────────────────────────────────────
  //  日期字符串解析 & 格式转换
  // ─────────────────────────────────────────────

  /**
   * 尝试将英文日期字符串转换为中文格式。
   * 只处理明确的日期模式，无法识别的原样返回 null。
   *
   * @param {string} text  待转换文本（已 trim）
   * @returns {string|null}  转换结果，或 null（无法识别）
   */
  function convertDateString(text) {
    // ── 1. "15 Nov 2025" / "15 November 2025"
    let m = text.match(
      /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i
    );
    if (m) {
      const day = parseInt(m[1], 10);
      const monthKey = m[2].toLowerCase();
      const year = parseInt(m[3], 10);
      const month = MONTH_MAP[monthKey];
      if (!month) return null; // 未知月份名 → 不转换（防止误识别游戏名）

      if (m[4] !== undefined) {
        // 带时间
        const h24 = to24Hour(parseInt(m[4], 10), (m[6] || '').toLowerCase());
        const timePart = formatTime(h24, m[5]);
        return `${year}-${pad2(month)}-${pad2(day)} ${timePart}`;
      }
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }

    // ── 1b. "2026-04-22, 9:58PM" / "2026-04-22, 21:58" (ISO日期+时间)
    m = text.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i
    );
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      const day = parseInt(m[3], 10);
      if (m[4] !== undefined) {
        const h24 = to24Hour(parseInt(m[4], 10), (m[6] || '').toLowerCase());
        const timePart = formatTime(h24, m[5]);
        return `${year}-${pad2(month)}-${pad2(day)} ${timePart}`;
      }
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }

    // ── 2. "Uploaded at 21:21 03 Nov 2025"
    m = text.match(
      /^Uploaded at\s+(\d{1,2}):(\d{2})\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i
    );
    if (m) {
      const h24 = to24Hour(parseInt(m[1], 10), '');
      const day = parseInt(m[3], 10);
      const monthKey = m[4].toLowerCase();
      const year = m[5];
      const month = MONTH_MAP[monthKey];
      if (!month) return null;
      const timePart = formatTime(h24, m[2]);
      return `上传于 ${year}-${pad2(month)}-${pad2(day)} ${timePart}`;
    }

    // ── 3. "Updated at 21:21 03 Nov 2025"
    m = text.match(
      /^Updated at\s+(\d{1,2}):(\d{2})\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i
    );
    if (m) {
      const h24 = to24Hour(parseInt(m[1], 10), '');
      const day = parseInt(m[3], 10);
      const monthKey = m[4].toLowerCase();
      const year = m[5];
      const month = MONTH_MAP[monthKey];
      if (!month) return null;
      const timePart = formatTime(h24, m[2]);
      return `更新于 ${year}-${pad2(month)}-${pad2(day)} ${timePart}`;
    }

    // ── 3b. "Apr 22, 2026" / "April 22, 2026" (美式日期，可选时间)
    m = text.match(
      /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i
    );
    if (m) {
      const monthKey = m[1].toLowerCase();
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      const month = MONTH_MAP[monthKey];
      if (!month) return null;
      if (m[4] !== undefined) {
        const h24 = to24Hour(parseInt(m[4], 10), (m[6] || '').toLowerCase());
        const timePart = formatTime(h24, m[5]);
        return `${year}-${pad2(month)}-${pad2(day)} ${timePart}`;
      }
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }

    // ── 3c. "Added on Apr 22, 2026, 9:58PM" (带前缀的美式日期)
    m = text.match(
      /^Added on\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i
    );
    if (m) {
      const monthKey = m[1].toLowerCase();
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      const month = MONTH_MAP[monthKey];
      if (!month) return null;
      if (m[4] !== undefined) {
        const h24 = to24Hour(parseInt(m[4], 10), (m[6] || '').toLowerCase());
        const timePart = formatTime(h24, m[5]);
        return `添加于 ${year}-${pad2(month)}-${pad2(day)} ${timePart}`;
      }
      return `添加于 ${year}-${pad2(month)}-${pad2(day)}`;
    }

    // ── 4. 相对时间："4 weeks ago", "2 days ago", "1 hour ago" …
    m = text.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
    if (m) {
      const num = m[1];
      const unit = m[2].toLowerCase();
      const unitMap = {
        second: '秒', minute: '分钟', hour: '小时',
        day: '天', week: '周', month: '个月', year: '年',
      };
      return `${num} ${unitMap[unit] || unit}前`;
    }

    // ── 5. "just now"
    if (/^just now$/i.test(text)) return '刚刚';

    // ── 6. "Today at 14:32"
    m = text.match(/^Today at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (m) {
      const h24 = to24Hour(parseInt(m[1], 10), (m[3] || '').toLowerCase());
      const timePart = formatTime(h24, m[2]);
      return `今天 ${timePart}`;
    }

    // ── 7. "Yesterday at 14:32"
    m = text.match(/^Yesterday at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (m) {
      const h24 = to24Hour(parseInt(m[1], 10), (m[3] || '').toLowerCase());
      const timePart = formatTime(h24, m[2]);
      return `昨天 ${timePart}`;
    }

    // ── 8. "Time range: 7 Days" / "Time range: 30 Days"
    m = text.match(/^Time range:\s*(\d+)\s*Days?$/i);
    if (m) return `时间范围：${m[1]} 天`;

    // ── 9. 纯时间格式："9:59PM", "11:30 AM", "21:50", "14:05"
    //     处理 <time> 内与日期分开的独立时间文本节点
    m = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (m) {
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = (m[4] || '').toLowerCase();
      const h24 = to24Hour(h, ampm);
      return formatTime(h24, min);
    }

    return null; // 无法识别，不做任何转换
  }

  // ─────────────────────────────────────────────
  //  核心处理：仅处理白名单容器内的文本节点
  // ─────────────────────────────────────────────

  /**
   * 判断给定节点是否在日期黑名单区域内。
   */
  function isInIgnoredArea(node) {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return false;
    try {
      return el.closest(DATE_IGNORE_SELECTOR_COMBINED) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * 判断给定节点是否在日期白名单容器内。
   */
  function isInDateContainer(node) {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return false;
    try {
      return el.closest(DATE_SELECTOR_COMBINED) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * 处理单个文本节点。
   * 在调用此函数之前应已确认节点在白名单容器内。
   */
  function processTextNode(node) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    const converted = convertDateString(raw.trim());
    if (converted && converted !== raw.trim()) {
      node.nodeValue = raw.replace(raw.trim(), converted);
    }
  }

  /**
   * 尝试对不在日期白名单容器内的短文本节点进行日期转换。
   * Next.js SPA 的日期经常不在 <time> 等标准容器内，
   * 而是直接作为 span/p 中的文本。
   * 只处理明确的日期模式，不会误伤游戏名。
   * @param {Text} node
   * @returns {boolean} 是否成功转换
   */
  function tryConvertGenericTextNode(node) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return false;
    const text = raw.trim();
    // 仅处理短文本（≤60字符）且不含中文的纯英文文本
    if (text.length === 0 || text.length > 60 || /[\u4e00-\u9fff]/.test(text)) return false;
    const converted = convertDateString(text);
    if (converted && converted !== text) {
      node.nodeValue = raw.replace(text, converted);
      return true;
    }
    return false;
  }

  /**
   * 遍历 root 子树，只对白名单容器内的 TextNode 执行日期转换。
   * @param {Node} root
   */
  function localizeSubtree(root) {
    // 先找出所有日期容器
    const containers = [];
    if (root.nodeType === Node.ELEMENT_NODE) {
      // root 本身是否是容器
      try {
        if (root.matches && root.matches(DATE_SELECTOR_COMBINED) && !root.matches(DATE_IGNORE_SELECTOR_COMBINED)) {
          containers.push(root);
        }
      } catch (e) { /* ignore */ }
      // 后代中的容器
      try {
        root.querySelectorAll(DATE_SELECTOR_COMBINED).forEach(el => {
          if (!el.matches(DATE_IGNORE_SELECTOR_COMBINED) && !isInIgnoredArea(el)) {
            containers.push(el);
          }
        });
      } catch (e) { /* ignore */ }
    }

    for (const container of containers) {
      // 对容器内的所有文本节点做日期转换
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        processTextNode(node);
      }
    }
  }

  // ─────────────────────────────────────────────
  //  MutationObserver 监听（新增节点自动处理）
  // ─────────────────────────────────────────────

  let _observer = null;

  function startWatching() {
    if (_observer) return;
    _observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            localizeSubtree(/** @type {Element} */ (node));
          } else if (node.nodeType === Node.TEXT_NODE && isInDateContainer(node) && !isInIgnoredArea(node)) {
            processTextNode(/** @type {Text} */ (node));
          }
        }
        // 字符数据变化（如动态倒计时）
        if (m.type === 'characterData' && isInDateContainer(m.target) && !isInIgnoredArea(m.target)) {
          processTextNode(m.target);
        }
      }
    });

    _observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // ─────────────────────────────────────────────
  //  公共接口
  // ─────────────────────────────────────────────

  const DateLocalizer = {
    /**
     * 初始化日期本地化，执行首次扫描并开启动态监听。
     * 应在 DOMContentLoaded 之后调用。
     */
    init() {
      localizeSubtree(document.documentElement);
      startWatching();
    },

    /**
     * 手动对指定子树执行日期本地化（供外部调用）。
     * @param {Element} root
     */
    localizeSubtree,

    /**
     * 暴露转换函数，方便单元测试。
     * @param {string} text
     * @returns {string|null}
     */
    convert: convertDateString,

    /**
     * 尝试对不在日期白名单容器内的短文本节点进行日期转换。
     * 供翻译引擎在翻译文本节点时调用，作为日期白名单的补充。
     * @param {Text} node
     * @returns {boolean} 是否成功转换
     */
    tryConvertGenericTextNode,

    /**
     * 允许外部代码追加自定义日期容器选择器。
     * @param {...string} selectors
     */
    addContainerSelectors(...selectors) {
      DATE_CONTAINER_SELECTORS.push(...selectors);
    },

    /**
     * 允许外部代码追加黑名单选择器（防止误伤）。
     * @param {...string} selectors
     */
    addIgnoreSelectors(...selectors) {
      DATE_IGNORE_SELECTORS.push(...selectors);
    },
  };

  global.NexusDateLocalizer = DateLocalizer;

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
