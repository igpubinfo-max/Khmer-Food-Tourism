import { useEffect } from 'react';
import { Language } from '../types';

/**
 * Helper for 3-language inline selection: Khmer ('km'), English ('en'), Simplified Chinese ('zh')
 */
export function tr(lang: Language, km: string, en: string, zh: string): string {
  if (lang === 'km') return km;
  if (lang === 'zh') return zh;
  return en;
}

/**
 * Cycle to next language: km -> en -> zh -> km
 */
export function getNextLanguage(current: Language): Language {
  if (current === 'km') return 'en';
  if (current === 'en') return 'zh';
  return 'km';
}

/**
 * Display badge for the current or next language on the Header switcher
 */
export function getLanguageBadgeLabel(lang: Language): string {
  if (lang === 'km') return 'ខ្មែរ';
  if (lang === 'zh') return '中文';
  return 'EN';
}

/**
 * 25 Provinces of Cambodia in Simplified Chinese
 */
export const CAMBODIA_PROVINCE_ZH_MAP: Record<string, string> = {
  'ទាំងអស់': '全部省份',
  'គ្រប់ខេត្តក្រុង': '全部省市',
  'គ្រប់ទីតាំង': '全部地区',
  'All Provinces': '全部省市',
  'All Locations': '全部地区',
  'All': '全部',
  'ភ្នំពេញ': '金边 (Phnom Penh)',
  'រាជធានីភ្នំពេញ': '金边市',
  'Phnom Penh': '金边',
  'សៀមរាប': '暹粒 (Siem Reap)',
  'ខេត្តសៀមរាប': '暹粒省',
  'Siem Reap': '暹粒',
  'កំពត': '贡布 (Kampot)',
  'ខេត្តកំពត': '贡布省',
  'Kampot': '贡布',
  'កែប': '白马 (Kep)',
  'ខេត្តកែប': '白马省',
  'Kep': '白马',
  'ព្រះសីហនុ': '西哈努克港',
  'ខេត្តព្រះសីហនុ': '西哈努克省',
  'Sihanoukville': '西哈努克港',
  'បាត់ដំបង': '马德望 (Battambang)',
  'ខេត្តបាត់ដំបង': '马德望省',
  'Battambang': '马德望',
  'កំពង់ចាម': '磅湛 (Kampong Cham)',
  'Kampong Cham': '磅湛',
  'មណ្ឌលគិរី': '蒙多基里 (Mondulkiri)',
  'ខេត្តមណ្ឌលគិរី': '蒙多基里省',
  'Mondulkiri': '蒙多基里',
  'រតនគិរី': '腊塔纳基里 (Ratanakiri)',
  'Ratanakiri': '腊塔纳基里',
  'កោះកុង': '国公 (Koh Kong)',
  'Koh Kong': '国公',
  'កណ្តាល': '干丹 (Kandal)',
  'Kandal': '干丹',
  'កំពង់ឆ្នាំង': '磅清扬 (Kampong Chhnang)',
  'Kampong Chhnang': '磅清扬',
  'កំពង់ស្ពឺ': '磅士卑 (Kampong Speu)',
  'Kampong Speu': '磅士卑',
  'កំពង់ធំ': '磅同 (Kampong Thom)',
  'Kampong Thom': '磅同',
  'ក្រចេះ': '桔井 (Kratie)',
  'Kratie': '桔井',
  'តាកែវ': '茶胶 (Takeo)',
  'Takeo': '茶胶',
  'ព្រៃវែង': '波罗勉 (Prey Veng)',
  'Prey Veng': '波罗勉',
  'ស្វាយរៀង': '柴桢 (Svay Rieng)',
  'Svay Rieng': '柴桢',
  'ពោធិ៍សាត់': '菩萨 (Pursat)',
  'Pursat': '菩萨',
  'បន្ទាយមានជ័យ': '班迭棉吉 (Banteay Meanchey)',
  'Banteay Meanchey': '班迭棉吉',
  'ប៉ៃលិន': '拜林 (Pailin)',
  'Pailin': '拜林',
  'ឧត្តរមានជ័យ': '奥多棉吉 (Oddar Meanchey)',
  'Oddar Meanchey': '奥多棉吉',
  'ព្រះវិហារ': '柏威夏 (Preah Vihear)',
  'Preah Vihear': '柏威夏',
  'ស្ទឹងត្រែង': '上丁 (Stung Treng)',
  'Stung Treng': '上丁',
  'ត្បូងឃ្មុំ': '特本克蒙 (Tboung Khmum)',
  'Tboung Khmum': '特本克蒙',
};

