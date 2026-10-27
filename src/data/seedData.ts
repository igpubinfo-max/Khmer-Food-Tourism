import { FoodItem, Restaurant, TouristDestination, User, AppSettings, RegistrationTransaction, TEN_VIP_BENEFITS } from '../types';
import { initial100Foods } from './seedFoods';
import { initial100Restaurants } from './seedRestaurants';
import { initial100Destinations } from './seedDestinations';

// Registered user accounts database: Cleared per administrative directive (Backup preserved in /backup)
export const initialUsers: User[] = [];

export const initialAppSettings: AppSettings = {
  apkDownloadUrl: 'https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/download/v2.3.0/KhmerFoodTourism-v2.3.0.apk',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism',
  appStoreUrl: 'https://apps.apple.com/app/khmer-food-tourism/id6826976670',
  iosAppStoreUrl: 'https://apps.apple.com/app/khmer-food-tourism/id6826976670',
  iosTestFlightUrl: 'https://testflight.apple.com/join/khmerfoodtourism',
  supportQrImageUrl: '/donation-qr.png',
  supportBankName: 'ABA BANK / BAKONG KHQR',
  supportAccountName: 'CHEA KIMSENG',
  supportMessageKh: 'សូមជួយគាំទ្រការអភិវឌ្ឍន៍កម្មវិធី "អាហារ និងទេសចរណ៍ខ្មែរ" ដើម្បីផ្សព្វផ្សាយវប្បធម៌ និងម្ហូបខ្មែរទៅកាន់ពិភពលោក។ រាល់ការបរិច្ចាគស្ម័គ្រចិត្តរបស់លោកអ្នក គឺជាកម្លាំងចិត្តដ៏ធំធេងសម្រាប់ក្រុមការងារ!',
  supportMessageEn: 'Thank you for supporting Khmer Food & Tourism. Your kind voluntary contribution empowers us to continue promoting authentic Cambodian heritage and cuisine worldwide!',
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

// 100+ Cambodian Restaurants & Food Shops (including Chumnor Kbal Koh Restaurant - ជំនោរក្បាលកោះ)
export const initialRestaurants: Restaurant[] = [
  ...initial100Restaurants,
  {
    id: 'rest-chumnor-kbal-koh',
    googlePlaceId: '0x31095729de2b8f21:0x7c6cd6284a4f844c',
    dataSource: 'google_maps',
    nameKh: 'ភោជនីយដ្ឋាន ជំនោរក្បាលកោះ (Chumnor Kbal Koh Restaurant)',
    nameEn: 'Chumnor Kbal Koh Restaurant (Jomnor Kbal Koh) - ជំនោរក្បាលកោះ',
    descriptionKh: 'ភោជនីយដ្ឋាន ជំនោរក្បាលកោះ ជាកន្លែងទទួលទានអាហារខ្មែរ និងលំហែកាយតាមមាត់ទន្លេដ៏ពេញនិយម ស្ថិតនៅភូមិកោះនរា សង្កាត់និរោធ ខណ្ឌច្បារអំពៅ រាជធានីភ្នំពេញ។',
    descriptionEn: 'Chumnor Kbal Koh Restaurant (Jomnor Kbal Koh) is a popular riverside dining and relaxation spot in Koh Nora, Sangkat Niroth, Khan Chbar Ampov, Phnom Penh.',
    photoUrl: '/Shop/rest-51.jpg',
    profileImage: '/Shop/rest-51.jpg',
    galleryPhotos: ['/Shop/rest-51.jpg'],
    addressKh: 'GWRW+QF4, ផ្លូវលំ ភូមិកោះនរា សង្កាត់និរោធ ខណ្ឌច្បារអំពៅ រាជធានីភ្នំពេញ',
    addressEn: 'GWRW+QF4, Koh Nora Village, Sangkat Niroth, Khan Chbar Ampov, Phnom Penh',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    phone: '012 649 051',
    openingHoursKh: '08:00 AM - 07:30 PM',
    openingHoursEn: '08:00 AM - 07:30 PM',
    priceLevel: '$$',
    mapUrl: 'https://www.google.com/maps?q=GWRW+QF4+%E1%9E%87%E1%9F%86%E1%9E%93%E1%9F%84%E1%9E%9A%E2%80%8B%E1%9E%80%E1%9F%92%E1%9E%94%E1%9E%B6%E1%9E%9B%E1%9E%80%E1%9F%84%E1%9F%87,+Koh+Rong+Samrong+Sangkat+Nerothor,+12357&ftid=0x31095729de2b8f21:0x7c6cd6284a4f844c',
    latitude: 11.541938,
    longitude: 104.946187,
    rating: 4.6,
    reviewCount: 185,
    signatureDishesKh: ['ម្ហូបខ្មែរមាត់ទន្លេ', 'ត្រីទន្លេដុតអំបិលម្ទេស', 'ស៊ុប និងគ្រឿងក្លែមពិសេស'],
    status: 'approved',
    isVerified: true,
    createdAt: '2026-10-24T00:00:00.000Z',
  },
];

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
