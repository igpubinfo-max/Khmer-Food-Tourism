import { FoodItem, Restaurant, TouristDestination, User, AppSettings, RegistrationTransaction, TEN_VIP_BENEFITS } from '../types';
import { initial100Foods } from './seedFoods';
import { initial100Restaurants } from './seedRestaurants';
import { youthBrandedCafes30 } from './seedYouthBrandedCafes';
import { initial100Destinations } from './seedDestinations';

// Registered user accounts database: Cleared per administrative directive (Backup preserved in /backup)
export const initialUsers: User[] = [];

export const initialAppSettings: AppSettings = {
  apkDownloadUrl: '',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism',
  appStoreUrl: 'https://apps.apple.com/app/khmer-food-tourism/id6826976670',
  iosAppStoreUrl: 'https://apps.apple.com/app/khmer-food-tourism/id6826976670',
  iosTestFlightUrl: 'https://testflight.apple.com/join/khmerfoodtourism',
  supportQrImageUrl: '/images/aba_khqr_official_savuth.png',
  supportBankName: 'ABA BANK / BAKONG KHQR',
  supportAccountName: 'CHEA SAVUTH',
  supportMessageKh: 'សូមជួយគាំទ្រការអភិវឌ្ឍន៍កម្មវិធី «រសជាតិ និងទេសចរណ៍កម្ពុជា» ដើម្បីផ្សព្វផ្សាយម្ហូបអាហារ និងតំបន់ទេសចរណ៍កម្ពុជាទៅកាន់ពិភពលោក។ រាល់ការចូលរួមគាំទ្ររបស់លោកអ្នក គឺជាកម្លាំងចិត្តដ៏មានតម្លៃសម្រាប់ក្រុមការងារ!',
  supportMessageEn: 'Thank you for supporting Cambodia Flavors & Tourism. Your contribution helps us maintain the platform and share Cambodian cuisine and destinations worldwide.',
  adminPasswordHash: 'pbkdf2$100000$70fcb2b4c0d7d330e0c35f90e46c1dc4d23d0a6ba9e8bf24d49f9236b54dbcd5$e8fbcff0c413ac495fc73574eaaffce068ef980805549eee9f80522a174bf530',
  isAdminInitialized: true,
  promotionalFeeUsd: 2.99,
  promotionalFeeEnabled: true,
  promotionPeriodKh: 'សាកល្បង VIP 7 ថ្ងៃ FREE • កញ្ចប់អ្នកប្រើ៖ $2.99/ខែ, $6.99/90ថ្ងៃ, $19.99/ឆ្នាំ • កញ្ចប់ដាក់ហាង៖ $6.99/ខែ ឬ $59.99/ឆ្នាំ (Early-Bird $49.99)',
  promotionPeriodEn: '7-Day Free Trial • Consumer VIP: $2.99/mo, $6.99/90d, $19.99/yr • Shop Plan: $6.99/mo or $59.99/yr (Early-Bird $49.99)',
  vipShortDurationDays: 30,
  vipShortPriceUsd: 2.99,
  vipShortNameKh: 'VIP 30 ថ្ងៃ',
  vipShortNameEn: 'VIP 30 Days',
  vipLongDurationDays: 90,
  vipLongPriceUsd: 6.99,
  vipLongNameKh: 'VIP 90 ថ្ងៃ',
  vipLongNameEn: 'VIP 90 Days',
  additionalStoreFeeUsd: 6.99,
  includedFreeStoresPerVip: 0,
  vipFeaturedRotationEnabled: true,
  vipFeaturedDurationDays: 1,
  vipBenefitsList: TEN_VIP_BENEFITS,
  consumerVipEnabled: true,
  consumerTrialDays: 7,
  consumerTrialAiDailyLimit: 15,
  consumerPaidAiDailyLimit: 80,
  consumerPromo30dPriceUsd: 0.99,
  consumerPromo30dDays: 30,
  consumer30dPriceUsd: 2.99,
  consumer30dDays: 30,
  consumer90dPriceUsd: 6.99,
  consumer90dDays: 90,
  consumer365dPriceUsd: 19.99,
  consumer365dDays: 365,
  shopMonthlyPriceUsd: 6.99,
  shopMonthlyDays: 30,
  shopYearlyPriceUsd: 59.99,
  shopYearlyDays: 365,
  shopEarlyBirdEnabled: true,
  shopEarlyBirdYearlyPriceUsd: 49.99,
  shopEarlyBirdMaxShops: 50,
  shopEarlyBirdClaimedCount: 0,
  shopPayAfterApproval: true,
  settingsVersion: 100,
  settingsUpdatedAt: '2026-11-09T13:30:00.000Z',
  settingsUpdatedBy: 'រដ្ឋបាលប្រព័ន្ធ (Chea Savuth / Admin)',
};

// 100+ Authentic Khmer Dishes
export const initialFoods: FoodItem[] = initial100Foods;

// 100+ Cambodian Restaurants & Food Shops
export const initialRestaurants: Restaurant[] = [...youthBrandedCafes30, ...initial100Restaurants];

// 100+ Authentic Tourist Destinations across 25 Cambodian Provinces
export const initialDestinations: TouristDestination[] = initial100Destinations;

// No fake/demo auto-registered transactions — only genuine user & shop transactions are stored
export const initialTransactions: RegistrationTransaction[] = [];
