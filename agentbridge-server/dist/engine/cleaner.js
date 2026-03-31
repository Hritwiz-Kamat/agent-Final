/**
 * AgentBridge Server — Cleaner (Server-Side)
 * Chinese token compression engine that runs server-side.
 *
 * In-page noise removal is handled by the injectable cleaner.bundle.js.
 * This module handles:
 * - Chinese token compression (compresses JSON keys + semantic values)
 * - Token-efficient text compression
 */
// ═══════════════════════════════════════════════════════════
//  Chinese Token Compression Engine
//  Maps verbose English semantic labels → compact Chinese
//  equivalents for 40-60% additional token savings.
//  Chinese chars encode ~2-3x more meaning per token.
// ═══════════════════════════════════════════════════════════
export const TOKEN_COMPRESS_MAP = {
    // ─── Navigation ──────────────────────────────────
    'navigation': '导航',
    'navigate': '导航',
    'nav': '导航',
    'home': '首页',
    'back': '返回',
    'next': '下一',
    'previous': '上一',
    'breadcrumb': '路径',
    'menu': '菜单',
    'pagination': '分页',
    // ─── Forms & Inputs ──────────────────────────────
    'submit': '提交',
    'submit_form': '提交表单',
    'input': '输入',
    'form': '表单',
    'search': '搜索',
    'filter': '筛选',
    'select': '选择',
    'checkbox': '复选',
    'radio': '单选',
    'dropdown': '下拉',
    'placeholder': '占位',
    'required': '必填',
    'validation': '验证',
    'label': '标签',
    // ─── Buttons & Actions ───────────────────────────
    'click': '点击',
    'click_button': '点击按钮',
    'button': '按钮',
    'close': '关闭',
    'cancel': '取消',
    'confirm': '确认',
    'save': '保存',
    'delete': '删除',
    'edit': '编辑',
    'download': '下载',
    'upload': '上传',
    'copy': '复制',
    'reset': '重置',
    'toggle': '切换',
    'expand': '展开',
    'collapse': '折叠',
    // ─── Content Types ───────────────────────────────
    'title': '标题',
    'page_title': '页标题',
    'description': '描述',
    'heading': '标题',
    'paragraph': '段落',
    'content': '内容',
    'article': '文章',
    'summary': '摘要',
    'text': '文本',
    'image': '图片',
    'video': '视频',
    'audio': '音频',
    'link': '链接',
    'table': '表格',
    'list': '列表',
    'code': '代码',
    // ─── Page Structure ──────────────────────────────
    'header': '页头',
    'footer': '页脚',
    'sidebar': '侧栏',
    'main': '主体',
    'section': '区块',
    'container': '容器',
    'wrapper': '包裹',
    'modal': '弹窗',
    'popup': '弹出',
    'overlay': '遮罩',
    'tab': '标签页',
    'panel': '面板',
    'card': '卡片',
    'widget': '组件',
    'banner': '横幅',
    'icon': '图标',
    // ─── E-Commerce ──────────────────────────────────
    'add_to_cart': '加购',
    'buy_now': '立购',
    'checkout': '结算',
    'cart': '购物车',
    'price': '价格',
    'quantity': '数量',
    'product': '商品',
    'category': '分类',
    'review': '评价',
    'rating': '评分',
    'wishlist': '收藏',
    'order': '订单',
    'shipping': '配送',
    'payment': '支付',
    'coupon': '优惠券',
    'discount': '折扣',
    // ─── Social & User Actions ───────────────────────
    'login': '登录',
    'logout': '登出',
    'signup': '注册',
    'sign_up': '注册',
    'sign_in': '登录',
    'profile': '个人',
    'settings': '设置',
    'share': '分享',
    'like': '赞',
    'comment': '评论',
    'follow': '关注',
    'subscribe': '订阅',
    'notification': '通知',
    'message': '消息',
    'reply': '回复',
    'post': '发布',
    // ─── MCP / AgentBridge Labels ────────────────────
    'resources': '资源',
    'tools': '工具',
    'input_schema': '输入模式',
    'inputSchema': '输入模式',
    'properties': '属性',
    'element': '元素',
    'selector': '选择器',
    'type': '类型',
    'name': '名称',
    'value': '值',
    'metadata': '元数据',
    'structured': '结构化',
    'extraction': '提取',
    'interactive': '可交互',
    'disabled': '禁用',
    'external': '外部',
    // ─── Data / Misc ────────────────────────────────
    'loading': '加载',
    'error': '错误',
    'success': '成功',
    'warning': '警告',
    'empty': '空',
    'none': '无',
    'true': '是',
    'false': '否',
    'null': '空值',
    'undefined': '未定义',
};
/**
 * Patterns that should NEVER be compressed.
 * Matches: URLs, emails, file paths, CSS selectors,
 * numbers, hex colors, IDs, code snippets.
 */
const PRESERVE_PATTERNS = [
    /^https?:\/\//i, // URLs
    /^\/\//, // Protocol-relative URLs
    /^page:\/\//, // MCP resource URIs
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, // Emails
    /^\$?\d[\d,.]*%?$/, // Numbers, prices, percentages
    /^#[0-9a-f]{3,8}$/i, // Hex colors
    /^[a-f0-9-]{36}$/i, // UUIDs
    /^rgb[a]?\(/i, // RGB colors
    /^[.#\[].*[>\s:]/, // CSS selectors
    /^data:/, // Data URIs
    /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)+$/, // Proper nouns (Title Case multi-word)
    /[{}();=<>]/, // Code snippets
    /^\//, // File/URL paths
];
/**
 * Check if a value should be preserved (not compressed).
 */
function shouldPreserve(val) {
    if (typeof val !== 'string')
        return true;
    if (val.length > 200)
        return true; // Long content — not a label
    if (val.length < 2)
        return true; // Too short to compress
    return PRESERVE_PATTERNS.some(rx => rx.test(val));
}
/**
 * Apply Chinese compression to a JSON object (deep walk).
 * Compresses: JSON keys, short semantic string values.
 * Preserves: URLs, emails, numbers, IDs, code, proper nouns.
 */
export function applyChineseCompression(obj) {
    let replacements = 0;
    const walk = (node) => {
        if (node == null)
            return node;
        if (Array.isArray(node)) {
            return node.map(item => walk(item));
        }
        if (typeof node === 'string') {
            const lower = node.toLowerCase().trim();
            if (TOKEN_COMPRESS_MAP[lower] && !shouldPreserve(node)) {
                replacements++;
                return TOKEN_COMPRESS_MAP[lower];
            }
            return node;
        }
        if (typeof node !== 'object')
            return node;
        const result = {};
        for (const key of Object.keys(node)) {
            const lowerKey = key.toLowerCase();
            let newKey = key;
            if (TOKEN_COMPRESS_MAP[lowerKey]) {
                newKey = TOKEN_COMPRESS_MAP[lowerKey];
                replacements++;
            }
            result[newKey] = walk(node[key]);
        }
        return result;
    };
    const result = walk(obj);
    return { result, replacements };
}
/**
 * Compress text for token efficiency.
 * Normalizes whitespace, smart quotes, special characters.
 */
export function compressForTokens(text) {
    if (!text)
        return '';
    return text
        .replace(/\s*\n\s*/g, '\n')
        .replace(/ {2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/…/g, '...')
        .replace(/—/g, '-')
        .replace(/–/g, '-')
        .replace(/\u00A0/g, ' ')
        .replace(/\u200B/g, '')
        .replace(/\u200C/g, '')
        .replace(/\u200D/g, '')
        .replace(/\uFEFF/g, '')
        .trim();
}
//# sourceMappingURL=cleaner.js.map