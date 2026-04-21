// ==UserScript==
// @name         Nexusmods Localization
// @name:zh-CN   Nexus Mods 多语言本地化
// @namespace    https://github.com/saiyajiang/Nexusmods-Localization
// @version      0.9.0
// @description  Localization support for Nexus Mods. Built-in Simplified Chinese. Supports Excel-based custom translation.
// @description:zh-CN  Nexus Mods 网站多语言本地化，内置简体中文，支持 Excel 自定义翻译
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
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @antifeature  adult-content 此脚本运行于包含成人内容的网站（Nexus Mods）
// ==/UserScript==

/**
 * Nexusmods-Localization — 油猴脚本
 * @license MIT
 *
 * ⚠️  声明：本项目代码由 AI 辅助生成，经人工审核后发布。
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
  const IGNORE_SELECTORS = [
    '.mod_description_container',
    '.prose-lexical.prose',
    '.collection_description',
    '.changelog',
    '[data-no-i18n]',
    'script', 'style', 'textarea', 'input',
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
    // Welcome back, {username}
    [/^Welcome back,\s*(.+)$/i, (m) => `欢迎回来，${m[1]}`],
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
  ];

  const DEFAULT_TRANSLATIONS = {
    // 导航
    'Home': '首页', 'Games': '游戏', 'Mods': '模组', 'Collections': '合集',
    'News': '资讯', 'Forums': '论坛', 'Premium': '高级会员',
    'Log in': '登录', 'Sign up': '注册', 'Sign out': '退出登录',
    'Sign Up': '注册', 'Log out': '退出',
    'My account': '我的账户', 'My profile': '我的主页',
    'My mods': '我的模组', 'My collections': '我的合集', 'My games': '我的游戏',
    'Dashboard': '控制台', 'Settings': '设置', 'Notifications': '通知', 'Messages': '消息',

    // 通用按钮
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

    // 首页
    'Featured mods': '精选模组', 'Featured collections': '精选合集',
    'Latest mods': '最新模组', 'Popular games': '热门游戏',
    'Trending mods': '趋势模组', 'New and updated mods': '新增与更新模组',
    'Browse all games': '浏览全部游戏', 'Browse all mods': '浏览全部模组',
    'Explore Nexus Mods': '探索 Nexus Mods', 'Join the community': '加入社区',
    'Discover the best mods': '探索最佳模组',
    'Safe to use': '安全使用', 'Totally free': '完全免费',
    'Community-driven': '社区驱动',

    // 模组详情
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
    'Post your comment': '发表评论', 'Show replies': '显示回复',
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
  const DATE_SELECTORS = 'time, .stat time, .uploaded-time, .last-updated time, .mod-stats time, [data-date], [data-timestamp], .notification-time, .comment-time, .review-date time, .profile-stats time';
  const DATE_IGNORE = '.mod-title, h1.game-name, .game-title, a.mod-name, .collection-title, .mod_description_container, .prose-lexical.prose, .changelog, [data-no-date-i18n]';

  function pad2(n) { return String(n).padStart(2, '0'); }
  function to24Hour(h, ampm) {
    if (!ampm) return h;
    if (ampm === 'am') return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  }

  function convertDate(text) {
    let m;
    m = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i);
    if (m) {
      const mo = MONTH_MAP[m[2].toLowerCase()]; if (!mo) return null;
      if (m[4] !== undefined) return `${m[3]}-${pad2(mo)}-${pad2(parseInt(m[1],10))} ${pad2(to24Hour(parseInt(m[4],10),(m[6]||'').toLowerCase()))}:${m[5]}`;
      return `${m[3]}-${pad2(mo)}-${pad2(parseInt(m[1],10))}`;
    }
    m = text.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
    if (m) { const u = {second:'秒',minute:'分钟',hour:'小时',day:'天',week:'周',month:'个月',year:'年'}; return `${m[1]} ${u[m[2].toLowerCase()]||m[2]}前`; }
    if (/^just now$/i.test(text)) return '刚刚';
    m = text.match(/^Today at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (m) return `今天 ${pad2(to24Hour(parseInt(m[1],10),(m[3]||'').toLowerCase()))}:${m[2]}`;
    m = text.match(/^Yesterday at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (m) return `昨天 ${pad2(to24Hour(parseInt(m[1],10),(m[3]||'').toLowerCase()))}:${m[2]}`;
    return null;
  }

  // ═══════════════════════════════════════════════
  //  核心：翻译引擎
  // ═══════════════════════════════════════════════
  class Translator {
    constructor() {
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

      console.log(`[NexusL10n] 初始化完成，${this.keys.length} 条翻译词条`);
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

      const key = original.replace(/\s+/g, ' ').trim();
      let translated = null;

      // 1. 精确匹配（字典）
      if (key in this.dict) {
        translated = this.dict[key];
      }

      // 2. 正则模板匹配（处理带变量的文本）
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
        const leading = original.match(/^\s*/)[0];
        const trailing = original.match(/\s*$/)[0];
        node.nodeValue = leading + translated + trailing;
      }

      // 日期本地化
      if (GM_getValue(DATE_L10N_KEY, true)) {
        const el = node.parentElement;
        if (el) {
          try {
            const inDateContainer = el.closest(DATE_SELECTORS) !== null;
            const inIgnoreArea = el.closest(DATE_IGNORE) !== null;
            if (inDateContainer && !inIgnoreArea) {
              const converted = convertDate(node.nodeValue.trim());
              if (converted) {
                const leading = node.nodeValue.match(/^\s*/)[0];
                const trailing = node.nodeValue.match(/\s*$/)[0];
                node.nodeValue = leading + converted + trailing;
              }
            }
          } catch (e) { /* ignore */ }
        }
      }

      this._processed.add(node);
    }

    /** 翻译元素属性 */
    _translateAttributes(el) {
      for (const attr of TRANSLATABLE_ATTRS) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        const key = val.replace(/\s+/g, ' ').trim();
        if (key in this.dict) {
          el.setAttribute(attr, this.dict[key]);
        }
      }
    }

    /** 翻译整个子树 */
    translateSubtree(root) {
      if (!root) return;
      if (this._isIgnored(root)) return;

      // 遍历所有文本节点
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!this._isIgnored(node)) {
          this._translateTextNode(node);
        }
      }

      // 遍历元素节点翻译属性
      const elWalker = document.createTreeWalker(
        root, NodeFilter.SHOW_ELEMENT,
        { acceptNode: (n) => {
          const tag = n.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'input') return NodeFilter.FILTER_REJECT;
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
          } else if (m.type === 'characterData') {
            // 文本变化：重新处理（移除 processed 标记）
            this._processed.delete(m.target);
            pending.push(m.target);
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
        // 路由变化后延迟重新翻译
        setTimeout(() => this.translatePage(), 100);
        setTimeout(() => this.translatePage(), 500);
        setTimeout(() => this.translatePage(), 1500);
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
          setTimeout(() => this.translatePage(), 100);
          setTimeout(() => this.translatePage(), 500);
          setTimeout(() => this.translatePage(), 1500);
        }
      }, 1000);
    }

    /** 启动 */
    start() {
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
          alert('未找到有效的翻译词条，请检查文件格式。\n\n格式要求：\n- 第一行可以是表头（English,中文）\n- 每行格式：英文原文,中文翻译\n- UTF-8 编码');
          return;
        }
        // 统计新增/覆盖/跳过
        const existing = GM_getValue(CUSTOM_KEY, {});
        let newCount = 0, updateCount = 0;
        for (const [en, zh] of Object.entries(imported)) {
          if (existing[en] !== undefined) {
            updateCount++;
          } else if (DEFAULT_TRANSLATIONS[en] !== undefined) {
            updateCount++;  // 覆盖默认值
          } else {
            newCount++;
          }
        }
        // 合并到自定义存储
        const merged = Object.assign({}, existing, imported);
        GM_setValue(CUSTOM_KEY, merged);
        const total = Object.keys(merged).length;
        alert(`导入完成！\n\n✅ 文件中共 ${count} 条词条\n📝 新增：${newCount} 条\n🔄 覆盖：${updateCount} 条\n💾 自定义词条总计：${total} 条\n📄 内置词条：${Object.keys(DEFAULT_TRANSLATIONS).length} 条`);
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
    if (confirm('确定要清除所有自定义翻译词条吗？\n（内置翻译不受影响）')) {
      GM_setValue(CUSTOM_KEY, {});
      alert('已清除所有自定义词条，即将刷新页面。');
      location.reload();
    }
  }

  // ═══════════════════════════════════════════════
  //  油猴菜单
  // ═══════════════════════════════════════════════
  GM_registerMenuCommand('📥 导入翻译词条 (CSV)', importCSV);
  GM_registerMenuCommand('📤 导出当前翻译词条', exportCSV);
  GM_registerMenuCommand('📋 导出默认词条模板', exportTemplate);
  GM_registerMenuCommand('🗑️ 清除自定义词条', resetCustom);

  const dateL10nEnabled = GM_getValue(DATE_L10N_KEY, true);
  GM_registerMenuCommand(`📅 日期本地化：${dateL10nEnabled ? '开启 ✓' : '关闭'}`, () => {
    GM_setValue(DATE_L10N_KEY, !dateL10nEnabled);
    location.reload();
  });

  // ═══════════════════════════════════════════════
  //  启动！
  // ═══════════════════════════════════════════════
  const translator = new Translator();
  window._nexusTranslator = translator;
  translator.start();

})();
