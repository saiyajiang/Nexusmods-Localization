// ==UserScript==
// @name         Nexusmods Localization
// @name:zh-CN   Nexus Mods 多语言本地化
// @namespace    https://github.com/yourusername/Nexusmods-Localization
// @version      1.0.0
// @description  Localization support for Nexus Mods. Built-in Simplified Chinese. Supports custom language packs via the NexusLocales interface.
// @description:zh-CN  Nexus Mods 网站多语言本地化，内置简体中文，支持自定义语言包接口
// @author       Nexusmods-Localization Contributors
// @license      MIT
// @homepageURL  https://github.com/yourusername/Nexusmods-Localization
// @supportURL   https://github.com/yourusername/Nexusmods-Localization/issues
// @match        https://www.nexusmods.com/*
// @match        https://nexusmods.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
//
// @require      https://raw.githubusercontent.com/yourusername/Nexusmods-Localization/main/src/core.js
// @require      https://raw.githubusercontent.com/yourusername/Nexusmods-Localization/main/src/date-localizer.js
// @require      https://raw.githubusercontent.com/yourusername/Nexusmods-Localization/main/locales/zh-CN.js
//
// ==UserScript==

/**
 * Nexusmods-Localization — 主入口
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  模块说明                                                     │
 * │  core.js            翻译引擎（词典匹配、DOM 遍历、MutationObserver）│
 * │  date-localizer.js  日期本地化（严格白名单，绝不碰游戏/Mod 名称）  │
 * │  locales/zh-CN.js   简体中文语言包                              │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 自定义语言包接口：
 *   在本脚本执行前，向 window.NexusLocales 注入你的语言包对象即可。
 *   结构参考 locales/zh-CN.js。
 *
 *   示例（在另一个油猴脚本中，@run-at document-start）：
 *     window.NexusLocales = window.NexusLocales || {};
 *     window.NexusLocales['ja'] = { _conf: {...}, public: {...}, ... };
 *
 *   然后在本脚本设置中将语言切换为 'ja'，或调用：
 *     NexusLocalization_instance.switchLang('ja');
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  //  用户配置（通过 GM 存储持久化）
  // ─────────────────────────────────────────────

  /**
   * 当前激活的语言代码。
   * 默认 'zh-CN'；用户可通过油猴菜单切换。
   */
  const CURRENT_LANG = GM_getValue('nx_lang', 'zh-CN');

  /**
   * 是否启用日期本地化（默认开启）。
   */
  const DATE_L10N_ENABLED = GM_getValue('nx_date_l10n', true);

  // ─────────────────────────────────────────────
  //  辅助：从 NexusLocales 获取语言包
  // ─────────────────────────────────────────────

  function getLocale(lang) {
    const locales = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).NexusLocales || {};
    return locales[lang] || null;
  }

  // ─────────────────────────────────────────────
  //  油猴菜单
  // ─────────────────────────────────────────────

  function registerMenuCommands() {
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const locales = w.NexusLocales || {};
    const langList = Object.keys(locales);

    // 语言切换菜单
    langList.forEach(lang => {
      const isActive = lang === CURRENT_LANG;
      GM_registerMenuCommand(
        `${isActive ? '✓ ' : ''}${lang}`,
        () => {
          GM_setValue('nx_lang', lang);
          location.reload();
        }
      );
    });

    // 日期本地化开关
    GM_registerMenuCommand(
      `日期本地化：${DATE_L10N_ENABLED ? '开启 ✓' : '关闭'}`,
      () => {
        GM_setValue('nx_date_l10n', !DATE_L10N_ENABLED);
        location.reload();
      }
    );
  }

  // ─────────────────────────────────────────────
  //  主流程
  // ─────────────────────────────────────────────

  function main() {
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // 1. 注册菜单（可在 document-start 时机执行）
    registerMenuCommands();

    // 2. 获取目标语言包
    const locale = getLocale(CURRENT_LANG);
    if (!locale) {
      console.warn(`[NexusLocalization] 未找到语言包：${CURRENT_LANG}`);
      return;
    }

    // 3. 启动翻译引擎
    //    NexusLocalization 由 core.js @require 注入
    const engine = new w.NexusLocalization();
    engine.init(locale);

    // 4. 启动日期本地化（独立模块，与翻译引擎完全解耦）
    //    NexusDateLocalizer 由 date-localizer.js @require 注入
    if (DATE_L10N_ENABLED && w.NexusDateLocalizer) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          w.NexusDateLocalizer.init();
        });
      } else {
        w.NexusDateLocalizer.init();
      }
    }

    // 暴露实例，供外部脚本调用
    w.NexusLocalization_instance = engine;
  }

  main();

})();
