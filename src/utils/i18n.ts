import { useEffect } from 'react';
import { Language } from '../types';
import {
  EXACT_FOOD_NAME_ZH_MAP,
  FOOD_CATEGORY_ZH_MAP,
  EXACT_DESTINATION_NAME_ZH_MAP,
  translateDynamicTextToZh,
} from './zhDynamicTranslator';

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
  'គ្រប់ខេត្ត/ក្រុង': '全部省市',
  'គ្រប់ទីតាំង': '全部地区',
  'All Provinces': '全部省市',
  'All Locations': '全部地区',
  'All': '全部',
  'ភ្នំពេញ': '金边',
  'រាជធានីភ្នំពេញ': '金边市',
  'Phnom Penh': '金边',
  'សៀមរាប': '暹粒',
  'ខេត្តសៀមរាប': '暹粒省',
  'Siem Reap': '暹粒',
  'កំពត': '贡布',
  'ខេត្តកំពត': '贡布省',
  'Kampot': '贡布',
  'កែប': '白马',
  'ខេត្តកែប': '白马省',
  'Kep': '白马',
  'ព្រះសីហនុ': '西哈努克港',
  'ខេត្តព្រះសីហនុ': '西哈努克省',
  'Sihanoukville': '西哈努克港',
  'បាត់ដំបង': '马德望',
  'ខេត្តបាត់ដំបង': '马德望省',
  'Battambang': '马德望',
  'កំពង់ចាម': '磅湛',
  'ខេត្តកំពង់ចាម': '磅湛省',
  'Kampong Cham': '磅湛',
  'មណ្ឌលគិរី': '蒙多基里',
  'ខេត្តមណ្ឌលគិរី': '蒙多基里省',
  'Mondulkiri': '蒙多基里',
  'រតនគិរី': '腊塔纳基里',
  'ខេត្តរតនគិរី': '腊塔纳基里省',
  'Ratanakiri': '腊塔纳基里',
  'កោះកុង': '国公',
  'ខេត្តកោះកុង': '国公省',
  'Koh Kong': '国公',
  'កណ្តាល': '干丹',
  'ខេត្តកណ្តាល': '干丹省',
  'Kandal': '干丹',
  'កំពង់ឆ្នាំង': '磅清扬',
  'ខេត្តកំពង់ឆ្នាំង': '磅清扬省',
  'Kampong Chhnang': '磅清扬',
  'កំពង់ស្ពឺ': '磅士卑',
  'ខេត្តកំពង់ស្ពឺ': '磅士卑省',
  'Kampong Speu': '磅士卑',
  'កំពង់ធំ': '磅同',
  'ខេត្តកំពង់ធំ': '磅同省',
  'Kampong Thom': '磅同',
  'ក្រចេះ': '桔井',
  'ខេត្តក្រចេះ': '桔井省',
  'Kratie': '桔井',
  'តាកែវ': '茶胶',
  'ខេត្តតាកែវ': '茶胶省',
  'Takeo': '茶胶',
  'ព្រៃវែង': '波罗勉',
  'ខេត្តព្រៃវែង': '波罗勉省',
  'Prey Veng': '波罗勉',
  'ស្វាយរៀង': '柴桢',
  'ខេត្តស្វាយរៀង': '柴桢省',
  'Svay Rieng': '柴桢',
  'ពោធិ៍សាត់': '菩萨',
  'ខេត្តពោធិ៍សាត់': '菩萨省',
  'Pursat': '菩萨',
  'បន្ទាយមានជ័យ': '班迭棉吉',
  'ខេត្តបន្ទាយមានជ័យ': '班迭棉吉省',
  'Banteay Meanchey': '班迭棉吉',
  'ប៉ៃលិន': '拜林',
  'ខេត្តប៉ៃលិន': '拜林省',
  'Pailin': '拜林',
  'ឧត្តរមានជ័យ': '奥多棉吉',
  'ខេត្តឧត្តរមានជ័យ': '奥多棉吉省',
  'Oddar Meanchey': '奥多棉吉',
  'ព្រះវិហារ': '柏威夏',
  'ខេត្តព្រះវិហារ': '柏威夏省',
  'Preah Vihear': '柏威夏',
  'ស្ទឹងត្រែង': '上丁',
  'ខេត្តស្ទឹងត្រែង': '上丁省',
  'Stung Treng': '上丁',
  'ត្បូងឃ្មុំ': '特本克蒙',
  'ខេត្តត្បូងឃ្មុំ': '特本克蒙省',
  'Tboung Khmum': '特本克蒙',
};

