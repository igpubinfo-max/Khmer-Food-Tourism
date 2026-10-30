import { FoodItem, Restaurant, TouristDestination, User, AppSettings, RegistrationTransaction, TEN_VIP_BENEFITS } from '../types';
import { initial100Foods } from './seedFoods';
import { initial100Restaurants } from './seedRestaurants';
import { initial100Destinations } from './seedDestinations';

// Registered user accounts database: Cleared per administrative directive (Backup preserved in /backup)
export const initialUsers: User[] = [];

export const initialAppSettings: AppSettings = {
  apkDownloadUrl: '',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism',
  appStoreUrl: 'https://apps.apple.com/app/khmer-food-tourism/id6826976670',
  iosAppStoreUrl: 'https://apps.apple.com/app/khmer-food-tourism/id6826976670',
  iosTestFlightUrl: 'https://testflight.apple.com/join/khmerfoodtourism',
  supportQrImageUrl: '/donation-qr.png',
  supportBankName: 'ABA BANK / BAKONG KHQR',
  supportAccountName: 'CHEA KIMSENG',
  supportMessageKh: 'សូមជួយគាំទ្រការអភិវឌ្ឍន៍កម្មវិធី «រសជាតិ និងទេសចរណ៍កម្ពុជា» ដើម្បីផ្សព្វផ្សាយម្ហូបអាហារ និងតំបន់ទេសចរណ៍កម្ពុជាទៅកាន់ពិភពលោក។ រាល់ការចូលរួមគាំទ្ររបស់លោកអ្នក គឺជាកម្លាំងចិត្តដ៏មានតម្លៃសម្រាប់ក្រុមការងារ!',
  supportMessageEn: 'Thank you for supporting Cambodia Flavors & Tourism. Your contribution helps us maintain the platform and share Cambodian cuisine and destinations worldwide.',
  adminPasswordHash: 'pbkdf2$100000$70fcb2b4c0d7d330e0c35f90e46c1dc4d23d0a6ba9e8bf24d49f9236b54dbcd5$9f4c042b557cce87cacb3a142fef4082cded0ac5bf594f6a0fd167439f53b369',
  isAdminInitialized: true,
  promotionalFeeUsd: 4.99,
  promotionalFeeEnabled: true,
  promotionPeriodKh: 'កញ្ចប់ VIP ផ្លូវការ៖ $4.99 សម្រាប់ 30 ថ្ងៃ ឬ $6.99 សម្រាប់ 60 ថ្ងៃ • បន្ថែមហាងថ្មី៖ $5.00 / ១ ហាង',
  promotionPeriodEn: 'Official VIP Plans: $4.99 for 30 Days or $6.99 for 60 Days • Additional Store: $5.00 / store',
  vipShortDurationDays: 30,
  vipShortPriceUsd: 4.99,
  vipShortNameKh: 'VIP 30 ថ្ងៃ',
  vipShortNameEn: 'VIP 30 Days',
  vipLongDurationDays: 60,
  vipLongPriceUsd: 6.99,
  vipLongNameKh: 'VIP 60 ថ្ងៃ',
  vipLongNameEn: 'VIP 60 Days',
  additionalStoreFeeUsd: 5.0,
  includedFreeStoresPerVip: 1,
  vipFeaturedRotationEnabled: true,
  vipFeaturedDurationDays: 1,
  vipBenefitsList: TEN_VIP_BENEFITS,
  settingsVersion: 25,
  settingsUpdatedAt: '2026-10-25T05:15:00.000Z',
  settingsUpdatedBy: 'រដ្ឋបាលប្រព័ន្ធ (Chea Savuth / Admin)',
};

// 100+ Authentic Khmer Dishes
export const initialFoods: FoodItem[] = initial100Foods;

// 100+ Cambodian Restaurants & Food Shops
export const initialRestaurants: Restaurant[] = initial100Restaurants;

// 100+ Authentic Tourist Destinations across 25 Cambodian Provinces
export const initialDestinations: TouristDestination[] = initial100Destinations;

export const initialTransactions: RegistrationTransaction[] = [
  {
    id: 'TXN-20261020-001',
    restaurantId: 'rest-1',
    restaurantNameKh: 'ភោជនីយដ្ឋាន ម្លិះ (Malis Restaurant)',
    restaurantNameEn: 'Malis Restaurant Phnom Penh',
    ownerId: 'owner-1',
    ownerName: 'Luu Meng (លូ ម៉េង)',
    ownerPhone: '015 814 888',
    amountUsd: 4.99,
    status: 'verified',
    paymentMethod: 'KHQR',
    transactionRef: 'KHQR-MB-9823419082',
    createdAt: '2026-01-15 08:30',
    verifiedAt: '2026-01-15 09:00',
    verifiedBy: 'System Administrator',
    notes: 'Verified via ABA Bank Bakong KHQR settlement.',
  },
  {
    id: 'TXN-20261020-002',
    restaurantId: 'rest-2',
    restaurantNameKh: 'ភោជនីយដ្ឋាន រំដេង (Romdeng Restaurant)',
    restaurantNameEn: 'Romdeng Restaurant Phnom Penh',
    ownerId: 'owner-2',
    ownerName: 'Friends International',
    ownerPhone: '092 219 509',
    amountUsd: 4.99,
    status: 'verified',
    paymentMethod: 'Bakong',
    transactionRef: 'BAKONG-TRX-447192831',
    createdAt: '2026-01-16 10:15',
    verifiedAt: '2026-01-16 11:00',
    verifiedBy: 'System Administrator',
    notes: 'Bakong peer-to-peer verified.',
  },
  {
    id: 'TXN-20261020-003',
    restaurantId: 'rest-7',
    restaurantNameKh: 'តូបនំបញ្ចុកទឹកសម្លខ្មែរ (ខេត្តកំពត 1)',
    restaurantNameEn: 'Fresh Num Banh Chok Stall (Kampot #1)',
    ownerId: 'owner-7',
    ownerName: 'សុខ គីមលី',
    ownerPhone: '098 765 432',
    amountUsd: 4.99,
    status: 'pending_verification',
    paymentMethod: 'KHQR',
    transactionRef: 'KHQR-ABA-5819203112',
    createdAt: '2026-10-20 12:40',
    notes: 'Awaiting admin verification against bank statement.',
  },
];