export function translateProvince(prov: string, lang: Language): string {
  if (lang === 'km') return prov;
  if (lang === 'zh') return CAMBODIA_PROVINCE_ZH_MAP[prov] || prov;
  return prov;
}

/**
 * Exact English -> Simplified Chinese UI Dictionary
 */
export const EXACT_EN_TO_ZH_MAP: Record<string, string> = {
  // Navigation & Header
  'Home': '首页',
  'Dishes': '高棉美食',
  'Restaurants': '餐厅与店铺',
  'Tourism': '旅游景点',
  'Community': '美食社区',
  'Account': '个人中心',
  'Profile': '个人资料',
  'Scan': '扫码',
  'Install': '安装应用',
  'Feedback:': '意见反馈：',
  'Copy': '复制',
  'Search': '搜索',
  'Dashboard': '管理后台',
  'All Provinces': '全部省市',
  'All Locations': '全部地区',
  'Phnom Penh': '金边',
  'Siem Reap': '暹粒',
  'Battambang': '马德望',
  'Kampot': '贡布',
  'Kep': '白马',
  'Sihanoukville': '西哈努克港',
  'Mondulkiri': '蒙多基里',
  'Kampong Cham': '磅湛',
  'Koh Kong': '国公',
  'Takeo': '茶胶',
  'Pursat': '菩萨',

  // Home & Hero
  'Cambodian Heritage': '柬埔寨文化遗产',
  '100+ Dishes & Shops': '100+ 美食与名店',
  'Hello,': '您好，',
  'Unlock VIP': '升级 VIP 会员',
  'Signature': '特色名菜',
  'Temples': '古迹寺庙',
  'Beaches': '海滩海岛',
  'Nature': '瀑布与自然',
  'All': '全部',
  'Street Food': '街头小吃',
  'Famous': '招牌名菜',
  'Café': '咖啡与饮品',
  'Desserts': '高棉甜点',
  'Unusual': '特色风味',
  'Try:': '热门搜索：',
  'Personalized Features': '专属智能服务',
  'What to Eat': '今天吃什么',
  'Near Me': '附近美食与景点',
  'Daily Discoveries': '每日精选推荐',
  'Wishlists': '我的收藏夹',
  'AI Trip Planner': 'AI 智能行程规划',
  'Notifications': '消息通知',
  'Upgrade to VIP': '立即升级 VIP',

  // Restaurant & Tourism Views
  'Restaurant Directory': '餐厅与美食店铺名录',
  'Google Maps': '谷歌地图搜索',
  'AI Check-in': 'AI 探店打卡',
  'My Store': '管理我的店铺',
  'Add Store': '添加 VIP 店铺',
  'Register Your VIP Restaurant (1 Store)': '注册您的专属 VIP 餐厅 (1 家店铺)',
  '+ Register Your VIP Restaurant (1 Store)': '+ 注册您的专属 VIP 餐厅 (1 家店铺)',
  'No restaurants matched your filters': '未找到符合筛选条件的餐厅',
  'Google Maps & Smart Cache Results': 'Google 地图与智能缓存实时结果',
  'Open in Google Maps': '在 Google 地图中打开',
  'Search directly on Google Maps': '直接在 Google 地图中搜索',
  'No ratings yet': '暂无评分',
  'Directions': '导航前往',
  'Call': '拨打电话',
  'Share': '分享',
  'Save': '保存',
  'Cancel': '取消',
  'Close': '关闭',
  'Delete': '删除',
  'Edit': '编辑',
  'View Menu': '查看菜单',
  'View Details': '查看详情',

  // Google Maps Search Modal
  'All Places': '全部地点',
  'Cafés & Coffee': '咖啡厅与茶饮',
  'Street Food & Night Markets': '街头小吃与夜市',
  'Seafood': '海鲜餐厅',
  'Bakery & Desserts': '烘焙与甜品店',
  'Tourist Attractions': '热门旅游景点',
  'Ancient Temples & Pagodas': '古迹寺庙与佛塔',
  'Nature & Waterfalls': '自然生态与瀑布',
  'Beaches & Islands': '海滩与海岛',
  'Mountains & Viewpoints': '山脉与观景台',
  'Resorts & Eco-Tourism': '度假村与生态旅游',

  // Auth & Profile
  'Log In': '登录',
  'Sign Up': '注册账号',
  'Log Out': '退出登录',
  'Logged out': '已安全退出登录',
  'Restore VIP Purchases': '恢复 VIP 会员权益',
  'Manage My VIP Store': '管理我的 VIP 店铺',
  'Language': '语言设置 (Language)',
  'Khmer': '高棉语 (ខ្មែរ)',
  'English': '英语 (English)',
  'Simplified Chinese': '简体中文 (中文)',
};