export const CAMBODIA_PROVINCE_EN_MAP: Record<string, string> = {
  'ទាំងអស់': 'All Provinces',
  'គ្រប់ខេត្តក្រុង': 'All Provinces',
  'គ្រប់ខេត្ត/ក្រុង': 'All Provinces',
  'រាជធានីភ្នំពេញ': 'Phnom Penh',
  'ភ្នំពេញ': 'Phnom Penh',
  'សៀមរាប': 'Siem Reap',
  'ខេត្តសៀមរាប': 'Siem Reap',
  'កំពត': 'Kampot',
  'ខេត្តកំពត': 'Kampot',
  'កែប': 'Kep',
  'ខេត្តកែប': 'Kep',
  'ព្រះសីហនុ': 'Sihanoukville',
  'ខេត្តព្រះសីហនុ': 'Sihanoukville',
  'បាត់ដំបង': 'Battambang',
  'ខេត្តបាត់ដំបង': 'Battambang',
  'កំពង់ចាម': 'Kampong Cham',
  'ខេត្តកំពង់ចាម': 'Kampong Cham',
  'មណ្ឌលគិរី': 'Mondulkiri',
  'ខេត្តមណ្ឌលគិរី': 'Mondulkiri',
  'រតនគិរី': 'Ratanakiri',
  'ខេត្តរតនគិរី': 'Ratanakiri',
  'កោះកុង': 'Koh Kong',
  'ខេត្តកោះកុង': 'Koh Kong',
  'កណ្តាល': 'Kandal',
  'ខេត្តកណ្តាល': 'Kandal',
  'កំពង់ឆ្នាំង': 'Kampong Chhnang',
  'ខេត្តកំពង់ឆ្នាំង': 'Kampong Chhnang',
  'កំពង់ស្ពឺ': 'Kampong Speu',
  'ខេត្តកំពង់ស្ពឺ': 'Kampong Speu',
  'កំពង់ធំ': 'Kampong Thom',
  'ខេត្តកំពង់ធំ': 'Kampong Thom',
  'ក្រចេះ': 'Kratie',
  'ខេត្តក្រចេះ': 'Kratie',
  'តាកែវ': 'Takeo',
  'ខេត្តតាកែវ': 'Takeo',
  'ព្រៃវែង': 'Prey Veng',
  'ខេត្តព្រៃវែង': 'Prey Veng',
  'ស្វាយរៀង': 'Svay Rieng',
  'ខេត្តស្វាយរៀង': 'Svay Rieng',
  'ពោធិ៍សាត់': 'Pursat',
  'ខេត្តពោធិ៍សាត់': 'Pursat',
  'បន្ទាយមានជ័យ': 'Banteay Meanchey',
  'ខេត្តបន្ទាយមានជ័យ': 'Banteay Meanchey',
  'ប៉ៃលិន': 'Pailin',
  'ខេត្តប៉ៃលិន': 'Pailin',
  'ឧត្តរមានជ័យ': 'Oddar Meanchey',
  'ខេត្តឧត្តរមានជ័យ': 'Oddar Meanchey',
  'ព្រះវិហារ': 'Preah Vihear',
  'ខេត្តព្រះវិហារ': 'Preah Vihear',
  'ស្ទឹងត្រែង': 'Stung Treng',
  'ខេត្តស្ទឹងត្រែង': 'Stung Treng',
  'ត្បូងឃ្មុំ': 'Tboung Khmum',
  'ខេត្តត្បូងឃ្មុំ': 'Tboung Khmum',
};

export function translateProvince(prov: string, lang: Language): string {
  if (lang === 'km') return prov;
  if (lang === 'zh') return CAMBODIA_PROVINCE_ZH_MAP[prov] || prov;
  return CAMBODIA_PROVINCE_EN_MAP[prov] || prov;
}

export function translateProvinceName(provKh: string, provEn: string | undefined, lang: Language): string {
  if (lang === 'km') return provKh;
  if (lang === 'zh') {
    return (
      CAMBODIA_PROVINCE_ZH_MAP[provKh] ||
      (provEn ? CAMBODIA_PROVINCE_ZH_MAP[provEn] : undefined) ||
      provEn ||
      provKh
    );
  }
  return CAMBODIA_PROVINCE_EN_MAP[provKh] || provEn || provKh;
}

/**
 * Exact English -> Simplified Chinese UI Dictionary
 */
