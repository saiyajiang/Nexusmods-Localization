// ==UserScript==
// @name         Nexusmods Localization
// @name:zh-CN   Nexus Mods 本地化
// @namespace    https://github.com/saiyajiang/Nexusmods-Localization
// @version      0.3.0
// @description  Localization support for Nexus Mods. Built-in Simplified Chinese. Supports Excel-based custom translation.
// @description:zh-CN  Nexus Mods 网站本地化，内置简体中文，支持 Excel 自定义翻译
// @author       saiyajiang
// @license      MIT
// @homepageURL  https://github.com/saiyajiang/Nexusmods-Localization
// @supportURL   https://github.com/saiyajiang/Nexusmods-Localization/issues
// @match        https://www.nexusmods.com/*
// @match        https://nexusmods.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @antifeature  adult-content 此脚本运行于包含成人内容的网站（Nexus Mods）
// ==/UserScript==

/**
 * Nexusmods-Localization — 油猴脚本
 * @license MIT
 *
 * ⚠️  声明：本项目代码由 AI 辅助生成。
 *
 * 原项目参考：https://github.com/SychO3/nexusmods-chinese (v0.2.2, MIT License)
 *
 * 架构说明：
 *   翻译词条存储在 GM_setValue 中（持久化），来源：
 *     1. 内置默认词条（脚本代码中的 DEFAULT_TRANSLATIONS）
 *     2. 用户导入的 Excel/CSV 词条（覆盖默认值）
 *   用户可通过油猴菜单导入/导出 CSV 文件来自定义翻译。
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════
  //  存储键名
  // ═══════════════════════════════════════════════
  const STORAGE_KEY = 'nx_translations';       // 所有翻译词条 { english: chinese }
  const CUSTOM_KEY = 'nx_custom_translations';  // 仅用户自定义的词条
  const DATE_L10N_KEY = 'nx_date_l10n';
  const LANG_KEY = 'nx_lang';  // 语言偏好：'zh-CN' | 'en' | 'auto'
  const TIME24_KEY = 'nx_time24';  // 时间格式：true=24小时制, false=12小时制(AM/PM)

  // ═══════════════════════════════════════════════
  //  语言检测与选择
  //  auto  → 检测 navigator.language，zh 开头用中文，否则英文（不翻译）
  //  zh-CN → 强制简体中文
  //  en    → 强制英文（跳过所有翻译）
  // ═══════════════════════════════════════════════
  function resolveLanguage() {
    const pref = GM_getValue(LANG_KEY, 'auto');
    if (pref === 'zh-CN') return 'zh-CN';
    if (pref === 'en') return 'en';
    // auto: 检测浏览器/系统语言
    const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return nav.startsWith('zh') ? 'zh-CN' : 'en';
  }

  const CURRENT_LANG = resolveLanguage();

  // ═══════════════════════════════════════════════
  //  Toast 通知（替代 alert/confirm）
  // ═══════════════════════════════════════════════
  function showToast(msg, type = 'info', duration = 2500) {
    const colors = {
      info:    'background:#2563eb;color:#fff',
      success: 'background:#16a34a;color:#fff',
      error:   'background:#dc2626;color:#fff',
      warning: 'background:#d97706;color:#fff',
    };
    let container = document.getElementById('nx-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'nx-toast-container';
      container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `${colors[type] || colors.info};padding:10px 18px;border-radius:8px;font-size:14px;line-height:1.5;box-shadow:0 4px 12px rgba(0,0,0,.3);opacity:0;transition:opacity .3s;pointer-events:auto;max-width:360px;word-break:break-word;`;
    container.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  function showConfirm(msg, onConfirm, onCancel) {
    let container = document.getElementById('nx-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'nx-toast-container';
      container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const box = document.createElement('div');
    box.style.cssText = 'background:#1e293b;color:#f1f5f9;padding:16px 20px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.4);font-size:14px;line-height:1.6;max-width:360px;pointer-events:auto;';
    const msgEl = document.createElement('div');
    msgEl.textContent = msg;
    msgEl.style.marginBottom = '12px';
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
    const btnConfirm = document.createElement('button');
    btnConfirm.textContent = '确定';
    btnConfirm.style.cssText = 'padding:6px 16px;border-radius:6px;border:none;cursor:pointer;font-size:13px;background:#dc2626;color:#fff;';
    const btnCancel = document.createElement('button');
    btnCancel.textContent = '取消';
    btnCancel.style.cssText = 'padding:6px 16px;border-radius:6px;border:1px solid #475569;cursor:pointer;font-size:13px;background:transparent;color:#94a3b8;';
    btnConfirm.onclick = () => { box.remove(); onConfirm && onConfirm(); };
    btnCancel.onclick = () => { box.remove(); onCancel && onCancel(); };
    btns.appendChild(btnCancel);
    btns.appendChild(btnConfirm);
    box.appendChild(msgEl);
    box.appendChild(btns);
    container.appendChild(box);
  }
  const IGNORE_SELECTORS = [
    '.mod_description_container',
    '.prose-lexical.prose',
    '.collection_description',
    '.changelog',
    '[data-no-i18n]',
    'script', 'style', 'textarea', 'input',
    // Material Icons 字体图标：DOM 文本是图标名（如 close/menu），不能翻译否则字体渲染失败
    '.material-icons', '.material-icons-outlined', '.material-icons-round',
    '.material-icons-sharp', '.material-icons-two-tone', '.material-symbols-outlined',
    '.material-symbols-rounded', '.material-symbols-sharp',
  ];
  // 扫描专用排除区域（只排除确定不该翻译的整块区域）
  const SCAN_IGNORE_SELECTORS = [
    // 翻译排除区（继承）
    ...IGNORE_SELECTORS,
    // Footer 版权区
    'footer', '[class*="footer"]',
    // 评论区
    '.comment-body', '.comment-content',
  ];
  const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label', 'data-tooltip'];

  // ═══════════════════════════════════════════════
  //  内置默认翻译词条
  //  格式：{ "English text": "中文翻译" }
  //  不分页面，全局匹配，简单粗暴但可靠
  //
  //  正则模板词条（REGEXP_TRANSLATIONS）：
  //  匹配带变量的文本，如 "Welcome back, xxx" → "欢迎回来, xxx"
  //  格式：[正则, 替换函数]
  // ═══════════════════════════════════════════════
  const REGEXP_TRANSLATIONS = [
    // Welcome back, {username} — 完整版
    [/^Welcome back,\s*(.+)$/i, (m) => `欢迎回来，${m[1]}`],
    // Welcome back, — 半截版（用户名在不同文本节点）
    [/^Welcome back,$/i, () => '欢迎回来，'],
    // Welcome, {username}
    [/^Welcome,\s*(.+)$/i, (m) => `欢迎，${m[1]}`],
    // {count} new notifications
    [/^(\d+)\s+new notifications?$/i, (m) => `${m[1]} 条新通知`],
    // {count} new messages
    [/^(\d+)\s+new messages?$/i, (m) => `${m[1]} 条新消息`],
    // {count} mods updated
    [/^(\d+)\s+mods? updated$/i, (m) => `${m[1]} 个模组已更新`],
    // {count} comments
    [/^(\d+)\s+comments?$/i, (m) => `${m[1]} 条评论`],
    // {count} endorsements
    [/^(\d+)\s+endorsements?$/i, (m) => `${m[1]} 次认可`],
    // {count} downloads
    [/^(\d+)\s+downloads?$/i, (m) => `${m[1]} 次下载`],
    // {count} views
    [/^(\d+)\s+views?$/i, (m) => `${m[1]} 次浏览`],
    // {count} followers
    [/^(\d+)\s+followers?$/i, (m) => `${m[1]} 个关注者`],
    // {count} results
    [/^(\d+)\s+results?$/i, (m) => `${m[1]} 个结果`],
    // Uploaded by {author}
    [/^Uploaded by\s+(.+)$/i, (m) => `上传者：${m[1]}`],
    // Uploaded by（无作者名，碎片文本）
    [/^Uploaded by$/i, () => '上传者：'],
    // Created by {author}
    [/^Created by\s+(.+)$/i, (m) => `创建者：${m[1]}`],
    // Updated {time} ago
    [/^Updated\s+(\d+\s+\w+\s+ago)$/i, (m) => `更新于 ${m[1]}`],
    // Posted {time} ago
    [/^Posted\s+(\d+\s+\w+\s+ago)$/i, (m) => `发布于 ${m[1]}`],
    // {count} mods in collection
    [/^(\d+)\s+mods? in (?:this )?collection$/i, (m) => `${m[1]} 个模组在此合集中`],
    // {game} - {count} mods
    [/^-\s*(\d+)\s+mods?$/i, (m) => `- ${m[1]} 个模组`],
    // by {author}
    [/^by\s+(.+)$/i, (m) => `由 ${m[1]}`],
    // {count}k (如 10.1k 认可数)
    [/^(\d+\.?\d*)k$/i, (m) => `${m[1]}k`],
    // Mark all as read (N) — 通知面板按钮碎片
    [/^Mark all as read \((\d+)\)$/i, (m) => `全部标为已读 (${m[1]})`],
    // {count} items
    [/^(\d+)\s+items?$/i, (m) => `${m[1]} 个条目`],
    // Category: {name}
    [/^Category:\s*(.+)$/i, (m) => `分类：${m[1]}`],
    // You haven't downloaded this mod yet
    [/^You haven't downloaded this mod yet$/i, () => '你尚未下载此模组'],
    // Report Abuse
    [/^Report Abuse$/i, () => '举报滥用'],
    // Permissions and credits
    [/^Permissions and credits$/i, () => '使用权限与致谢'],
    // Original upload
    [/^Original upload$/i, () => '原始上传'],
    // Tags for this mod
    [/^Tags for this mod$/i, () => '此模组的标签'],
    // Tag this mod
    [/^Tag this mod$/i, () => '标记此模组'],
    // content blocking settings
    [/^content blocking settings$/i, () => '内容屏蔽设置'],
    // {Game Name} images (标题中的图片后缀)
    [/^(.+)\s+images$/i, (m) => `${m[1]} 图片`],
    // {count} results (纯数字+results，非正则已有但保险)
  ];

  const DEFAULT_TRANSLATIONS = {
    // 导航
    'Home': '首页', 'Games': '游戏', 'Mods': '模组', 'Collections': '合集',
    'News': '资讯', 'Forums': '论坛', 'Premium': '高级会员',
    'Log in': '登录', 'Sign up': '注册', 'Sign out': '退出登录',
    'Sign Up': '注册', 'Log out': '退出',
    'My account': '我的账户', 'My profile': '我的主页',
    'My mods': '我的模组', 'My collections': '我的合集', 'My games': '我的游戏',
    'My images': '我的图片', 'My videos': '我的视频',
    'My media': '我的媒体', 'My wallet': '我的钱包',
    'Dashboard': '控制台', 'Settings': '设置', 'Notifications': '通知', 'Messages': '消息',

    // 通用按钮
    'Search': '搜索', 'Search mods': '搜索模组',
    'Submit': '提交', 'Cancel': '取消', 'Confirm': '确认',
    'Save': '保存', 'Save changes': '保存更改',
    'Delete': '删除', 'Edit': '编辑',
    // 注意：不翻译 'Close' 纯文本，避免关闭按钮 ✕ 被替换成"关闭"文字
    // aria-label="Close" 由 _translateAttributes 的 CLOSE_ARIA_LABELS 白名单处理
    'Close dialog': '关闭对话框', 'Close menu': '关闭菜单',
    'Close panel': '关闭面板', 'Close modal': '关闭弹窗',
    'Close notification': '关闭通知', 'Close search': '关闭搜索',
    'Back': '返回', 'Next': '下一步', 'Previous': '上一步',
    'Continue': '继续', 'Done': '完成', 'Apply': '应用',
    'Reset': '重置', 'Clear': '清除', 'Filter': '筛选', 'Sort by': '排序方式',
    'View all': '查看全部', 'Show more': '显示更多', 'Show less': '显示更少',
    'Load more': '加载更多', 'Copy': '复制', 'Share': '分享',
    'Report': '举报', 'Follow': '关注', 'Unfollow': '取消关注',

    // 下载
    'Download': '下载', 'Downloads': '下载量',
    'Manual Download': '手动下载', 'Mod Manager Download': '模组管理器下载',
    'Slow Download': '普通下载', 'Fast Download': '快速下载',
    'Download file': '下载文件', 'Download history': '下载历史',
    'Total downloads': '总下载量',

    // 上传
    'Upload': '上传', 'Upload file': '上传文件',
    'Uploaded': '已上传', 'Uploaded by': '上传者：',
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
    'Description': '描述', 'Files': '文件', 'Images': '图片', 'images': '图片',
    'Videos': '视频', 'Articles': '文章', 'Comments': '评论',
    'Reviews': '评价', 'Changelog': '更新日志',
    'Permissions': '使用权限', 'Requirements': '前置要求',
    'Tags': '标签', 'Bugs': '问题反馈', 'Logs': '日志',
    'Stats': '统计', 'Credits': '致谢',
    'About this mod': '关于本模组', 'About this collection': '关于本合集',

    // 表单
    'Email': '邮箱', 'Email address': '电子邮箱', 'Password': '密码',
    'Username': '用户名', 'Name': '名称', 'Title': '标题',
    'Optional': '可选', 'Required': '必填',
    'Search...': '搜索…', 'Search mods...': '搜索模组…',

    // 统计
    'views': '次浏览', 'View': '浏览', 'Views': '浏览量',
    'endorsements': '次认可', 'Endorsements': '认可数',
    'Unique downloads': '独立下载', 'Total unique downloads': '总独立下载',
    'Followers': '关注者', 'Following': '正在关注',
    'Members': '成员', 'Posts': '帖子',

    // 时间
    'Today': '今天', 'Yesterday': '昨天',
    'This week': '本周', 'This month': '本月', 'This year': '今年',
    'All time': '历史总计',

    // 通知
    'New comment': '新评论', 'New reply': '新回复',
    'New endorsement': '新认可', 'New follower': '新关注者',
    'Mod updated': '模组已更新', 'Mark all as read': '全部标为已读',
    'No notifications': '暂无通知',
    'No unread notifications right now': '当前没有未读通知',
    "You're up to date": '你已全部阅读',
    'See All': '查看全部', 'See all': '查看全部',
    'Oh dear! Something has gone wrong!': '糟糕！出了点问题！',
    'Try reloading the notifications.': '请尝试重新加载通知。',
    'Notification preferences': '通知偏好',

    // 杂项
    'Version': '版本', 'Author': '作者', 'Authors': '作者',
    'Size': '大小', 'Language': '语言', 'Website': '网站',
    'Source code': '源代码', 'License': '许可证',
    'Adult content': '成人内容', 'NSFW': '成人内容',
    'Spoiler': '剧透', 'Pinned': '已置顶', 'Stickied': '已置顶',
    'Locked': '已锁定', 'Closed': '已关闭', 'Open': '开放',
    'Free': '免费', 'Paid': '付费', 'Featured': '精选',

    // 首页欢迎区
    'Welcome back': '欢迎回来', 'Welcome': '欢迎',
    'Tracking centre': '追踪中心', 'Activity feed': '动态',
    'Your feed': '你的动态', 'Recommended mods': '推荐模组',
    'Recently viewed': '最近浏览', 'Favourite games': '收藏游戏',
    'Browse': '浏览', 'Explore': '探索',
    'Go premium': '开通高级会员', 'Sign in': '登录',
    'Create an account': '创建账户',
    'Download mods': '下载模组', 'Mod manager': '模组管理器',
    'My content': '我的内容', 'My content library': '我的内容库',
    'Content library': '内容库', 'My download history': '我的下载历史',
    'Account details': '账户详情', 'Site preferences': '网站偏好',
    'Blocked users': '已屏蔽用户', 'Blocked authors': '已屏蔽作者',
    'Notification preferences': '通知偏好', 'Privacy': '隐私',
    'Content controls': '内容控制', 'Search filters': '搜索筛选',
    'Manage tracked mods': '管理追踪模组', 'Manage tracked games': '管理追踪游戏',
    'Tracked mods': '追踪的模组', 'Tracked games': '追踪的游戏',
    'Premium membership': '高级会员资格', 'Supporter membership': '支持者会员',
    'Free downloads': '免费下载', 'No cooldown': '无冷却',
    'Download history': '下载历史',

    // 首页/通用UI
    'Featured mods': '精选模组', 'Featured collections': '精选合集',
    'Latest mods': '最新模组', 'Popular games': '热门游戏',
    'Trending mods': '趋势模组', 'New and updated mods': '新增与更新模组',
    'Browse all games': '浏览全部游戏', 'Browse all mods': '浏览全部模组',
    'Explore Nexus Mods': '探索 Nexus Mods', 'Join the community': '加入社区',
    'Discover the best mods': '探索最佳模组',
    'Safe to use': '安全使用', 'Totally free': '完全免费',
    'Community-driven': '社区驱动',
    'Skip to content': '跳到内容',
    'Media': '媒体', 'Community': '社区', 'Support': '支持',
    'Open profile menu': '打开个人菜单',
    'Show notifications': '显示通知', 'View messages': '查看消息',
    'Open navigation menu': '打开导航菜单', 'Show search': '显示搜索',
    'Add game': '添加游戏',
    'Find out more': '了解更多',
    'Latest news': '最新资讯',
    'Get fast downloads with': '使用快速下载',
    'Try Premium for free': '免费试用高级会员',
    'auto-install collections': '自动安装合集',
    'uncapped download speeds': '不限速下载',
    'browse ad-free': '无广告浏览',
    'Start free trial': '开始免费试用',
    // Premium 广告区完整句子（碎片 span 合并后匹配）
    'Try Premium for free to auto-install collections, get uncapped download speeds and browse ad-free.': '免费试用高级会员以自动安装合集、不限速下载和无广告浏览。',
    'Get fast downloads with Premium': '使用高级会员快速下载',
    'Use Premium for fast downloads': '使用高级会员快速下载',
    // 已部分翻译的碎片合并文本（延迟调用/MutationObserver 时部分已翻译）
    '免费试用高级会员 to 自动安装合集, get 不限速下载 and 无广告浏览.': '免费试用高级会员以自动安装合集、不限速下载和无广告浏览。',
    '使用快速下载 高级会员': '使用高级会员快速下载',
    'Make mods.': '制作模组。',
    'Earn rewards.': '获得奖励。',
    'Cash payouts': '现金奖励',
    'Free Premium': '免费高级会员',
    'Statistics': '统计信息',
    'Careers': '招聘',
    'About us': '关于我们',
    'Premium features': '高级功能',
    'Discover': '发现',
    'All collections': '所有合集', 'All images': '所有图片',
    'Help': '帮助',
    'API': 'API',
    'Feedback': '反馈',
    'Report a bug': '报告问题',
    'Unban requests': '解封申请',
    'DMCA': 'DMCA',
    'Manage cookie settings': '管理 Cookie 设置',
    'Follow us on Twitter': '在 Twitter 上关注我们',
    'Follow us on TikTok': '在 TikTok 上关注我们',
    'Follow us on Twitch': '在 Twitch 上关注我们',
    'Follow us on Youtube': '在 YouTube 上关注我们',
    'Follow us on Instagram': '在 Instagram 上关注我们',
    'Join us on Discord': '加入我们的 Discord',
    'Discord': 'Discord',
    'Support authors': '支持作者',
    'Contact us': '联系我们',
    'Support Nexus Mods': '支持 Nexus Mods',
    'Network stats': '网络统计',
    'Kudos': '感谢',
    'Server info': '服务器信息',
    'Terms of Service': '服务条款',
    'Privacy Policy': '隐私政策',
    'Popular mods': '热门模组',
    'View more': '查看更多',
    'Buy now': '立即购买',
    'Affiliate link': '推广链接',
    'Mods filter': '模组筛选', 'Time': '时间',
    'Media filter': '媒体筛选',
    'Mod options': '模组选项',
    'Clear game filter': '清除游戏筛选',
    'authenticated': '已认证',
    'Desktop footer': '桌面端页脚',
    'Breadcrumb navigation': '面包屑导航',
    'Downloaded': '已下载',
    'New': '新',
    'premium': '高级会员',
    'Top pick': '精选推荐',
    'Easy install': '轻松安装',
    'MOD REQUEST': '模组请求',
    'Site News': '站点资讯',
    'No. of endorsements': '认可数',
    'My Games': '我的游戏',
    'Surprise': '惊喜',

    // 模组分类标签（出现在卡片上，是 UI 文本不是用户内容）
    'Utilities': '实用工具', 'Armour and Clothing': '盔甲与服装',
    'Armour': '盔甲', 'Clothing': '服装',
    'Modding Tools': '模组工具', 'Addons': '附加组件',
    'Visuals': '视觉效果', 'Environment': '环境',
    'Gameplay': '游戏玩法', 'Characters': '角色',
    'Animations': '动画', 'Weapons': '武器',
    'Mod Organizer 2 Plugins': 'MO2 插件',
    'Dress for Fem V': '女性V服装',
    'For FemV': '女性V',
    'Adult': '成人',

    // 导航下拉菜单
    'Recently added': '最近添加',
    'MOD UPDATES': '模组更新',
    'Mod rewards': '模组奖励',
    'MODDING TUTORIALS': '模组教程',
    'Learn from the community with tutorials and guides.': '通过教程和指南向社区学习。',
    'VORTEX MOD MANAGER': 'Vortex 模组管理器',
    'The elegant, powerful and open-source mod manager.': '优雅、强大且开源的模组管理器。',
    'COLLECTIONS TUTORIALS': '合集教程',
    'Highest rated': '最高评分',
    'SUPPORTER IMAGES': '支持者图片',
    'Upgrade your account to unlock all media content.': '升级账户以解锁所有媒体内容。',
    'Upgrade': '升级',
    'Upload image': '上传图片',
    'Upload video': '上传视频',
    'All news': '全部新闻',
    'Site news': '网站资讯',
    'Competitions': '竞赛',
    'Interviews': '访谈',
    'Game guides': '游戏指南',
    'Tutorial': '教程',
    'Tools': '工具',
    'Vortex help': 'Vortex 帮助',
    'Install Vortex': '安装 Vortex',
    'GIVE FEEDBACK': '提供反馈',
    'Give Feedback': '提供反馈',
    'Give feedback': '提供反馈',
    'Share your ideas, discuss them with the community, and cast your vote on feedback provided.': '分享你的想法，与社区讨论，并对提供的反馈投票。',
    'Contact': '联系',
    'MY STUFF': '我的内容',
    'My stuff': '我的内容',
    'Member': '会员',
    'Try premium free': '免费试用高级会员',
    // 导航下拉菜单补充（从 DOM 发现的 Title Case 版本）
    'Mod updates': '模组更新',
    'Modding tutorials': '模组教程',
    'Vortex mod manager': 'Vortex 模组管理器',
    'Collections tutorials': '合集教程',
    'Supporter images': '支持者图片',
    'Top files': '热门文件',
    'Recent activity': '最近活动',
    'Mod categories': '模组分类',
    'Mods of the month': '本月精选模组',
    'Explore this month\'s nominated mods.': '探索本月提名的模组。',
    // 导航/通用补充（从实际 DOM 发现）
    'Upload mod': '上传模组',
    'Tracking centre': '追踪中心',
    'Trending': '趋势',
    'Most endorsed': '最多认可',
    'New': '新',
    'Authenticated': '已认证',
    // 搜索弹窗
    'All content': '全部内容',
    'Search mods, games, collections, images & videos': '搜索模组、游戏、合集、图片和视频',
    'Customise your search preferences': '自定义搜索偏好',
    'Enter': '确认',
    'Select': '选择',
    'Move': '移动',

    // Images 页面下拉/筛选（v0.2.5 新增）
    '24 Hours': '24 小时', '7 Days': '7 天', '14 Days': '14 天',
    '28 Days': '28 天', '1 Year': '1 年',
    'Most viewed': '最多浏览',
    'Sort direction': '排序方向',
    'Desc': '降序', 'Asc': '升序',
    '20 Items': '20 条', '40 Items': '40 条',
    '60 Items': '60 条', '80 Items': '80 条',
    'Content options': '内容选项',
    'Hide adult content': '隐藏成人内容',
    'Show only adult content': '仅显示成人内容',
    'Clear all': '全部清除',
    'View results': '查看结果',
    'Remove filter for': '移除筛选：',
    'Filters panel': '筛选面板',
    'Media per page': '每页媒体数',
    'Games per page': '每页游戏数',
    'Previous page': '上一页', 'Next page': '下一页',
    'Pagination navigation': '分页导航',
    'Go to previous page': '前往上一页',
    'Go to next page': '前往下一页',
    'Go to page': '前往第',
    'Jump to page': '跳转到页',
    'Bookmark': '收藏',
    'Time range': '时间范围',
    'From': '从', 'To': '至',

    // Games 页面（v0.2.5 补充）
    'Search game': '搜索游戏',

    // Images 页面通用词条（v0.2.6 补充）
    'Get more with Premium': '使用高级会员获取更多',
    'Share image': '分享图片',
    'Report image': '举报图片',
    'Download image': '下载图片',
    'Full size': '原尺寸',
    'Upload images': '上传图片',
    'Gallery': '图库',
    'Favourite': '收藏',
    'Unfavourite': '取消收藏',
    'Add to favourites': '添加到收藏',
    'Remove from favourites': '从收藏中移除',
    // Images 页面通用词条（v0.2.7 补充）
    'Some images may be hidden': '部分图片可能被隐藏',
    'Images may be hidden': '图片可能被隐藏',
    'The best screen archery on the internet': '互联网上最好的游戏截图',

    // 模组详情（v0.2.8 补充）
    'Locations': '位置',
    'Original File': '原始文件',
    'Add media': '添加媒体',
    'Track': '追踪',
    'Vote': '投票',
    'Manual': '手动',
    'Original upload': '原始上传',
    'Tags for this mod': '此模组的标签',
    'Tag this mod': '标记此模组',
    'You haven\'t downloaded this mod yet': '你尚未下载此模组',
    'Report Abuse': '举报滥用',
    'Permissions and credits': '使用权限与致谢',
    'Requirements and permissions': '前置与权限',
    'File information': '文件信息', 'Main files': '主文件',
    'Optional files': '可选文件', 'Old versions': '旧版本',
    'Miscellaneous': '其他文件', 'FOMOD installer': 'FOMOD 安装包',
    'Add to collection': '添加到合集', 'Remove from collection': '从合集移除',
    'Track this mod': '追踪此模组', 'Stop tracking': '停止追踪',
    'Report this mod': '举报此模组', 'Endorse this mod': '认可此模组',
    'Mod details': '模组详情', 'Mod page': '模组页面',
    'Original upload date': '首次上传日期', 'Last updated': '最后更新',
    'Virus scan': '病毒扫描',
    'Type': '类型',
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
    'Add comment': '添加评论', 'Add a new comment': '添加新评论',
    'Post your comment': '发表评论', 'Show replies': '显示回复',
    'Use emoticons': '使用表情', 'Submit Comment': '提交评论',
    'Hide replies': '隐藏回复', 'Reply': '回复', 'Quote': '引用',
    'Edit comment': '编辑评论', 'Delete comment': '删除评论',
    'Report comment': '举报评论', 'No comments yet': '暂无评论',
    'Be the first to comment': '成为第一个评论的人',
    'Write a review': '撰写评价', 'Your review': '您的评价',
    'Overall rating': '综合评分', 'No reviews yet': '暂无评价',
    'Submitted': '已提交',
    'This is an adult content mod': '这是成人内容模组',
    'Endorse': '认可', 'Endorsed': '已认可', 'Abstain': '弃权',

    // 模组列表
    'Relevance': '相关性',
    'Date added': '上传日期', 'Date updated': '更新日期',
    'Rating': '评分', 'File size': '文件大小', 'All categories': '全部分类',
    'Filter by': '按条件筛选', 'Clear filters': '清除筛选',
    'Show NSFW': '显示成人内容', 'Hide NSFW': '隐藏成人内容',
    'Results per page': '每页显示',
    'No mods found': '未找到模组', 'Try adjusting your search': '尝试调整搜索条件',

    // 图片详情页
    'Total views': '总浏览量',
    'Image information': '图片信息',
    'Added on': '添加时间',
    'More images': '更多图片',
    'About this image': '关于此图片',
    'View more from uploader': '查看上传者的更多图片',
    'See who endorsed this image': '查看谁认可了此图片',
    'Click to endorse this image': '点击认可此图片',

    // 合集
    'About this collection': '关于本合集', 'Mods in this collection': '合集中的模组',
    'Curated by': '由…整理', 'Collection requirements': '合集前置要求',
    'Install collection': '安装合集', 'Add to library': '添加到库',
    'Remove from library': '从库中移除',
    'Revision': '修订版本', 'Revisions': '修订历史',
    'View revisions': '查看修订历史',
    'Mods included': '包含模组',
    'Required mods': '必需模组', 'Optional mods': '可选模组',
    'No description': '暂无描述',
    'Collection stats': '合集统计', 'Installs': '安装次数',
    'Browse collections': '浏览合集', 'New collections': '最新合集',
    'Top collections': '最热合集', 'Date created': '创建日期',

    // 游戏
    'Browse mods': '浏览模组', 'Top mods': '热门模组',
    'New mods': '最新模组', 'Total mods': '模组总数',
    'Total endorsements': '总认可数',
    'Forum': '论坛', 'Wiki': '维基',
    'Game details': '游戏详情', 'Release date': '发行日期',
    'Genre': '类型', 'Developer': '开发商', 'Publisher': '发行商',
    'Platforms': '平台', 'Track this game': '追踪此游戏',
    'Stop tracking this game': '停止追踪',

    // 游戏列表页
    'Choose from': '选择',
    'games to mod': '款可模组化的游戏',
    'Get games to mod, cheaper.': '更便宜地获取可模组化的游戏。',
    'Discover offers': '发现优惠',
    'Hide filters': '隐藏筛选',
    'Show filters': '显示筛选',
    'Game genre': '游戏类型',
    'Game genre search': '搜索游戏类型',
    'Vortex Support': 'Vortex 支持',
    'Supported by Vortex': 'Vortex 支持',
    'Show games with Collections': '显示有合集的游戏',
    'No. of mods': '模组数',
    'No. of collections': '合集数',
    'Download count': '下载量',
    'Sort': '排序',
    'Page': '页',
    'Go': '跳转',
    // Images 分类（v0.2.8 补充）
    'Character Presets': '角色预设',
    'Cityscape': '城市景观',
    'Misc': '杂项',
    'Official': '官方',
    'Wallpapers': '壁纸',
    // 游戏类型
    'Action': '动作', 'Adventure': '冒险', 'ARPG': 'ARPG',
    'Dungeon crawl': '地牢探索', 'Fighting': '格斗',
    'FPS': 'FPS', 'Hack and Slash': '砍杀', 'Horror': '恐怖',
    'Indie': '独立', 'Metroidvania': '银河恶魔城', 'MMORPG': 'MMORPG',
    'Music': '音乐', 'Platformer': '平台', 'Puzzle': '解谜',
    'Racing': '竞速', 'Roguelike': 'Roguelike', 'RPG': 'RPG',
    'Sandbox': '沙盒', 'Simulation': '模拟', 'Space sim': '太空模拟',
    'Sports': '体育', 'Stealth': '潜行', 'Strategy': '策略',
    'Survival': '生存', 'Third-Person Shooter': '第三人称射击',
    'Visual Novel': '视觉小说',
    'results': '个结果',

    // 搜索
    'Search results': '搜索结果', 'All results': '全部结果',
    'Users': '用户',
    'Did you mean': '您是否想搜索', 'No results for': '未找到与之匹配的结果：',
    'Try a different search': '请尝试其他关键词', 'Advanced search': '高级搜索',

    // 高级会员
    'Go Premium': '开通高级会员',
    'Premium Member': '高级会员', 'Supporter': '支持者',
    'Benefits': '权益', 'Features': '功能',
    'Fast downloads': '快速下载', 'No ads': '无广告',
    'Priority support': '优先支持', 'Ad-free browsing': '无广告浏览',
    'Unlimited collections': '无限合集',
    'Per month': '每月', 'Per year': '每年', 'Billed annually': '按年结算',
    'Cancel anytime': '随时取消', 'Most popular': '最受欢迎',
    'Get started': '立即开始', 'Learn more': '了解更多',
    'Already a member?': '已是会员？', 'Manage subscription': '管理订阅',

    // 账户
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
    'Wallet': '钱包', 'Balance': '余额', 'Transaction history': '交易记录',

    // 用户主页
    'Profile': '主页', 'Activity': '动态',
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
    "This user's profile is private": '该用户的主页已设为私密',
    'No mods uploaded': '暂未上传模组', 'No activity': '暂无动态',

    // 上传
    'Upload a mod': '上传模组', 'Edit mod': '编辑模组',
    'Upload an image': '上传图片', 'Add a video': '添加视频',
    // Upload 托盘碎片词条（HTML: UPLOAD A <strong>MOD</strong> 合并后匹配）
    'UPLOAD A MOD': '上传模组', 'UPLOAD AN IMAGE': '上传图片', 'ADD A VIDEO': '添加视频',
    'Mod name': '模组名称', 'Summary': '摘要',
    'Version number': '版本号',
    'Publish': '发布', 'Save as draft': '保存为草稿', 'Preview': '预览',
    'Add file': '添加文件', 'Remove file': '移除文件',
    'File name': '文件名', 'File type': '文件类型',
    'File description': '文件描述', 'Required files': '必需文件',
    'Main file': '主文件',
    'Old version': '旧版本', 'Image gallery': '图片图库',
    'Add image': '添加图片', 'Primary image': '主图',
    'Thumbnail': '缩略图', 'Credit other mods': '致谢其他模组',
    'Credit other users': '致谢其他用户', 'External credit': '外部致谢',
  };

  // ═══════════════════════════════════════════════
  //  日期本地化
  // ═══════════════════════════════════════════════
  const MONTH_MAP = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12,
  };
  // 日期容器选择器白名单：
  //   标准 <time> 元素 + Nexus Mods 常见 class + 更宽泛的 span/small/p 容器
  //   由于 Next.js SPA 的日期经常不在 <time> 标签内，
  //   需要覆盖更多可能的容器类型
  const DATE_SELECTORS = [
    'time',
    '.stat time',
    '.uploaded-time',
    '.last-updated time',
    '.mod-stats time',
    '[data-date]',
    '[data-timestamp]',
    '.notification-time',
    '.comment-time',
    '.review-date time',
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
  ].join(', ');
  const DATE_IGNORE = '.mod-title, h1.game-name, .game-title, a.mod-name, .collection-title, .mod_description_container, .prose-lexical.prose, .changelog, [data-no-date-i18n]';

  function pad2(n) { return String(n).padStart(2, '0'); }
  function to24Hour(h, ampm) {
    if (!ampm) return h;
    if (ampm === 'am') return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  }
  /** 将 24h 小时转为 12h 格式字符串，如 "7:15PM" */
  function to12Hour(h, min) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${pad2(min)}${ampm}`;
  }

  function convertDate(text) {
    const use24h = GM_getValue(TIME24_KEY, true); // 默认24小时制
    let m;
    // ── 1. "15 Nov 2025" / "15 November 2025" (可选时间)
    m = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i);
    if (m) {
      const mo = MONTH_MAP[m[2].toLowerCase()]; if (!mo) return null;
      const datePart = `${m[3]}-${pad2(mo)}-${pad2(parseInt(m[1],10))}`;
      if (m[4] !== undefined) {
        const h24 = to24Hour(parseInt(m[4],10), (m[6]||'').toLowerCase());
        const timePart = use24h ? `${pad2(h24)}:${m[5]}` : to12Hour(h24, parseInt(m[5],10));
        return `${datePart} ${timePart}`;
      }
      return datePart;
    }
    // ── 1b. "2026-04-22, 9:58PM" / "2026-04-22, 21:58" (ISO日期+时间)
    m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i);
    if (m) {
      const datePart = `${m[1]}-${m[2]}-${m[3]}`;
      if (m[4] !== undefined) {
        const h24 = to24Hour(parseInt(m[4],10), (m[6]||'').toLowerCase());
        const timePart = use24h ? `${pad2(h24)}:${m[5]}` : to12Hour(h24, parseInt(m[5],10));
        return `${datePart} ${timePart}`;
      }
      return datePart;
    }
    // ── 2. "Uploaded at 21:21 03 Nov 2025"
    m = text.match(/^Uploaded at\s+(\d{1,2}):(\d{2})\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
    if (m) {
      const h24 = to24Hour(parseInt(m[1],10), '');
      const min = m[2];
      const day = parseInt(m[3],10);
      const mo = MONTH_MAP[m[4].toLowerCase()]; if (!mo) return null;
      const yr = m[5];
      const timePart = use24h ? `${pad2(h24)}:${min}` : to12Hour(h24, parseInt(min,10));
      return `上传于 ${yr}-${pad2(mo)}-${pad2(day)} ${timePart}`;
    }
    // ── 3. "Updated at 21:21 03 Nov 2025"
    m = text.match(/^Updated at\s+(\d{1,2}):(\d{2})\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
    if (m) {
      const h24 = to24Hour(parseInt(m[1],10), '');
      const min = m[2];
      const day = parseInt(m[3],10);
      const mo = MONTH_MAP[m[4].toLowerCase()]; if (!mo) return null;
      const yr = m[5];
      const timePart = use24h ? `${pad2(h24)}:${min}` : to12Hour(h24, parseInt(min,10));
      return `更新于 ${yr}-${pad2(mo)}-${pad2(day)} ${timePart}`;
    }
    // ── 3b. "Apr 22, 2026" / "April 22, 2026" (美式日期，可选时间)
    m = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i);
    if (m) {
      const mo = MONTH_MAP[m[1].toLowerCase()]; if (!mo) return null;
      const datePart = `${m[3]}-${pad2(mo)}-${pad2(parseInt(m[2],10))}`;
      if (m[4] !== undefined) {
        const h24 = to24Hour(parseInt(m[4],10), (m[6]||'').toLowerCase());
        const timePart = use24h ? `${pad2(h24)}:${m[5]}` : to12Hour(h24, parseInt(m[5],10));
        return `${datePart} ${timePart}`;
      }
      return datePart;
    }
    // ── 3c. "Added on Apr 22, 2026, 9:58PM" (带前缀的美式日期)
    m = text.match(/^Added on\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i);
    if (m) {
      const mo = MONTH_MAP[m[1].toLowerCase()]; if (!mo) return null;
      const datePart = `${m[3]}-${pad2(mo)}-${pad2(parseInt(m[2],10))}`;
      if (m[4] !== undefined) {
        const h24 = to24Hour(parseInt(m[4],10), (m[6]||'').toLowerCase());
        const timePart = use24h ? `${pad2(h24)}:${m[5]}` : to12Hour(h24, parseInt(m[5],10));
        return `添加于 ${datePart} ${timePart}`;
      }
      return `添加于 ${datePart}`;
    }
    // ── 4. 相对时间："4 weeks ago", "2 days ago", "1 hour ago" …
    m = text.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
    if (m) { const u = {second:'秒',minute:'分钟',hour:'小时',day:'天',week:'周',month:'个月',year:'年'}; return `${m[1]} ${u[m[2].toLowerCase()]||m[2]}前`; }
    // ── 5. "just now"
    if (/^just now$/i.test(text)) return '刚刚';
    // ── 6. "Today at 14:32"
    m = text.match(/^Today at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (m) {
      const h24 = to24Hour(parseInt(m[1],10), (m[3]||'').toLowerCase());
      const timePart = use24h ? `${pad2(h24)}:${m[2]}` : to12Hour(h24, parseInt(m[2],10));
      return `今天 ${timePart}`;
    }
    // ── 7. "Yesterday at 14:32"
    m = text.match(/^Yesterday at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (m) {
      const h24 = to24Hour(parseInt(m[1],10), (m[3]||'').toLowerCase());
      const timePart = use24h ? `${pad2(h24)}:${m[2]}` : to12Hour(h24, parseInt(m[2],10));
      return `昨天 ${timePart}`;
    }
    // ── 8. 纯时间格式："9:59PM", "11:30 AM", "21:50", "14:05"
    //     处理 <time> 内与日期分开的独立时间文本节点
    m = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (m) {
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = (m[4] || '').toLowerCase();
      const h24 = to24Hour(h, ampm);
      return use24h ? `${pad2(h24)}:${m[2]}` : to12Hour(h24, min);
    }
    return null;
  }

  // ═══════════════════════════════════════════════
  //  核心：翻译引擎
  // ═══════════════════════════════════════════════
  class Translator {
    constructor() {
      // 语言判断：英文模式下整个翻译器静默
      this.lang = CURRENT_LANG;
      this.enabled = (this.lang === 'zh-CN');

      // 合并：默认词条 + 用户自定义词条
      const custom = GM_getValue(CUSTOM_KEY, {});
      this.dict = Object.assign({}, DEFAULT_TRANSLATIONS, custom);

      // 构建匹配用的 keys（按长度降序，优先匹配长词）
      this.keys = Object.keys(this.dict).sort((a, b) => b.length - a.length);

      // 忽略选择器合并字符串
      this.ignoreSelector = IGNORE_SELECTORS.join(', ');

      this._processed = new WeakSet();
      this._observer = null;
      this._url = location.href;

      if (this.enabled) {
        console.log(`[NexusL10n] 初始化完成，${this.keys.length} 条翻译词条，语言：${this.lang}`);
      } else {
        console.log(`[NexusL10n] 语言：${this.lang}，翻译已禁用`);
      }
    }

    /** 检查节点是否在忽略区域内 */
    _isIgnored(node) {
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!el) return false;
      try { return el.closest(this.ignoreSelector) !== null; } catch (e) { return false; }
    }

    /** 翻译单个文本节点 */
    _translateTextNode(node) {
      if (this._processed.has(node)) return;
      const original = node.nodeValue;
      if (!original || !original.trim()) return;

      // ═══ 优先执行日期本地化 ═══
      // 原因：如果先翻译成中文（如 "Added on Apr 22, 2026" → "添加于..."），
      // 后面的中文检测会跳过日期转换，导致 24h 格式丢失
      if (GM_getValue(DATE_L10N_KEY, true)) {
        const el = node.parentElement;
        if (el) {
          try {
            const inDateContainer = el.closest(DATE_SELECTORS) !== null;
            const inIgnoreArea = el.closest(DATE_IGNORE) !== null;
            const rawText = original.replace(/\s+/g, ' ').trim();

            if (inDateContainer && !inIgnoreArea) {
              const converted = convertDate(rawText);
              if (converted) {
                const leading = original.match(/^\s*/)[0];
                const trailing = original.match(/\s*$/)[0];
                node.nodeValue = leading + converted + trailing;
              }
            } else if (!inIgnoreArea) {
              // 通用日期匹配（不在白名单容器内的短文本）
              if (rawText.length > 0 && rawText.length <= 60 && !/[\u4e00-\u9fff]/.test(rawText)) {
                const converted = convertDate(rawText);
                if (converted) {
                  const leading = original.match(/^\s*/)[0];
                  const trailing = original.match(/\s*$/)[0];
                  node.nodeValue = leading + converted + trailing;
                }
              }
            }
          } catch (e) { /* ignore */ }
        }
      }

      // ═══ 然后执行翻译 ═══
      const key = node.nodeValue.replace(/\s+/g, ' ').trim();
      let translated = null;

      // 1. 精确匹配（字典）
      if (key in this.dict) {
        translated = this.dict[key];
      }

      // 2. 大小写不敏感匹配（fallback）
      //    Nexus Mods 同一文本在不同位置大小写不一致：
      //    导航标题 "Mod updates" vs 下拉菜单 "MOD UPDATES"
      if (translated === null) {
        const keyLower = key.toLowerCase();
        for (const k of this.keys) {
          if (k.toLowerCase() === keyLower) {
            translated = this.dict[k];
            break;
          }
        }
      }

      // 3. 正则模板匹配（处理带变量的文本）
      if (translated === null) {
        for (const [pattern, replacer] of REGEXP_TRANSLATIONS) {
          const m = key.match(pattern);
          if (m) {
            translated = replacer(m);
            break;
          }
        }
      }

      if (translated && translated !== key) {
        const leading = node.nodeValue.match(/^\s*/)[0];
        const trailing = node.nodeValue.match(/\s*$/)[0];
        node.nodeValue = leading + translated + trailing;
      }

      this._processed.add(node);
    }

    /**
     * 翻译内联碎片元素（如 <p> 内多个 <span> 拆分文本）
     * 核心问题：Nexus Mods 用 <span> 拆分同一段落为多个文本节点，
     * 例如 "Try Premium to auto-install collections, get ... and ..."
     * 被拆成：["Try Premium to ", "auto-install collections", ", get ", "uncapped ...", "and ", "browse ad-free", "."]
     * 逐节点翻译会导致 "to", "get", "and" 等碎片词无法正确翻译。
     *
     * 解决方案：合并父元素内所有文本 → 整句翻译 → 将译文拆回各节点
     */
    _translateInlineFragments(parentEl) {
      // 不再用 _processed 标记父元素来跳过，因为 Next.js SPA 路由切换时
      // 可能复用同一个父元素但更新其子文本内容。
      // 改为：收集所有未处理的子文本节点，如果全部已处理则跳过。

      // 收集所有内联子元素（span, a, strong, em 等）中的文本节点
      // 跳过忽略区域（.material-icons 等）内的文本节点
      const children = [];
      const textNodes = [];
      const walk = document.createTreeWalker(parentEl, NodeFilter.SHOW_TEXT);
      let tn;
      while ((tn = walk.nextNode())) {
        if (this._processed.has(tn)) continue;
        // 跳过忽略区域内的文本节点（如图标字体名称）
        if (tn.parentElement && tn.parentElement.closest(this.ignoreSelector)) continue;
        children.push(tn);
        textNodes.push(tn.nodeValue);
      }

      if (textNodes.length < 1) return; // 没有未处理的碎片节点

      // 单个文本节点：直接翻译（不需要合并）
      if (textNodes.length === 1) {
        this._translateTextNode(children[0]);
        return;
      }

      // 合并所有文本节点的内容
      const mergedOriginal = textNodes.join('');
      const mergedKey = mergedOriginal.replace(/\s+/g, ' ').trim();

      if (!mergedKey || mergedKey.length < 2) return;

      // 尝试翻译合并后的文本
      let translated = null;

      // 1. 字典精确匹配
      if (mergedKey in this.dict) {
        translated = this.dict[mergedKey];
      }

      // 2. 大小写不敏感匹配（fallback）
      if (translated === null) {
        const keyLower = mergedKey.toLowerCase();
        for (const k of this.keys) {
          if (k.toLowerCase() === keyLower) {
            translated = this.dict[k];
            break;
          }
        }
      }

      // 3. 正则匹配
      if (translated === null) {
        for (const [pattern, replacer] of REGEXP_TRANSLATIONS) {
          const m = mergedKey.match(pattern);
          if (m) {
            translated = replacer(m);
            break;
          }
        }
      }

      // 4. 如果合并文本已部分翻译（含中文），尝试模糊匹配中英混合词条
      if (translated === null && /[\u4e00-\u9fff]/.test(mergedKey)) {
        // 归一化：统一空格和标点后尝试匹配
        const normalizedKey = mergedKey.replace(/\s*[,，]\s*/g, ', ').replace(/\s*\.。?\s*$/g, '.').replace(/\s+/g, ' ').trim();
        if (normalizedKey in this.dict) {
          translated = this.dict[normalizedKey];
        }
      }

      // 5. 如果仍然未翻译且含中文，替换残留的英文连接词
      if (translated === null && /[\u4e00-\u9fff]/.test(mergedKey)) {
        const connectorMap = [
          [/\bto\b/gi, '以'],
          [/\bget\b/gi, '获得'],
          [/\band\b/gi, '和'],
          [/\bfor\b/gi, '为'],
          [/\bwith\b/gi, '与'],
          [/\bor\b/gi, '或'],
          [/\bthe\b/gi, ''],
          [/\ba\b/gi, ''],
          [/\ban\b/gi, ''],
          [/\bof\b/gi, '的'],
          [/\bin\b/gi, '在'],
          [/\bon\b/gi, '在'],
          [/\bat\b/gi, '在'],
          [/\bby\b/gi, '由'],
          [/\bfrom\b/gi, '从'],
        ];
        let result = mergedKey;
        let changed = false;
        for (const [pattern, replacement] of connectorMap) {
          const newResult = result.replace(pattern, replacement);
          if (newResult !== result) changed = true;
          result = newResult;
        }
        if (changed) {
          // 清理多余空格
          translated = result.replace(/\s{2,}/g, ' ').replace(/\s*([，。、])\s*/g, '$1').trim();
        }
      }

      if (!translated || translated === mergedKey) return;

      // 翻译成功，需要将译文分配回各文本节点
      // 策略：按原始文本节点长度比例分配译文
      // 但更可靠的做法是：如果只有一个节点包含大部分文字，整体替换
      // 简化方案：清空前面所有节点，把完整译文放到最后一个节点
      // 但这会丢失 span 的样式，所以用更好的方案：
      // 保留各节点空白，将翻译文本直接替换

      // 最简方案：将合并后的译文放入第一个非空节点，清空其他节点
      // 这在视觉上是正确的，因为它们在同一个 <p> 或 <h3> 内
      let firstNonEmpty = -1;
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeValue.trim()) {
          firstNonEmpty = i;
          break;
        }
      }
      if (firstNonEmpty < 0) return;

      // 保留首尾空白
      const firstNode = children[firstNonEmpty];
      const leading = firstNode.nodeValue.match(/^\s*/)[0];
      const lastNode = children[children.length - 1];
      const trailing = lastNode.nodeValue.match(/\s*$/)[0];

      // 清空所有节点
      for (let i = 0; i < children.length; i++) {
        if (i === firstNonEmpty) continue;
        children[i].nodeValue = '';
        this._processed.add(children[i]);
      }

      // 将译文放入第一个非空节点
      firstNode.nodeValue = leading + translated + trailing;
      this._processed.add(firstNode);
    }

    /** 翻译元素属性 */
    _translateAttributes(el) {
      for (const attr of TRANSLATABLE_ATTRS) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        const key = val.replace(/\s+/g, ' ').trim();

        // 精确匹配
        if (key in this.dict) {
          el.setAttribute(attr, this.dict[key]);
          continue;
        }

        // 对 aria-label="Close" 单独处理：翻译属性为"关闭"，但不影响文本节点
        if (attr === 'aria-label' && key.toLowerCase() === 'close') {
          el.setAttribute(attr, '关闭');
          continue;
        }

        // case-insensitive fallback
        const keyLower = key.toLowerCase();
        for (const k of this.keys) {
          if (k.toLowerCase() === keyLower) {
            el.setAttribute(attr, this.dict[k]);
            break;
          }
        }
      }
    }

    /** 翻译整个子树 */
    translateSubtree(root) {
      if (!root) return;
      if (this._isIgnored(root)) return;

      // 第一步：合并翻译内联碎片元素（p, h3 等包含多个 span 的元素）
      const inlineParents = root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, label, figcaption, blockquote, button, a');
      for (const p of inlineParents) {
        if (this._isIgnored(p)) continue;
        // 检查是否包含多个文本节点（碎片化文本）
        let textCount = 0;
        const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        while (tw.nextNode()) textCount++;
        if (textCount >= 2) {
          this._translateInlineFragments(p);
        }
      }

      // 第二步：逐文本节点翻译（处理剩余未被碎片合并覆盖的节点）
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!this._isIgnored(node)) {
          this._translateTextNode(node);
        }
      }

      // 遍历元素节点翻译属性
      // 注意：input 元素虽然在 IGNORE_SELECTORS 中（跳过文本内容翻译），
      // 但其 placeholder/aria-label 等属性仍需翻译，所以这里不过滤 input
      const elWalker = document.createTreeWalker(
        root, NodeFilter.SHOW_ELEMENT,
        { acceptNode: (n) => {
          const tag = n.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'textarea') return NodeFilter.FILTER_REJECT;
          // input 的文本内容不需要翻译（已在 IGNORE_SELECTORS 中跳过），
          // 但 placeholder 等属性仍需翻译，所以只 SKIP（继续子节点）不 REJECT
          if (tag === 'input') return NodeFilter.FILTER_ACCEPT;
          if (this._isIgnored(n)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }}
      );
      let el;
      while ((el = elWalker.nextNode())) {
        this._translateAttributes(el);
      }
    }

    /** 翻译整个页面 */
    translatePage() {
      this.translateSubtree(document.body);
    }

    /** 启动 MutationObserver 监听 */
    startObserver() {
      if (this._observer) this._observer.disconnect();

      this._observer = new MutationObserver((mutations) => {
        const pending = [];
        for (const m of mutations) {
          if (m.type === 'childList') {
            for (const node of m.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                pending.push(node);
              }
            }
            // 子节点添加/删除时，清除父元素的 _processed 标记
            // 以便 _translateInlineFragments 重新处理碎片合并
            if (m.target.nodeType === Node.ELEMENT_NODE) {
              this._processed.delete(m.target);
            }
          } else if (m.type === 'characterData') {
            // 文本变化：重新处理（移除 processed 标记）
            this._processed.delete(m.target);
            // 同时清除父元素的标记，以便 _translateInlineFragments 重新处理碎片
            if (m.target.parentElement) {
              this._processed.delete(m.target.parentElement);
            }
            pending.push(m.target);
          } else if (m.type === 'attributes') {
            // 属性变化（placeholder/aria-label/title 等）：翻译该元素的属性
            if (m.target.nodeType === Node.ELEMENT_NODE) {
              this._translateAttributes(/** @type {Element} */ (m.target));
            }
          }
        }
        if (pending.length > 0) {
          requestAnimationFrame(() => {
            for (const node of pending) {
              if (node.nodeType === Node.TEXT_NODE) {
                if (!this._isIgnored(node)) this._translateTextNode(node);
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                this.translateSubtree(node);
              }
            }
          });
        }
      });

      this._observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRS,
      });
    }

    /** 监听 SPA 路由变化 */
    watchRoute() {
      // 拦截 pushState/replaceState
      const _pushState = history.pushState;
      const _replaceState = history.replaceState;
      const onUrlChange = () => {
        if (location.href === this._url) return;
        this._url = location.href;
        // 路由变化时清除已处理标记，确保新页面的节点能被重新翻译
        // Next.js SPA 路由切换可能复用 DOM 节点并更新其文本内容，
        // 不清除 _processed 会导致这些节点被跳过
        this._processed = new WeakSet();
        // 路由变化后延迟重新翻译（Next.js SPA 异步渲染需要更长时间）
        setTimeout(() => this.translatePage(), 100);
        setTimeout(() => this.translatePage(), 500);
        setTimeout(() => this.translatePage(), 1500);
        setTimeout(() => this.translatePage(), 3000);
      };

      history.pushState = function (...args) {
        _pushState.apply(this, args);
        onUrlChange();
      };
      history.replaceState = function (...args) {
        _replaceState.apply(this, args);
        onUrlChange();
      };
      window.addEventListener('popstate', onUrlChange);

      // 轮询兜底
      setInterval(() => {
        if (location.href !== this._url) {
          this._url = location.href;
          // 路由变化时同样清除 _processed（与 onUrlChange 一致）
          this._processed = new WeakSet();
          setTimeout(() => this.translatePage(), 100);
          setTimeout(() => this.translatePage(), 500);
          setTimeout(() => this.translatePage(), 1500);
          setTimeout(() => this.translatePage(), 3000);
        }
      }, 1000);
    }

    /** 启动 */
    start() {
      if (!this.enabled) return; // 英文模式，不翻译

      // 立即翻译一次
      this.translatePage();

      // 启动监听
      this.startObserver();
      this.watchRoute();

      // 延迟补翻（等异步内容加载）
      setTimeout(() => this.translatePage(), 300);
      setTimeout(() => this.translatePage(), 1000);
      setTimeout(() => this.translatePage(), 3000);
    }

    /** 重新加载词条（用户导入后调用） */
    reload() {
      if (!this.enabled) return;
      const custom = GM_getValue(CUSTOM_KEY, {});
      this.dict = Object.assign({}, DEFAULT_TRANSLATIONS, custom);
      this.keys = Object.keys(this.dict).sort((a, b) => b.length - a.length);
      this._processed = new WeakSet();
      this.translatePage();
    }
  }

  // ═══════════════════════════════════════════════
  //  CSV 导入/导出
  //  格式：英文,中文  （UTF-8，首行是表头）
  //  可直接用 Excel 打开编辑
  // ═══════════════════════════════════════════════

  function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const result = {};
    let startIdx = 0;
    // 跳过表头
    if (lines.length > 0 && /english|中文|翻译|translation/i.test(lines[0])) {
      startIdx = 1;
    }
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // 简单 CSV 解析：按第一个逗号分割
      const commaIdx = line.indexOf(',');
      if (commaIdx === -1) continue;
      const en = line.substring(0, commaIdx).trim();
      const zh = line.substring(commaIdx + 1).trim();
      if (en && zh) {
        result[en] = zh;
      }
    }
    return result;
  }

  function toCSV(dict) {
    const lines = ['English,中文（翻译）'];
    for (const [en, zh] of Object.entries(dict)) {
      // 如果值包含逗号或引号，用双引号包裹
      const enCell = en.includes(',') || en.includes('"') ? `"${en.replace(/"/g, '""')}"` : en;
      const zhCell = zh.includes(',') || zh.includes('"') ? `"${zh.replace(/"/g, '""')}"` : zh;
      lines.push(`${enCell},${zhCell}`);
    }
    return lines.join('\n');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.head.appendChild(a);
    a.click();
    document.head.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const imported = parseCSV(text);
        const count = Object.keys(imported).length;
        if (count === 0) {
          showToast('导入失败，请检查文件格式。', 'error');
          return;
        }
        // 合并到自定义存储
        const existing = GM_getValue(CUSTOM_KEY, {});
        const merged = Object.assign({}, existing, imported);
        GM_setValue(CUSTOM_KEY, merged);
        showToast(`导入成功！已加载 ${count} 条翻译词条。`, 'success');
        // 重新加载翻译
        if (window._nexusTranslator) {
          window._nexusTranslator.reload();
        } else {
          location.reload();
        }
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  }

  function exportCSV() {
    const dict = window._nexusTranslator ? window._nexusTranslator.dict : Object.assign({}, DEFAULT_TRANSLATIONS, GM_getValue(CUSTOM_KEY, {}));
    const csv = toCSV(dict);
    downloadFile(csv, 'nexusmods-translations.csv', 'text/csv;charset=utf-8');
  }

  function exportTemplate() {
    const csv = toCSV(DEFAULT_TRANSLATIONS);
    downloadFile(csv, 'nexusmods-translations-template.csv', 'text/csv;charset=utf-8');
  }

  function resetCustom() {
    showConfirm('确定要清除所有自定义翻译词条吗？\n（内置翻译不受影响）', () => {
      GM_setValue(CUSTOM_KEY, {});
      showToast('已清除所有自定义词条，即将刷新页面。', 'success');
      setTimeout(() => location.reload(), 1000);
    });
  }

  // ═══════════════════════════════════════════════
  //  油猴菜单
  // ═══════════════════════════════════════════════

  // 语言切换菜单
  const langPref = GM_getValue(LANG_KEY, 'auto');
  const langLabels = { 'auto': '自动', 'zh-CN': '简体中文', 'en': 'English' };
  const langCurrent = langLabels[langPref] || '自动';
  GM_registerMenuCommand(`🌐 界面语言：${langCurrent}`, () => {
    // 循环切换：auto → zh-CN → en → auto
    const cycle = { 'auto': 'zh-CN', 'zh-CN': 'en', 'en': 'auto' };
    const next = cycle[langPref] || 'auto';
    GM_setValue(LANG_KEY, next);
    const nextLabel = langLabels[next];
    showToast(`已切换为「${nextLabel}」，正在刷新…`, 'info', 1200);
    setTimeout(() => location.reload(), 1200);
  });

  GM_registerMenuCommand('📥 导入翻译词条 (CSV)', importCSV);
  GM_registerMenuCommand('📤 导出当前翻译词条', exportCSV);
  GM_registerMenuCommand('📋 导出默认词条模板', exportTemplate);
  GM_registerMenuCommand('🗑️ 清除自定义词条', resetCustom);

  const dateL10nEnabled = GM_getValue(DATE_L10N_KEY, true);
  const time24Enabled = GM_getValue(TIME24_KEY, true);
  GM_registerMenuCommand(`📅 日期本地化：${dateL10nEnabled ? '开启 ✓' : '关闭'}`, () => {
    GM_setValue(DATE_L10N_KEY, !dateL10nEnabled);
    location.reload();
  });
  GM_registerMenuCommand(`🕐 时间格式：${time24Enabled ? '24小时制 ✓' : '12小时制(AM/PM)'}`, () => {
    GM_setValue(TIME24_KEY, !time24Enabled);
    location.reload();
  });

  // ═══════════════════════════════════════════════
  //  启动！
  // ═══════════════════════════════════════════════
  const translator = new Translator();
  window._nexusTranslator = translator;
  translator.start();

})();
