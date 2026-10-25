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
  sub: Record<Language, string>;
}

export const WELCOME_IMAGES = {
  hero: { src: '/welcome/hero-bg.webp', width: 1264, height: 848 },
  places: { src: '/welcome/places.webp', width: 1280, height: 714 },
  logo: '/welcome/welcome-logo.webp',
  /** Existing app icon used if the welcome logo fails to load */
  logoFallback: '/icon-192.png',
} as const;

export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    id: 'passport',
    image: WELCOME_IMAGES.hero.src,
    imageWidth: WELCOME_IMAGES.hero.width,
    imageHeight: WELCOME_IMAGES.hero.height,
    objectPosition: '88% 50%',
    headline: {
      km: 'ស្វែងយល់ពីម្ហូប និងទេសចរណ៍កម្ពុជា',
      en: 'Discover Cambodian Food & Travel',
      zh: '探索柬埔寨美食与旅游',
    },
    sub: {
      km: 'ម្ហូបបុរាណ រូបមន្ត ភោជនីយដ្ឋាន និងទីកន្លែងទេសចរណ៍ទូទាំងកម្ពុជា',
      en: 'Authentic dishes, recipes, restaurants and destinations across Cambodia.',
      zh: '地道菜肴、食谱、餐厅与柬埔寨各地景点。',
    },
  },
];

export const WELCOME_LABELS = {
  skip: { km: 'រំលង', en: 'Skip', zh: '跳过' },
  next: { km: 'បន្ទាប់', en: 'Next', zh: '下一步' },
  start: { km: 'ចាប់ផ្តើម', en: 'Get Started', zh: '开始使用' },
  appName: { km: 'អាហារ & ទេសចរណ៍ខ្មែរ', en: 'Khmer Food & Tourism', zh: '高棉美食与旅游' },
  offlineBadge: {
    km: 'ប្រើបានទោះគ្មានអ៊ីនធឺណិត — មិនត្រូវការអ៊ីនធឺណិត',
    en: 'Works Offline — No Internet Required',
    zh: '支持离线使用 — 无需网络连接',
  },
  offlineSub: {
    km: 'មើលព័ត៌មានម្ហូប រូបមន្ត និងមុខម្ហូបដែលបានរក្សាទុក ដោយមិនបាច់មាន Wi-Fi ឬទិន្នន័យចល័ត',
    en: 'Browse food guides, recipes, and saved favorites anytime without Wi-Fi or mobile data.',
    zh: '无需 Wi-Fi 或移动数据，随时浏览美食指南、食谱与已收藏内容。',
  },
} as const;

export const LANGUAGE_SWITCH: Array<{ code: Language; label: string }> = [
  { code: 'km', label: 'KM' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中' },
];