export const EXACT_EN_TO_ZH_MAP: Record<string, string> = {
  // Navigation & Header
  'Home': '首页',
  'Food': '美食',
  'Dishes': '高棉美食',
  'Shops': '餐厅',
  'Restaurants': '餐厅与店铺',
  'Travel': '旅游',
  'Tourism': '旅游景点',
  'Feed': '社区',
  'Community': '美食社区',
  'Account': '我的',
  'Profile': '我的',
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
  'Nature & Falls': '自然与瀑布',
  'Islands & Beaches': '海岛与海滩',
  'Mountains': '高山与国家公园',
  '🔥 TikTok & FB Viral': '🔥 TikTok & FB 热门打卡',
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

  // Food Directory & Detail Modal
  'Khmer Food Collection (100+ Dishes)': '高棉传统美食图鉴 (200+ 道菜品)',
  '📂 Browse by Category (Samlor • Cha • Sngor • Dessert):': '📂 按高棉菜系分类浏览（炖汤 • 小炒 • 清汤 • 甜点）：',
  'All Menus': '全部菜品',
  '1. Samlor': '1. 炖汤/咖喱',
  '1. Samlor (Soup/Curry)': '1. 炖汤与咖喱',
  '2. Cha': '2. 热炒/烧烤',
  '2. Cha (Stir-Fry)': '2. 热炒与烧烤',
  '3. Sngor': '3. 清汤/汤粉',
  '3. Sngor (Boiled Soup)': '3. 清汤与汤粉',
  '4. Bong Aem': '4. 高棉甜点',
  '4. Bong Aem (Dessert)': '4. 传统甜点与糕饼',
  'Samlor & Curries': '高棉炖汤与咖喱 (Samlor)',
  'Traditional Khmer Samlor, Curries, Amok, Stews & Braised Dishes': '传统高棉浓汤、咖喱、阿莫克、红烧与特色炖菜',
  'Stir-Fry & Savory': '猛火小炒与风味烧烤 (Cha)',
  'Wok Stir-Fries, Lok Lak, Fried Noodles/Rice, Grilled & Salads': '高棉小炒、摇晃牛肉粒、炒粉炒饭、炭火烧烤与酸柑沙拉',
  'Boiled Soups & Broths': '清炖鲜汤与汤粉米粥 (Sngor)',
  'Clear Boiled Soups, Herbal Broths, Hotpots, Porridges & Noodle Soups': '酸辣清汤、草本养生汤、高棉火锅、鲜粥与招牌汤粉',
  'Khmer Desserts & Cakes': '高棉传统甜点与糕饼 (Bong Aem)',
  'Traditional Khmer Sweet Desserts, Custard, Pudding & Sweet Cakes': '传统高棉椰浆甜品、南瓜炖蛋、蕉叶粽糕与鲜榨特饮',
  'Reference photo': '参考图片',
  'Traditional Khmer Recipe': '正宗高棉传统食谱',
  'Cook': '烹饪时间',
  'Serves': '食用份量',
  'Energy': '热量',
  'Level': '制作难度',
  'Easy': '简单',
  'Medium': '中等',
  'Hard': '进阶',
  'ងាយ': '简单',
  'មធ្យម': '中等',
  'ជំនាញ': '进阶',
  'About this Dish': '菜品介绍',
  'Ingredients Needed': '所需食材清单',
  'Step-by-Step Instructions': '详细烹饪步骤',
  'Share this recipe with friends': '将这道美食食谱分享给好友',
  'Share App': '分享应用',
  'Copy link': '复制链接',
  'No matching dishes found': '未找到匹配的菜品',
  'Clear search': '清除搜索',
  'Add Food': '添加菜品',

  // Restaurant & Tourism Views
  'Restaurant Directory': '餐厅与美食店铺名录',
  'Scenic Destinations': '柬埔寨热门旅游景点',
  'Google Maps': '谷歌地图搜索',
  'Google Maps Search': '谷歌地图搜索',
  'ស្វែងរកលើ Google Maps': '谷歌地图搜索',
  'ស្វែងរក Google Maps': '谷歌地图搜索',
  'AI Check-in': 'AI 探店打卡',
  'My Store': '管理我的店铺',
  'Add Store': '添加 VIP 店铺',
  'Manage My Shop': '管理我的店铺',
  'Premium': '尊享 VIP',
  'Premium VIP': '尊享 VIP',
  'VIP Premium Member': '尊享 VIP 会员店铺',
  'Free': '免费入驻',
  'Free Listing ($0)': '免费入驻 ($0)',
  'Verified': '官方认证',
  'Sample': '示例店铺',
  'Register Your VIP Restaurant (1 Store)': '注册您的专属 VIP 餐厅 (1 家店铺)',
  '+ Register Your VIP Restaurant (1 Store)': '+ 注册您的专属 VIP 餐厅 (1 家店铺)',
  'No restaurants matched your filters': '未找到符合筛选条件的餐厅',
  'No destinations match your criteria': '未找到符合筛选条件的旅游景点',
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
  'View': '查看',
  'View Menu': '查看菜单',
  'View Details': '查看详情',
  'Change Photo': '更换图片',
  'Upload Photo': '上传图片',
  'Save Changes': '保存修改',
  'Owner Management Hub': '店主管理中心',
  'Free Entry': '免费入场',
  'All year round': '全年皆宜',

  // Google Maps Search Modal
  '🗺️ Google Maps Search — Shops & Tourist Attractions': '🗺️ Google 地图搜索 — 餐厅店铺与旅游景点',
  'Search by place name, category, province, or GPS location • Automatic duplicate protection': '支持按名称、类别、省市或 GPS 位置搜索 • 自动防重复保护',
  'Quick Search:': '快捷搜索：',
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
  'Prev': '上一页',
  'Next': '下一页',
  'Load More Results from Google Maps': '从 Google 地图加载更多结果',

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

  // Community Feed & Create Post Modal
  'Community Feed': '美食与旅游社区',
  'Share delicious food, recipes & travel': '分享地道美食、传统食谱与精彩旅程',
  'Post': '发布动态',
  'Owner': '店主',
  'Admin': '管理员',
  'Write a comment...': '写下您的评论...',
  'Please log in to like posts': '请先登录后再点赞',
  'Please log in to comment': '请先登录后再发表评论',
  'Comment added!': '评论发表成功！',
  'Delete this post?': '确定要删除这条动态吗？',
  'Post deleted': '动态已删除',
  'Create Community Post': '发布社区动态',
  'Share your food experience, recipe, or travel spot': '分享您的美食体验、烹饪食谱或旅游打卡点',
  'Post Title': '动态标题',
  'Category': '分类标签',
  'Location / Province': '所在地点 / 省份',
  'Description / Story / Recipe': '详细内容 / 美食故事 / 食谱做法',
  'Photo (Upload or URL)': '配图（上传照片或输入链接）',
  'Publish Post': '立即发布动态',
  'Khmer Food': '高棉美食',
  'Cooking Recipe': '烹饪食谱',
  'Food Review': '探店点评',
  'Travel / Tour': '旅游打卡',
  'Dessert & Drink': '甜品与饮品',
};