/**
 * Partial phrase replacements for dynamic strings when `language === 'zh'`
 */
const PHRASE_REPLACEMENTS_EN_TO_ZH: Array<[RegExp, string]> = [
  [/Showing (\d+) of (\d+) \((\d+) verified\)/i, '显示 $1 / $2 家店铺（$3 家官方认证）'],
  [/Showing (\d+) \/ (\d+)/i, '显示 $1 / $2'],
  [/All \((\d+)\)/i, '全部 ($1)'],
  [/Verified \((\d+)\)/i, '已认证 ($1)'],
  [/Sample \((\d+)\)/i, '示例 ($1)'],
  [/Dishes \((\d+)\)/i, '美食 ($1)'],
  [/Shops \((\d+)\)/i, '店铺 ($1)'],
  [/Places \((\d+)\)/i, '景点 ($1)'],
  [/Show More Restaurants \((\d+) \/ (\d+)\)/i, '加载更多餐厅 ($1 / $2)'],
  [/No results found for "([^"]+)"/i, '未找到与“$1”相关的结果'],
  [/(\d+) Days Left/i, '剩余 $1 天'],
  [/VIP Expires:/i, 'VIP 到期日：'],
  [/My VIP Store:/i, '我的 VIP 店铺：'],
  [/✏️ Manage My VIP Store \(([^)]+)\)/i, '✏️ 管理我的 VIP 店铺 ($1)'],
  [/(\d+) reviews?/i, '$1 条真实评价'],
  [/No ratings yet/i, '暂无评分'],
  [/Welcome back, ([^!]+)!/i, '欢迎回来，$1！'],
  [/Welcome to the app, ([^!]+)!/i, '欢迎使用本应用，$1！'],
];

export function translateTextToChinese(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (EXACT_EN_TO_ZH_MAP[trimmed]) {
    return text.replace(trimmed, EXACT_EN_TO_ZH_MAP[trimmed]);
  }
  if (CAMBODIA_PROVINCE_ZH_MAP[trimmed]) {
    return text.replace(trimmed, CAMBODIA_PROVINCE_ZH_MAP[trimmed]);
  }

  let result = text;
  for (const [regex, replacement] of PHRASE_REPLACEMENTS_EN_TO_ZH) {
    if (regex.test(result)) {
      result = result.replace(regex, replacement);
    }
  }
  return result;
}

/**
 * Real-time DOM translation hook when `language === 'zh'`.
 * Ensures every English fallback label, placeholder, and dynamic badge is automatically
 * rendered in Simplified Chinese (中文) without touching underlying app data.
 */
export function useChineseDomTranslation(language: Language): void {
  useEffect(() => {
    if (language !== 'zh' || typeof document === 'undefined') return;

    const translateNode = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node: Text | null = walker.nextNode() as Text | null;
      while (node) {
        const parentTag = node.parentElement?.tagName;
        if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'CODE') {
          const raw = node.nodeValue || '';
          const translated = translateTextToChinese(raw);
          if (translated !== raw) {
            node.nodeValue = translated;
          }
        }
        node = walker.nextNode() as Text | null;
      }

      if (root instanceof HTMLElement || root instanceof Document) {
        const inputs = (root as ParentNode).querySelectorAll?.('input[placeholder], textarea[placeholder], [title]');
        inputs?.forEach((el) => {
          const ph = el.getAttribute('placeholder');
          if (ph) {
            const nextPh = translateTextToChinese(ph);
            if (nextPh !== ph) el.setAttribute('placeholder', nextPh);
          }
          const title = el.getAttribute('title');
          if (title) {
            const nextTitle = translateTextToChinese(title);
            if (nextTitle !== title) el.setAttribute('title', nextTitle);
          }
        });
      }
    };

    translateNode(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => translateNode(n));
        } else if (m.type === 'characterData' && m.target) {
          const raw = m.target.nodeValue || '';
          const translated = translateTextToChinese(raw);
          if (translated !== raw) {
            m.target.nodeValue = translated;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);
}
