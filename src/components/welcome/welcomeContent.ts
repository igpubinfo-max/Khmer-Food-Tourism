import type { Language } from '../../types';

export interface WelcomeSlide {
  id: 'food' | 'places' | 'passport';
  /** WebP photo (full-bleed, object-cover) */
  image: string;
  imageWidth: number;
  imageHeight: number;
  /** CSS object-position so each slide shows a different part of the photo */
  objectPosition: string;
  headline: Record<Language, string>;
  tagline: Record<Language, string>;
  sub: Record<Language, string>;
}

export const WELCOME_IMAGES = {
  hero: { src: '/welcome/hero-bg.webp', width: 1264, height: 848 },
  places: { src: '/welcome/places.webp', width: 1280, height: 714 },
  logo: '/welcome/welcome-hero-icon.png?v=2.4.1',
  /** Existing app icon used if the welcome logo fails to load */
  logoFallback: '/icon-192.png?v=2.4.1',
} as const;

export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    id: 'passport',
    image: WELCOME_IMAGES.hero.src,
    imageWidth: WELCOME_IMAGES.hero.width,
    imageHeight: WELCOME_IMAGES.hero.height,
    objectPosition: '88% 50%',
    headline: {
      km: 'ស្វែងយល់អាហារ និងទេសចរណ៍កម្ពុជា',
      en: 'Discover Cambodia Food & Tourism',
      zh: '探索柬埔寨美食与旅游',
    },
    tagline: {
      km: 'ភ្លក្សរសជាតិកម្ពុជា • ស្វែងយល់ទឹកដីកម្ពុជា',
      en: 'Taste Cambodia. Explore Cambodia.',
      zh: '品味柬埔寨 · 探索柬埔寨',
    },
    sub: {
      km: 'មគ្គុទ្ទេសក៍ម្ហូបប្រពៃណី ភោជនីយដ្ឋាន និងតំបន់ទេសចរណ៍ទូទាំង ២៥ ខេត្ត-ក្រុង',
      en: 'Authentic dishes, local restaurants, and scenic destinations across all 25 provinces.',
      zh: '汇集全国 25 省市地道菜肴、精选餐厅与风景名胜。',
    },
  },
];

export const WELCOME_LABELS = {
  skip: { km: 'រំលង', en: 'Skip', zh: '跳过' },
  next: { km: 'បន្ទាប់', en: 'Next', zh: '下一步' },
  start: { km: 'ចាប់ផ្តើមស្វែងរក', en: 'Start Exploring', zh: '开始探索' },
  appName: {
    km: 'ស្វែងយល់អាហារ និងទេសចរណ៍កម្ពុជា',
    en: 'Discover Cambodia Food & Tourism',
    zh: '探索柬埔寨美食与旅游',
  },
  offlineBadge: {
    km: 'ប្រើបានទោះគ្មានអ៊ីនធឺណិត',
    en: 'Works Offline Anytime',
    zh: '支持离线随时浏览',
  },
  offlineSub: {
    km: 'មើលមុខម្ហូប រូបមន្ត និងកន្លែងដែលបានរក្សាទុក ដោយមិនបាច់ភ្ជាប់ Wi-Fi ឬទិន្នន័យចល័ត',
    en: 'Read dish guides, recipes, and saved places even without Wi-Fi or mobile data.',
    zh: '无需 Wi-Fi 或移动数据，随时查看菜品指南、食谱与收藏地点。',
  },
} as const;

export const LANGUAGE_SWITCH: Array<{ code: Language; label: string }> = [
  { code: 'km', label: 'ខ្មែរ' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
];