/**
 * Partial phrase replacements for dynamic strings when `language === 'zh'`
 */
const PHRASE_REPLACEMENTS_EN_TO_ZH: Array<[RegExp, string]> = [
  [/Showing (\d+) of (\d+) authentic dishes/i, '显示 $1 / $2 道正宗高棉菜品'],
  [/Showing (\d+) of (\d+) \((\d+) verified\)/i, '显示 $1 / $2 家店铺（$3 家官方认证）'],
  [/Showing (\d+) travel spots/i, '共显示 $1 处旅游景点'],
  [/Showing (\d+) \/ (\d+)/i, '显示 $1 / $2'],
  [/All \((\d+)\)/i, '全部 ($1)'],
  [/Verified \((\d+)\)/i, '已认证 ($1)'],
  [/Sample \((\d+)\)/i, '示例 ($1)'],
  [/(\d+) dishes/i, '$1 道菜品'],
  [/(\d+) items/i, '$1 道菜'],
  [/Category #(\d+)/i, '第 $1 类'],
  [/Dishes \((\d+)\)/i, '美食 ($1)'],
  [/Shops \((\d+)\)/i, '店铺 ($1)'],
  [/Places \((\d+)\)/i, '景点 ($1)'],
  [/Show More Dishes \((\d+) \/ (\d+)\)/i, '加载更多美食 ($1 / $2)'],
  [/Show More Restaurants \((\d+) \/ (\d+)\)/i, '加载更多餐厅 ($1 / $2)'],
  [/Show More Destinations \((\d+) \/ (\d+)\)/i, '加载更多景点 ($1 / $2)'],
  [/Page (\d+) of (\d+) \((\d+) places\)/i, '第 $1 / $2 页（共 $3 个地点）'],
  [/No results found for "([^"]+)"/i, '未找到与“$1”相关的结果'],
  [/(\d+) Days Left/i, '剩余 $1 天'],
  [/VIP Expires:/i, 'VIP 到期日：'],
  [/My VIP Store:/i, '我的 VIP 店铺：'],
  [/Tap below to manage menus, prices, photos & info\./i, '点击下方按钮管理菜单、价格、照片及店铺信息。'],
  [/Manage My VIP Store \(([^)]+)\)/i, '管理我的 VIP 店铺 ($1)'],
  [/(\d+)\/(\d+) មុខម្ហូប/i, '$1/$2 道菜品'],
  [/(\d+) reviews?/i, '$1 条真实评价'],
  [/(\d+)\s*cal\b/i, '$1 千卡'],
  [/(\d+)\s*kcal\b/i, '$1 千卡'],
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
  if (EXACT_FOOD_NAME_ZH_MAP[trimmed]) {
    return text.replace(trimmed, EXACT_FOOD_NAME_ZH_MAP[trimmed]);
  }
  if (FOOD_CATEGORY_ZH_MAP[trimmed]) {
    return text.replace(trimmed, FOOD_CATEGORY_ZH_MAP[trimmed]);
  }
  if (EXACT_DESTINATION_NAME_ZH_MAP[trimmed]) {
    return text.replace(trimmed, EXACT_DESTINATION_NAME_ZH_MAP[trimmed]);
  }

  let result = text;
  for (const [regex, replacement] of PHRASE_REPLACEMENTS_EN_TO_ZH) {
    if (regex.test(result)) {
      result = result.replace(regex, replacement);
    }
  }

  if (result !== text) return result;

  // If it's a multi-word English sentence/label in the UI, translate dynamically
  if (/^[A-Za-z0-9\s,.'":;!?()&/•+-]{4,}$/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    const dyn = translateDynamicTextToZh(trimmed);
    if (dyn && dyn !== trimmed && /[\u4E00-\u9FFF]/.test(dyn)) {
      return text.replace(trimmed, dyn);
    }
  }

  return result;
}

