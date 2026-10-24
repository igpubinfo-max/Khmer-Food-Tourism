import { FoodItem, Restaurant, TouristDestination, CommunityPost, User, AppSettings, RegistrationTransaction } from '../types';
import { initial100Foods } from './seedFoods';
import { initial100Restaurants } from './seedRestaurants';
import { initial100Destinations } from './seedDestinations';

// Registered user accounts database: Cleared per administrative directive (Backup preserved in /backup)
export const initialUsers: User[] = [];

export const initialAppSettings: AppSettings = {
  apkDownloadUrl: 'https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/download/v1.9.7/KhmerFoodTourism-v1.9.7.apk',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism',
  appStoreUrl: 'https://apps.apple.com/app/khmer-food-tourism/id1234567890',
  iosAppStoreUrl: 'https://apps.apple.com/app/khmer-food-tourism/id1234567890',
  iosTestFlightUrl: 'https://testflight.apple.com/join/khmerfoodtourism',
  supportQrImageUrl: '/donation-qr.png',
  supportBankName: 'ABA BANK / BAKONG KHQR',
  supportAccountName: 'CHEA KIMSENG',
  supportMessageKh: 'សូមជួយគាំទ្រការអភិវឌ្ឍន៍កម្មវិធី "អាហារ និងទេសចរណ៍ខ្មែរ" ដើម្បីផ្សព្វផ្សាយវប្បធម៌ និងម្ហូបខ្មែរទៅកាន់ពិភពលោក។ រាល់ការបរិច្ចាគស្ម័គ្រចិត្តរបស់លោកអ្នក គឺជាកម្លាំងចិត្តដ៏ធំធេងសម្រាប់ក្រុមការងារ!',
  supportMessageEn: 'Thank you for supporting Khmer Food & Tourism. Your kind voluntary contribution empowers us to continue promoting authentic Cambodian heritage and cuisine worldwide!',
  adminPasswordHash: 'pbkdf2$100000$70fcb2b4c0d7d330e0c35f90e46c1dc4d23d0a6ba9e8bf24d49f9236b54dbcd5$9f4c042b557cce87cacb3a142fef4082cded0ac5bf594f6a0fd167439f53b369',
  isAdminInitialized: true,
  promotionalFeeUsd: 2.99,
  promotionalFeeEnabled: true,
  promotionPeriodKh: 'កញ្ចប់ VIP ផ្លូវការ៖ $2.99 សម្រាប់ 30 ថ្ងៃ ឬ $4.99 សម្រាប់ 90 ថ្ងៃ',
  promotionPeriodEn: 'Official VIP Plans: $2.99 for 30 Days or $4.99 for 90 Days',
};

// 100+ Authentic Khmer Dishes
export const initialFoods: FoodItem[] = initial100Foods;

// 100+ Cambodian Restaurants & Food Shops
export const initialRestaurants: Restaurant[] = initial100Restaurants;

// 100+ Authentic Tourist Destinations across 25 Cambodian Provinces
export const initialDestinations: TouristDestination[] = initial100Destinations;

export const initialCommunityPosts: CommunityPost[] = [
  {
    id: 'post-1',
    authorId: 'user-traveler',
    authorName: 'អ្នកដំណើរខ្មែរ (Khmer Traveler)',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    authorRole: 'user',
    titleKh: 'បទពិសោធន៍ញ៉ាំក្តាមសេះឆាម្រេចខ្ចី នៅមាត់សមុទ្រកែប!',
    descriptionKh: 'ថ្ងៃនេះបានមកដល់ខេត្តកែប ឆ្ងាញ់មែនទែនបងប្អូនអើយ! ក្តាមសេះទើបស្រង់ពីកន្ត្រកសមុទ្រស្រស់ៗ សាច់ផ្អែមឆ្ងាញ់ លាយជាមួយម្រេចខ្ចីកំពតក្រអូបហឹរតិចៗ ញ៉ាំបណ្តើរមើលថ្ងៃលិចបណ្តើរ ពិតជាមានក្តីសុខខ្លាំងណាស់!',
    photoUrl: '/foods/food-27.jpg',
    categoryTag: 'គ្រឿងសមុទ្រ',
    locationName: 'ផ្សារក្តាមខេត្តកែប',
    likesCount: 38,
    likedByUserIds: ['admin-1', 'owner-1'],
    comments: [
      {
        id: 'c-1',
        authorId: 'owner-1',
        authorName: 'សុខ គីមលី',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'អរគុណបងដែលបានមកគាំទ្រ! លើកក្រោយមកទៀត ហាងយើងខ្ញុំមានបញ្ចុះតម្លៃជូនពិសេសបាទ។',
        createdAt: '១ ម៉ោងមុន',
      },
      {
        id: 'c-2',
        authorId: 'system-admin',
        authorName: 'ក្រុមការងាររដ្ឋបាល (Admin)',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: 'រូបភាពស្រស់ស្អាតណាស់! ក្តាមកំពត-កែបល្បីល្បាញលេខ១តែម្តង។',
        createdAt: '៣០ នាទីមុន',
      },
    ],
    createdAt: '២ ម៉ោងមុន',
    status: 'approved',
  },
  {
    id: 'post-2',
    authorId: 'owner-1',
    authorName: 'សុខ គីមលី (ម្ចាស់ហាង)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorRole: 'owner',
    titleKh: 'ចែករំលែករូបមន្តអាម៉ុកត្រីស្លឹកញរ រសជាតិដើមបែបបុរាណ',
    descriptionKh: 'ជំរាបសួរបងប្អូនទាំងអស់គ្នា! ថ្ងៃនេះខ្ញុំសូមចែករំលែកពីរបៀបចំហុយអាម៉ុកត្រីឱ្យសាច់ណែនទន់ល្អ គឺកុំចំហុយភ្លើងខ្លាំងពេក ហើយប្រើខ្ទិះដូងស្រស់ដើមខាប់ៗ ទើបទទួលបានក្លិនឈ្ងុយពិសា។ សាកល្បងទាំងអស់គ្នាណា!',
    photoUrl: '/foods/food-1.jpg',
    categoryTag: 'រូបមន្តម្ហូប',
    locationName: 'ខេត្តកំពត',
    likesCount: 65,
    likedByUserIds: ['owner-1'],
    comments: [
      {
        id: 'c-3',
        authorId: 'user-traveler',
        authorName: 'អ្នកដំណើរខ្មែរ',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        text: 'រូបមន្តល្អណាស់លោកពូ ចាំថ្ងៃចុងសប្តាហ៍នេះខ្ញុំសាកល្បងធ្វើតាម!',
        createdAt: '៤៥ នាទីមុន',
      },
    ],
    createdAt: '៥ ម៉ោងមុន',
    status: 'approved',
  },
];

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
