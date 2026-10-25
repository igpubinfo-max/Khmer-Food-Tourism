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
    id: 'food',
    image: WELCOME_IMAGES.hero.src,
    imageWidth: WELCOME_IMAGES.hero.width,
    imageHeight: WELCOME_IMAGES.hero.height,
    objectPosition: '22% 50%',
    headline: {
      km: 'ស្វែងរកម្ហូបខ្មែរពិតៗ',
      en: 'Discover real Khmer food',
      zh: '发现正宗高棉美食',
    },
    sub: {
      km: 'ម្ហូបបុរាណ រូបមន្ត និងកន្លែងភ្លក់',
      en: 'Real dishes, recipes and where to taste them.',
      zh: '地道菜肴、食谱与品尝地点。',
    },
  },
  {
    id: 'places',
    image: WELCOME_IMAGES.places.src,
    imageWidth: WELCOME_IMAGES.places.width,
    imageHeight: WELCOME_IMAGES.places.height,
    objectPosition: '50% 50%',
    headline: {
      km: 'រកហាង និងកន្លែងនៅជិតអ្នក',
      en: 'Find shops & places near you',
      zh: '发现身边的店铺与景点',
    },
    sub: {
      km: 'ភោជនីយដ្ឋាន និងទីកន្លែងទេសចរណ៍ទូទាំងកម្ពុជា',
      en: 'Restaurants, cafés and sights across Cambodia.',
      zh: '遍布柬埔寨的餐厅、咖啡馆与景点。',
    },
  },
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
      km: 'បោះត្រាម្ហូបដែលអ្នកបានភ្លក់ ហើយអញ្ជើញមិត្តភក្តិ',
      en: 'Stamp every dish you try and invite your friends.',
      zh: '为每道尝过的菜盖章，并邀请好友。',
    },
  },
];

export const WELCOME_LABELS = {
  skip: { km: 'រំលង', en: 'Skip', zh: '跳过' },
  next: { km: 'បន្ទាប់', en: 'Next', zh: '下一步' },
  start: { km: 'ចាប់ផ្តើម', en: 'Get started', zh: '开始' },
  appName: { km: 'អាហារ & ទេសចរណ៍ខ្មែរ', en: 'Khmer Food & Tourism', zh: '高棉美食与旅游' },
} as const;

export const LANGUAGE_SWITCH: Array<{ code: Language; label: string }> = [
  { code: 'km', label: 'KM' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中' },
];