/**
 * Reversible, React-safe DOM translation hook when `language === 'zh'`.
 * Saves original text node values and attributes BEFORE translating to Chinese,
 * and restores 100% of mutated DOM nodes immediately when switching back to Khmer or English.
 */
export function useChineseDomTranslation(language: Language): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const mutatedTextNodes = new Map<Text, string>();
    const mutatedPlaceholders = new Map<Element, string>();
    const mutatedTitles = new Map<Element, string>();

    const restoreAllNodes = () => {
      mutatedTextNodes.forEach((origText, textNode) => {
        try {
          if (textNode.isConnected) {
            textNode.nodeValue = origText;
          }
        } catch {
          // ignore detached node
        }
      });
      mutatedTextNodes.clear();

      mutatedPlaceholders.forEach((origPh, el) => {
        try {
          if (el.isConnected) {
            el.setAttribute('placeholder', origPh);
          }
        } catch {
          // ignore
        }
      });
      mutatedPlaceholders.clear();

      mutatedTitles.forEach((origTitle, el) => {
        try {
          if (el.isConnected) {
            el.setAttribute('title', origTitle);
          }
        } catch {
          // ignore
        }
      });
      mutatedTitles.clear();
    };

    if (language !== 'zh') {
      restoreAllNodes();
      return;
    }

    let isApplying = false;

    const translateNode = (root: Node) => {
      if (isApplying) return;
      isApplying = true;
      try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let node: Text | null = walker.nextNode() as Text | null;
        while (node) {
          const parentTag = node.parentElement?.tagName;
          if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'CODE') {
            const raw = node.nodeValue || '';
            const translated = translateTextToChinese(raw);
            if (translated !== raw) {
              if (!mutatedTextNodes.has(node)) {
                mutatedTextNodes.set(node, raw);
              }
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
              if (nextPh !== ph) {
                if (!mutatedPlaceholders.has(el)) {
                  mutatedPlaceholders.set(el, ph);
                }
                el.setAttribute('placeholder', nextPh);
              }
            }
            const title = el.getAttribute('title');
            if (title) {
              const nextTitle = translateTextToChinese(title);
              if (nextTitle !== title) {
                if (!mutatedTitles.has(el)) {
                  mutatedTitles.set(el, title);
                }
                el.setAttribute('title', nextTitle);
              }
            }
          });
        }
      } finally {
        isApplying = false;
      }
    };

    translateNode(document.body);

    const observer = new MutationObserver((mutations) => {
      if (isApplying) return;
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => translateNode(n));
        } else if (m.type === 'characterData' && m.target) {
          const textNode = m.target as Text;
          const raw = textNode.nodeValue || '';
          const translated = translateTextToChinese(raw);
          if (translated !== raw) {
            isApplying = true;
            try {
              mutatedTextNodes.set(textNode, raw);
              textNode.nodeValue = translated;
            } finally {
              isApplying = false;
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      restoreAllNodes();
    };
  }, [language]);
}
