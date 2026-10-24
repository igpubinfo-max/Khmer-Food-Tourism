/**
 * AI-Powered Business Category Verification Service for VIP "Create My Store"
 *
 * Enforces strict food-business eligibility for VIP store creation & updates:
 * - APPROVED: Restaurants, food shops, street food stalls, cafés, bakeries, dessert shops,
 *   noodle/rice/soup/BBQ eateries, and businesses selling prepared food or meals.
 * - REJECTED: Grocery stores selling raw/packaged household goods, minimarts, supermarkets,
 *   clothing/fashion stores, shoe shops, electronics/phone shops, computer repair, cosmetics/salons,
 *   pharmacies/clinics, hardware/construction stores, auto/motorcycle dealers/garages, real estate,
 *   finance/pawnshops, or any attempt to bypass verification with misleading food prefixes.
 * - PENDING_REVIEW: Uncertain or ambiguous submissions (e.g., generic proper-noun shop name without
 *   recognizable prepared dishes/meals, or borderline descriptions) — routed to Admin for manual review
 *   instead of auto-approval.
 *
 * Includes both deterministic multilingual semantic + cross-field anti-bypass analysis AND
 * multimodal Gemini Vision API analysis (when configured), plus server-side final validation
 * before saving or publishing any store.
 */

import {
  AiStoreCategoryDecision,
  AiStoreCategoryVerificationReport,
  DetectedBusinessSubCategory,
  RestaurantMenuItem,
} from '../types';
import { getCloudApiConfig, isSupabaseConfigured, pullCloudDocument, pushCloudDocument } from './supabaseService';

export interface StoreVerificationCandidateInput {
  id?: string;
  nameKh: string;
  nameEn?: string;
  descriptionKh?: string;
  descriptionEn?: string;
  signatureDishesKh?: string[];
  addressKh?: string;
  provinceKh?: string;
  phone?: string;
  photoUrl?: string;
  profileImage?: string;
  foodImages?: string[];
  galleryPhotos?: string[];
  menuItems?: Partial<RestaurantMenuItem>[];
  ownerId?: string;
  ownerName?: string;
}

interface NonFoodCategoryRule {
  category: DetectedBusinessSubCategory;
  labelKh: string;
  labelEn: string;
  reasonKh: string;
  reasonEn: string;
  keywords: string[];
}

// Comprehensive multilingual non-food business rules (Khmer, English, Chinese)
const NON_FOOD_CATEGORY_RULES: NonFoodCategoryRule[] = [
  {
    category: 'grocery_raw_goods',
    labelKh: 'ហាងលក់គ្រឿងទេស / ផ្សារម៉ាត / ទំនិញប្រើប្រាស់ប្រចាំថ្ងៃ',
    labelEn: 'Grocery Store / Minimart / Raw Household Goods',
    reasonKh:
      'ហាងលក់គ្រឿងទេស ម៉ាត ផ្សារទំនើប ឬអាជីវកម្មលក់គ្រឿងក្រៀម/បន្លែសាច់ឆៅ/ទំនិញប្រើប្រាស់ប្រចាំថ្ងៃ មិនត្រូវបានអនុញ្ញាតឱ្យចុះបញ្ជីក្នុងផ្នែកភោជនីយដ្ឋាន និងអាហារចម្អិនស្រាប់ឡើយ។ អនុញ្ញាតតែហាងលក់ម្ហូបអាហារ ឬភេសជ្ជៈចម្អិនស្រាប់ប៉ុណ្ណោះ។',
    reasonEn:
      'Grocery shops, minimarts, supermarkets, and stores selling raw ingredients or household goods are not eligible. Only businesses serving prepared food, meals, or freshly made beverages are allowed.',
    keywords: [
      'គ្រឿងទេស',
      'ហាងលក់គ្រឿងទេស',
      'តូបគ្រឿងទេស',
      'មីនីម៉ាត',
      'ផ្សារទំនើប',
      'លក់អង្ករ',
      'អង្ករបោះដុំ',
      'គ្រឿងក្រៀម',
      'គ្រឿងកំប៉ុង',
      'លក់សាច់ឆៅ',
      'លក់បន្លែឆៅ',
      'សាប៊ូ',
      'ទឹកលាងចាន',
      'របស់របរប្រើប្រាស់ក្នុងផ្ទះ',
      'ទំនិញបោះដុំ',
      'ចាប់ហួយ',
      'ហាងចាប់ហួយ',
      'តូបចាប់ហួយ',
      'grocery',
      'groceries',
      'supermarket',
      'minimart',
      'mini mart',
      'convenience store',
      'hypermarket',
      'raw meat',
      'raw vegetables',
      'household goods',
      'dry goods',
      'detergent',
      'wholesale grocery',
      '杂货店',
      '超市',
      '便利店',
      '日用品',
      '生鲜超市',
      '粮油店',
    ],
  },
  {
    category: 'clothing_fashion',
    labelKh: 'ហាងលក់សម្លៀកបំពាក់ / ស្បែកជើង / ម៉ូដសម្លៀកបំពាក់',
    labelEn: 'Clothing / Fashion / Footwear Store',
    reasonKh:
      'អាជីវកម្មលក់សម្លៀកបំពាក់ ខោអាវ ស្បែកជើង កាបូប ឬគ្រឿងអលង្ការ មិនមែនជាអាជីវកម្មម្ហូបអាហារឡើយ។ កម្មវិធី Khmer Food & Tourism អនុញ្ញាតឱ្យបង្កើតហាងសម្រាប់តែភោជនីយដ្ឋាន អាហារដ្ឋាន និងហាងលក់ម្ហូបអាហារប៉ុណ្ណោះ។',
    reasonEn:
      'Clothing stores, fashion boutiques, shoe shops, and accessory stores are unrelated to food. Only restaurants, eateries, and prepared food shops are permitted.',
    keywords: [
      'ខោអាវ',
      'សម្លៀកបំពាក់',
      'ហាងលក់ខោអាវ',
      'លក់ខោអាវ',
      'អាវយឺត',
      'អាវសាច់ក្រណាត់',
      'ខោខូវប៊យ',
      'រ៉ូប',
      'រ៉ូបរាត្រីសមោសរ',
      'ហាងកាត់ដេរ',
      'ប៉ាក់ឌិន',
      'ហូលផាមួង',
      'ស្បែកជើង',
      'ហាងស្បែកជើង',
      'កាបូបដៃ',
      'លក់កាបូប',
      'គ្រឿងអលង្ការ',
      'នាឡិកាដៃ',
      'វ៉ែនតា',
      'ខោអាវជជុះ',
      'ខោអាវក្បាលគីប',
      'clothing',
      'clothes',
      'apparel',
      'fashion',
      'boutique',
      'garment',
      't-shirt',
      'jeans',
      'dress shop',
      'tailor',
      'footwear',
      'shoe store',
      'shoes shop',
      'sneakers',
      'handbag',
      'jewelry',
      'watch shop',
      'menswear',
      'womenswear',
      '服装店',
      '女装',
      '男装',
      '童装',
      '鞋店',
      '服装',
      '首饰店',
    ],
  },
  {
    category: 'electronics_mobile',
    labelKh: 'ហាងលក់ទូរស័ព្ទ / កុំព្យូទ័រ / គ្រឿងអេឡិចត្រូនិក',
    labelEn: 'Electronics / Mobile Phone / Computer Shop',
    reasonKh:
      'ហាងលក់ទូរស័ព្ទ កុំព្យូទ័រ គ្រឿងអេឡិចត្រូនិក ឬសេវាជួសជុលគ្រឿងអេឡិចត្រូនិក មិនមែនជាអាជីវកម្មម្ហូបអាហារឡើយ។ សូមចុះបញ្ជីតែហាងដែលលក់ម្ហូបអាហារ ឬភេសជ្ជៈចម្អិនស្រាប់ប៉ុណ្ណោះ។',
    reasonEn:
      'Electronics stores, mobile phone shops, computer stores, and repair services are not food businesses and cannot be registered.',
    keywords: [
      'លក់ទូរស័ព្ទ',
      'ហាងទូរស័ព្ទ',
      'ទូរស័ព្ទដៃ',
      'ជួសជុលទូរស័ព្ទ',
      'អ៊ុតកញ្ចក់ទូរស័ព្ទ',
      'ដូរអេក្រង់',
      'កុំព្យូទ័រ',
      'ហាងកុំព្យូទ័រ',
      'ឡ্যাপថប',
      'គ្រឿងអេឡិចត្រូនិក',
      'អេឡិចត្រូនិក',
      'ដុំសាក',
      'កាសទូរស័ព្ទ',
      'បាសបំពងសំឡេង',
      'កាមេរ៉ាសុវត្ថិភាព',
      'ទូរទស្សន៍',
      'ម៉ាស៊ីនបោកខោអាវ',
      'ម៉ាស៊ីនត្រជាក់',
      'electronics',
      'phone shop',
      'mobile shop',
      'cell phone',
      'smartphone',
      'iphone',
      'ipad',
      'macbook',
      'samsung galaxy',
      'oppo',
      'vivo',
      'xiaomi',
      'computer shop',
      'laptop repair',
      'pc gaming',
      'phone repair',
      'screen replacement',
      'charger',
      'earphone',
      '电子产品',
      '手机店',
      '电脑店',
      '手机维修',
      '数码店',
      '家电',
    ],
  },
  {
    category: 'cosmetics_salon',
    labelKh: 'ហាងគ្រឿងសម្អាង / សាឡន / កាត់សក់ & កែសម្ផស្ស',
    labelEn: 'Cosmetics / Beauty Salon / Barbershop',
    reasonKh:
      'ហាងលក់គ្រឿងសម្អាង ឡេលាបស្បែក សាឡនកែសម្ផស្ស ឬហាងកាត់សក់ មិនមែនជាអាជីវកម្មម្ហូបអាហារឡើយ។ សូមចុះបញ្ជីតែភោជនីយដ្ឋាន ឬហាងលក់ម្ហូបអាហារប៉ុណ្ណោះ។',
    reasonEn:
      'Cosmetics shops, skincare stores, beauty salons, and barbershops are not food businesses.',
    keywords: [
      'គ្រឿងសម្អាង',
      'លក់ឡេ',
      'ឡេលាបស្បែក',
      'ម្សៅផាត់មុខ',
      'ក្រែមលាបមាត់',
      'ទឹកអប់',
      'សាឡន',
      'ហាងកាត់សក់',
      'កាត់សក់បុរស',
      'អ៊ុតសក់',
      'លាបពណ៌សក់',
      'ធ្វើក្រចក',
      'កែសម្ផស្ស',
      'ម៉ាស្សា',
      'ស្ប៉ា',
      'cosmetics',
      'skincare',
      'makeup',
      'lipstick',
      'perfume',
      'beauty salon',
      'hair salon',
      'barbershop',
      'nail salon',
      'manicure',
      'massage spa',
      '化妆品',
      '美容院',
      '美发',
      '理发店',
      '美甲',
      '护肤品',
    ],
  },
  {
    category: 'pharmacy_medical',
    labelKh: 'ឱសថស្ថាន / គ្លីនិក / ផលិតផលសុខភាព',
    labelEn: 'Pharmacy / Medical Clinic / Health Supplements',
    reasonKh:
      'ឱសថស្ថាន ហាងលក់ថ្នាំពេទ្យ គ្លីនិក ឬអាជីវកម្មលក់អាហារបំប៉នសុខភាព មិនមែនជាភោជនីយដ្ឋាន ឬហាងលក់ម្ហូបអាហារឡើយ។',
    reasonEn:
      'Pharmacies, medical clinics, and supplement stores are not eligible for restaurant registration.',
    keywords: [
      'ឱសថស្ថាន',
      'លក់ថ្នាំពេទ្យ',
      'ថ្នាំពេទ្យ',
      'គ្លីនិក',
      'បន្ទប់ពិគ្រោះជំងឺ',
      'ពេទ្យធ្មេញ',
      'មន្ទីរពេទ្យ',
      'អាហារបំប៉ន',
      'ថ្នាំសម្រកទម្ងន់',
      'pharmacy',
      'drugstore',
      'medical clinic',
      'dental clinic',
      'hospital',
      'medicine shop',
      'supplements',
      '药店',
      '大药房',
      '诊所',
      '医院',
    ],
  },
  {
    category: 'hardware_construction',
    labelKh: 'ហាងគ្រឿងសំណង់ / គ្រឿងសង្ហារិម / ដេគ័រ',
    labelEn: 'Hardware / Construction Materials / Furniture Store',
    reasonKh:
      'ដេប៉ូលក់គ្រឿងសំណង់ ដែក ស៊ីម៉ងត៍ ឬហាងលក់គ្រឿងសង្ហារិម មិនមែនជាអាជីវកម្មម្ហូបអាហារឡើយ។',
    reasonEn:
      'Hardware stores, construction material depots, and furniture shops are not food businesses.',
    keywords: [
      'គ្រឿងសំណង់',
      'ដេប៉ូខ្សាច់ថ្ម',
      'ស៊ីម៉ងត៍',
      'ដែកទីប',
      'ក្បឿង',
      'ឥដ្ឋការ៉ូ',
      'ថ្នាំពណ៌ផ្ទះ',
      'ទុយោទឹក',
      'គ្រឿងសង្ហារិម',
      'តុទូគ្រែ',
      'ពូកសាឡុង',
      'hardware store',
      'construction materials',
      'building materials',
      'cement',
      'plumbing',
      'furniture store',
      'mattress',
      '五金店',
      '建材',
      '家具店',
    ],
  },
  {
    category: 'auto_motorcycle',
    labelKh: 'ហាងលក់ឡាន-ម៉ូតូ / យានដ្ឋានជួសជុល / គ្រឿងបន្លាស់',
    labelEn: 'Auto / Motorcycle Dealer & Repair Garage',
    reasonKh:
      'កន្លែងលក់ ឬជួសជុលរថយន្ត ម៉ូតូ លាងឡាន និងហាងលក់គ្រឿងបន្លាស់យានយន្ត មិនមែនជាអាជីវកម្មម្ហូបអាហារឡើយ។',
    reasonEn:
      'Car dealerships, motorcycle shops, repair garages, and spare parts stores are not food businesses.',
    keywords: [
      'លក់ម៉ូតូ',
      'លក់ឡាន',
      'ទិញលក់រថយន្ត',
      'ជួសជុលម៉ូតូ',
      'ជួសជុលរថយន្ត',
      'យានដ្ឋាន',
      'ការ៉ាស់ឡាន',
      'លាងឡាន',
      'លាងម៉ូតូ',
      'ប្តូរប្រេងម៉ាស៊ីន',
      'គ្រឿងបន្លាស់ម៉ូតូ',
      'គ្រឿងបន្លាស់រថយន្ត',
      'សំបកកង់ឡាន',
      'car dealer',
      'motorcycle shop',
      'moto shop',
      'auto repair',
      'car garage',
      'spare parts',
      'motor oil',
      'tire shop',
      'car wash',
      '汽车维修',
      '摩托车店',
      '汽修',
      '洗车店',
    ],
  },
  {
    category: 'real_estate_finance',
    labelKh: 'អចលនទ្រព្យ / ហិរញ្ញវត្ថុ / សេវាកម្មផ្សេងៗក្រៅពីអាហារ',
    labelEn: 'Real Estate / Finance / Non-Food Service',
    reasonKh:
      'អាជីវកម្មអចលនទ្រព្យ ដីឡូតិ៍ ហាងបញ្ចាំ សេវាហិរញ្ញវត្ថុ បោកអ៊ុត បណ្ណាគារ ឬហាងលក់ចំណីសត្វ មិនមែនជាអាជីវកម្មម្ហូបអាហារសម្រាប់មនុស្សឡើយ។',
    reasonEn:
      'Real estate agencies, pawnshops, financial services, laundromats, bookstores, and pet shops are not eligible.',
    keywords: [
      'អចលនទ្រព្យ',
      'លក់ដីឡូតិ៍',
      'ដីឡូតិ៍',
      'ផ្ទះល្វែងលក់',
      'ហាងបញ្ចាំ',
      'សេវាកម្មកម្ចី',
      'បោកអ៊ុតសម្លៀកបំពាក់',
      'ហាងបោកអ៊ុត',
      'បណ្ណាគារ',
      'រោងពុម្ព',
      'ចំណីសត្វ',
      'ជីកសិកម្ម',
      'ថ្នាំកសិកម្ម',
      'កាស៊ីណូ',
      'ភ្នាល់បាល់',
      'real estate',
      'land for sale',
      'property agent',
      'pawnshop',
      'loan service',
      'laundry service',
      'laundromat',
      'bookstore',
      'print shop',
      'pet shop',
      'pet food',
      'fertilizer',
      'casino',
      'betting',
      '房地产',
      '典当行',
      '洗衣店',
      '书店',
      '宠物店',
    ],
  },
];

// Explicit Food Establishment & Prepared Meal / Culinary Signals (Khmer, English, Chinese)
const PREPARED_FOOD_STORE_TYPE_SIGNALS: { keyword: string; subCategory: DetectedBusinessSubCategory; weight: number }[] = [
  // Restaurants & Eateries
  { keyword: 'ភោជនីយដ្ឋាន', subCategory: 'restaurant', weight: 30 },
  { keyword: 'អាហារដ្ឋាន', subCategory: 'restaurant', weight: 30 },
  { keyword: 'ហាងបាយ', subCategory: 'noodle_rice_soup_eatery', weight: 30 },
  { keyword: 'ហាងម្ហូប', subCategory: 'restaurant', weight: 30 },
  { keyword: 'ម្ហូបកម្ម៉ង់', subCategory: 'restaurant', weight: 28 },
  { keyword: 'ប៊ូហ្វេ', subCategory: 'restaurant', weight: 28 },
  { keyword: 'ស៊ុប', subCategory: 'noodle_rice_soup_eatery', weight: 24 },
  { keyword: 'ឆ្នាំងភ្លើង', subCategory: 'noodle_rice_soup_eatery', weight: 25 },
  { keyword: 'សាច់អាំង', subCategory: 'restaurant', weight: 25 },
  { keyword: 'គ្រឿងសមុទ្រ', subCategory: 'restaurant', weight: 25 },
  { keyword: 'មរតកម្ហូបខ្មែរ', subCategory: 'restaurant', weight: 28 },
  { keyword: 'ផ្ទះបាយ', subCategory: 'restaurant', weight: 24 },
  { keyword: 'ជំនោរ', subCategory: 'restaurant', weight: 18 },
  { keyword: 'កញ្ចុះ', subCategory: 'restaurant', weight: 22 },
  // Food Stalls & Street Food
  { keyword: 'តូបលក់ម្ហូប', subCategory: 'food_stall', weight: 30 },
  { keyword: 'តូបអាហារ', subCategory: 'food_stall', weight: 30 },
  { keyword: 'អាហារតាមផ្លូវ', subCategory: 'food_stall', weight: 28 },
  { keyword: 'ហាងគុយទាវ', subCategory: 'noodle_rice_soup_eatery', weight: 30 },
  { keyword: 'ហាងនំបញ្ចុក', subCategory: 'noodle_rice_soup_eatery', weight: 30 },
  { keyword: 'ហាងបបរ', subCategory: 'noodle_rice_soup_eatery', weight: 28 },
  { keyword: 'ហាងមី', subCategory: 'noodle_rice_soup_eatery', weight: 26 },
  // Cafés, Bakeries & Desserts
  { keyword: 'ហាងកាហ្វេ', subCategory: 'cafe_bakery_dessert', weight: 30 },
  { keyword: 'កាហ្វេ', subCategory: 'cafe_bakery_dessert', weight: 24 },
  { keyword: 'តែគុជ', subCategory: 'cafe_bakery_dessert', weight: 26 },
  { keyword: 'ហាងនំប៉័ង', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'ហាងនំខេក', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'ហាងបង្អែម', subCategory: 'cafe_bakery_dessert', weight: 30 },
  { keyword: 'បង្អែមខ្មែរ', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'ទឹកក្រឡុក', subCategory: 'cafe_bakery_dessert', weight: 25 },
  // English & Chinese Store Types
  { keyword: 'restaurant', subCategory: 'restaurant', weight: 30 },
  { keyword: 'eatery', subCategory: 'restaurant', weight: 28 },
  { keyword: 'bistro', subCategory: 'restaurant', weight: 28 },
  { keyword: 'diner', subCategory: 'restaurant', weight: 26 },
  { keyword: 'kitchen', subCategory: 'restaurant', weight: 24 },
  { keyword: 'seafood', subCategory: 'restaurant', weight: 25 },
  { keyword: 'bbq', subCategory: 'restaurant', weight: 25 },
  { keyword: 'barbecue', subCategory: 'restaurant', weight: 25 },
  { keyword: 'hotpot', subCategory: 'noodle_rice_soup_eatery', weight: 26 },
  { keyword: 'hot pot', subCategory: 'noodle_rice_soup_eatery', weight: 26 },
  { keyword: 'buffet', subCategory: 'restaurant', weight: 26 },
  { keyword: 'food stall', subCategory: 'food_stall', weight: 30 },
  { keyword: 'street food', subCategory: 'food_stall', weight: 28 },
  { keyword: 'food court', subCategory: 'food_stall', weight: 28 },
  { keyword: 'noodle shop', subCategory: 'noodle_rice_soup_eatery', weight: 28 },
  { keyword: 'noodle house', subCategory: 'noodle_rice_soup_eatery', weight: 28 },
  { keyword: 'cafe', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'café', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'coffee shop', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'coffee house', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'bakery', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'dessert shop', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: 'bubble tea', subCategory: 'cafe_bakery_dessert', weight: 26 },
  { keyword: '餐厅', subCategory: 'restaurant', weight: 30 },
  { keyword: '餐馆', subCategory: 'restaurant', weight: 30 },
  { keyword: '饭店', subCategory: 'restaurant', weight: 30 },
  { keyword: '美食', subCategory: 'restaurant', weight: 24 },
  { keyword: '小吃店', subCategory: 'food_stall', weight: 28 },
  { keyword: '面馆', subCategory: 'noodle_rice_soup_eatery', weight: 28 },
  { keyword: '火锅', subCategory: 'noodle_rice_soup_eatery', weight: 26 },
  { keyword: '烧烤', subCategory: 'restaurant', weight: 26 },
  { keyword: '咖啡店', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: '奶茶店', subCategory: 'cafe_bakery_dessert', weight: 26 },
  { keyword: '甜品店', subCategory: 'cafe_bakery_dessert', weight: 28 },
  { keyword: '面包店', subCategory: 'cafe_bakery_dessert', weight: 28 },
];

// Specific Prepared Dish, Meal, & Culinary Keywords
const PREPARED_DISH_AND_MEAL_SIGNALS: string[] = [
  'អាម៉ុក',
  'សម្ល',
  'សម្លកកូរ',
  'សម្លម្ជូរ',
  'សម្លការី',
  'ប្រហើរ',
  'ប្រហុកខ្ទិះ',
  'ទឹកគ្រឿង',
  'ឡុកឡាក់',
  'ឆាគ្រឿង',
  'ឆាក្តៅ',
  'ឆាខ្ញី',
  'ស្ងោរជ្រក់',
  'ស្ងោរង៉ាំង៉ូវ',
  'គុយទាវ',
  'នំបញ្ចុក',
  'បាយសាច់ជ្រូក',
  'បាយមាន់',
  'បាយឆា',
  'មីឆា',
  'លតឆា',
  'បាញ់ឆែវ',
  'បាញ់ហយ',
  'នំក្រក់',
  'នំប៉័ងប៉ាតេ',
  'បបរមាន់',
  'បបរត្រី',
  'បបរគ្រឿង',
  'ភ្លាសាច់គោ',
  'ញាំមីសួរ',
  'បុកល្ហុង',
  'មាន់ដុត',
  'ត្រីដុត',
  'ត្រីបំពង',
  'ក្តាមឆាម្រេច',
  'បង្គាអាំង',
  'មឹកអាំង',
  'សាច់គោអាំង',
  'ប្រហិតចៀន',
  'សង់ខ្យាល្ពៅ',
  'ចេកខ្ទិះ',
  'បង្អែម',
  'កាហ្វេទឹកដោះគោ',
  'តែក្រូចឆ្មា',
  'ម្ហូបខ្មែរ',
  'ម្ហូបពិសេស',
  'មុខម្ហូប',
  'រសជាតិដើម',
  'ចុងភៅ',
  'ចម្អិន',
  'អាហារពេលព្រឹក',
  'អាហារថ្ងៃត្រង់',
  'អាហារពេលល្ងាច',
  'amok',
  'lok lak',
  'samlor',
  'korko',
  'kuy teav',
  'num banh chok',
  'fried rice',
  'fried noodles',
  'grilled fish',
  'roasted chicken',
  'pepper crab',
  'papaya salad',
  'beef skewers',
  'khmer cuisine',
  'khmer food',
  'signature dish',
  'cooked meal',
  'prepared food',
  'breakfast',
  'lunch',
  'dinner',
  'espresso',
  'latte',
  'cappuccino',
  'iced coffee',
  'croissant',
  'pastry',
  'cake',
  '阿莫克',
  '高棉菜',
  '柬埔寨美食',
  '金边粉',
  '炒饭',
  '炒面',
  '烤肉',
  '海鲜',
];

function getSubCategoryLabels(cat: DetectedBusinessSubCategory): { kh: string; en: string } {
  switch (cat) {
    case 'restaurant':
      return { kh: 'ភោជនីយដ្ឋាន / អាហារដ្ឋានម្ហូបចម្អិនស្រាប់', en: 'Restaurant / Prepared Food Eatery' };
    case 'food_stall':
      return { kh: 'តូបលក់ម្ហូបអាហារ / អាហារតាមផ្លូវ', en: 'Food Stall / Street Food Vendor' };
    case 'cafe_bakery_dessert':
      return { kh: 'ហាងកាហ្វេ / ភេសជ្ជៈ / នំប៉័ង & បង្អែម', en: 'Café / Bakery / Dessert Shop' };
    case 'noodle_rice_soup_eatery':
      return { kh: 'ហាងបាយ / គុយទាវ / ស៊ុប & មុខម្ហូបកម្ម៉ង់', en: 'Rice, Noodle & Soup Eatery' };
    case 'uncertain_ambiguous':
      return { kh: 'មិនទាន់ច្បាស់លាស់ (ត្រូវការ Admin ត្រួតពិនិត្យ)', en: 'Uncertain / Ambiguous (Requires Admin Review)' };
    default: {
      const found = NON_FOOD_CATEGORY_RULES.find((r) => r.category === cat);
      return found
        ? { kh: found.labelKh, en: found.labelEn }
        : { kh: 'អាជីវកម្មមិនពាក់ព័ន្ធនឹងម្ហូបអាហារ', en: 'Non-Food Business' };
    }
  }
}

function generateVerificationToken(candidateName: string, decision: AiStoreCategoryDecision): string {
  const raw = `${candidateName}|${decision}|${Date.now()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `KFT-AIVER-${decision.toUpperCase()}-${(h >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Inspect photo URLs for obvious non-food filenames or suspicious document/receipt patterns
 */
function analyzePhotosHeuristically(photos: string[]): {
  hasValidFoodOrStorePhoto: boolean;
  flaggedPhotoReasonKh?: string;
  flaggedPhotoReasonEn?: string;
  summaryKh: string;
  summaryEn: string;
} {
  const cleanPhotos = (photos || []).map((p) => (p || '').trim()).filter(Boolean);
  if (cleanPhotos.length === 0) {
    return {
      hasValidFoodOrStorePhoto: false,
      flaggedPhotoReasonKh: 'មិនទាន់មានរូបភាពហាង ឬរូបភាពមុខម្ហូប',
      flaggedPhotoReasonEn: 'No store or food photos provided',
      summaryKh: 'មិនមានរូបភាពភ្ជាប់មកជាមួយ',
      summaryEn: 'No photos attached',
    };
  }

  const nonFoodImageKeywords = [
    'iphone',
    'samsung',
    'laptop',
    'computer',
    'shirt',
    'dress',
    'shoes',
    'sneaker',
    'jeans',
    'car_sale',
    'motorbike_sale',
    'cosmetic',
    'hardware',
    'cement',
    'pharmacy',
    'medicine',
    'receipt',
    'invoice',
  ];

  for (const url of cleanPhotos) {
    const lower = url.toLowerCase();
    for (const badKw of nonFoodImageKeywords) {
      if (lower.includes(badKw)) {
        return {
          hasValidFoodOrStorePhoto: false,
          flaggedPhotoReasonKh: `រកឃើញរូបភាពមិនមែនជាម្ហូបអាហារ (${badKw})`,
          flaggedPhotoReasonEn: `Detected non-food product image (${badKw})`,
          summaryKh: `រូបភាពមានសញ្ញាទំនិញក្រៅពីម្ហូបអាហារ (${badKw})`,
          summaryEn: `Photo URL indicates non-food item (${badKw})`,
        };
      }
    }
  }

  const isBuiltInFoodAsset = cleanPhotos.some(
    (p) => p.startsWith('/foods/') || p.startsWith('/Shop/') || p.startsWith('data:image/') || p.startsWith('http')
  );

  return {
    hasValidFoodOrStorePhoto: isBuiltInFoodAsset,
    summaryKh: `បានត្រួតពិនិត្យរូបភាពចំនួន ${cleanPhotos.length} សន្លឹក ត្រឹមត្រូវតាមទម្រង់រូបភាពហាងអាហារ`,
    summaryEn: `Verified ${cleanPhotos.length} store/food photo(s)`,
  };
}

/**
 * Optional Multimodal Gemini 1.5 Flash Verification (when Gemini API Key is configured)
 */
async function callGeminiStoreCategoryVerifier(
  input: StoreVerificationCandidateInput
): Promise<{
  decision: AiStoreCategoryDecision;
  detectedCategory?: DetectedBusinessSubCategory;
  confidenceScore: number;
  isBypassAttempt: boolean;
  reasonKh: string;
  reasonEn: string;
} | null> {
  const cfg = getCloudApiConfig();
  const apiKey = (cfg.geminiApiKey || '').trim();
  if (!apiKey) return null;

  try {
    const menuSummary = (input.menuItems || [])
      .map((m) => `${m.nameKh || ''} (${m.nameEn || ''}) $${m.priceUsd || ''}`)
      .join(', ');

    const promptText = `You are a strict food-business compliance verifier for the "Khmer Food & Tourism" app in Cambodia.
Analyze this VIP store submission and determine whether it is a genuine PREPARED FOOD business (restaurant, eatery, food stall, café, bakery, dessert shop, noodle/rice/soup shop).

Rules:
1. APPROVE ("approved") ONLY restaurants, food stalls, cafés, bakeries, dessert shops, and businesses selling prepared food, meals, or freshly made drinks.
2. REJECT ("rejected") grocery stores selling raw/packaged goods, minimarts, supermarkets, clothing/fashion stores, shoe shops, electronics/phone shops, cosmetics/salons, pharmacies, hardware/construction stores, auto/moto shops, real estate, or any non-food business.
3. ANTI-BYPASS: If the user enters a misleading food word in the store name (e.g. "ភោជនីយដ្ឋាន") while describing or selling phones, clothes, groceries, or non-food items in the description, signature dish, or menu, you MUST REJECT ("rejected") and set "isBypassAttempt": true.
4. UNCERTAIN ("pending_review"): If the store name and description are vague/ambiguous (e.g., just a person's name without clear prepared food details) and you are not sure, return "pending_review" so Admin can review manually.

Store Submission:
- Name (Khmer): ${input.nameKh || ''}
- Name (English): ${input.nameEn || ''}
- Signature Dishes: ${(input.signatureDishesKh || []).join(', ')}
- Description (Khmer): ${input.descriptionKh || ''}
- Description (English): ${input.descriptionEn || ''}
- Menu Items: ${menuSummary || 'None'}
- Address: ${input.addressKh || ''} (${input.provinceKh || ''})

Respond ONLY with valid JSON matching:
{
  "decision": "approved" | "pending_review" | "rejected",
  "confidenceScore": number (0-100),
  "isBypassAttempt": boolean,
  "reasonKh": "Clear explanation in natural Khmer",
  "reasonEn": "Clear explanation in English"
}`;

    const parts: any[] = [{ text: promptText }];
    const primaryPhoto = input.photoUrl || input.profileImage || (input.foodImages && input.foodImages[0]) || '';
    if (primaryPhoto.startsWith('data:image/')) {
      const match = primaryPhoto.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inline_data: {
            mime_type: match[1],
            data: match[2],
          },
        });
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (
      parsed &&
      (parsed.decision === 'approved' || parsed.decision === 'pending_review' || parsed.decision === 'rejected')
    ) {
      return {
        decision: parsed.decision,
        confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 85,
        isBypassAttempt: Boolean(parsed.isBypassAttempt),
        reasonKh: parsed.reasonKh || '',
        reasonEn: parsed.reasonEn || '',
      };
    }
  } catch {
    // Fallback to deterministic semantic & anti-bypass guard
  }
  return null;
}

/**
 * Core Synchronous Deterministic + Anti-Bypass Analyzer
 * Inspects store name, signature dishes, description, menu items, and photos.
 */
export function analyzeFoodBusinessDeterministically(
  input: StoreVerificationCandidateInput
): AiStoreCategoryVerificationReport {
  const nowIso = new Date().toISOString();
  const nameKh = (input.nameKh || '').trim();
  const nameEn = (input.nameEn || '').trim();
  const sigText = (input.signatureDishesKh || [])
    .filter((s) => s && s !== 'ម្ហូបពិសេសប្រចាំហាង')
    .join(' ');
  const descKh = (input.descriptionKh || '')
    .replace('ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។', '')
    .trim();
  const descEn = (input.descriptionEn || '')
    .replace(/authentic (khmer )?restaurant\.?/gi, '')
    .trim();
  const menuText = (input.menuItems || [])
    .map((m) => `${m.nameKh || ''} ${m.nameEn || ''} ${m.descriptionKh || ''} ${m.categoryKh || ''}`)
    .join(' ');

  const allUserText = `${nameKh} ${nameEn} ${sigText} ${descKh} ${descEn} ${menuText}`.toLowerCase();
  const nameAndSigText = `${nameKh} ${nameEn} ${sigText}`.toLowerCase();

  // 1. Scan for Non-Food Business & Merchandise Keywords across ALL fields
  const matchedNonFoodRules: { rule: NonFoodCategoryRule; matchedKeywords: string[] }[] = [];
  const allFlaggedNonFoodSignals: string[] = [];

  for (const rule of NON_FOOD_CATEGORY_RULES) {
    const matchedKws: string[] = [];
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      // For short ASCII keywords (<= 4 chars), match word boundary to avoid false substring hits
      if (/^[a-z0-9\s-]+$/i.test(kwLower) && kwLower.length <= 5) {
        const regex = new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(allUserText)) {
          matchedKws.push(kw);
          allFlaggedNonFoodSignals.push(kw);
        }
      } else if (allUserText.includes(kwLower)) {
        matchedKws.push(kw);
        allFlaggedNonFoodSignals.push(kw);
      }
    }
    if (matchedKws.length > 0) {
      matchedNonFoodRules.push({ rule, matchedKeywords: matchedKws });
    }
  }

  // 2. Scan for Prepared Food Establishment & Prepared Dish Signals
  const matchedFoodSignals: string[] = [];
  let foodScore = 0;
  let primaryFoodSubCat: DetectedBusinessSubCategory = 'restaurant';
  let highestSubCatWeight = 0;

  for (const sig of PREPARED_FOOD_STORE_TYPE_SIGNALS) {
    const kwLower = sig.keyword.toLowerCase();
    const isHit =
      /^[a-z0-9\s-]+$/i.test(kwLower) && kwLower.length <= 5
        ? new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(allUserText)
        : allUserText.includes(kwLower);
    if (isHit) {
      matchedFoodSignals.push(sig.keyword);
      foodScore += sig.weight;
      if (sig.weight > highestSubCatWeight) {
        highestSubCatWeight = sig.weight;
        primaryFoodSubCat = sig.subCategory;
      }
    }
  }

  for (const dishKw of PREPARED_DISH_AND_MEAL_SIGNALS) {
    const kwLower = dishKw.toLowerCase();
    const isHit =
      /^[a-z0-9\s-]+$/i.test(kwLower) && kwLower.length <= 5
        ? new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(allUserText)
        : allUserText.includes(kwLower);
    if (isHit && !matchedFoodSignals.includes(dishKw)) {
      matchedFoodSignals.push(dishKw);
      foodScore += 18;
    }
  }

  // Also check if menuItems contain genuine priced food dishes
  const validMenuFoodCount = (input.menuItems || []).filter((m) => {
    const mText = `${m.nameKh || ''} ${m.nameEn || ''}`.toLowerCase();
    return PREPARED_DISH_AND_MEAL_SIGNALS.some((d) => mText.includes(d.toLowerCase()));
  }).length;
  if (validMenuFoodCount > 0) {
    foodScore += validMenuFoodCount * 15;
  }

  // 3. Analyze Photos
  const allPhotos = Array.from(
    new Set([
      ...(input.photoUrl ? [input.photoUrl] : []),
      ...(input.profileImage ? [input.profileImage] : []),
      ...(input.foodImages || []),
      ...(input.galleryPhotos || []),
    ])
  );
  const photoCheck = analyzePhotosHeuristically(allPhotos);
  if (photoCheck.flaggedPhotoReasonKh) {
    allFlaggedNonFoodSignals.push(photoCheck.flaggedPhotoReasonKh);
  }

  // 4. Decision Logic:
  // CASE A: Non-Food Keywords OR Photo Violations Detected -> REJECT (including Anti-Bypass detection!)
  if (matchedNonFoodRules.length > 0 || photoCheck.flaggedPhotoReasonKh) {
    const topRule = matchedNonFoodRules[0]?.rule;
    const isBypassAttempt = matchedFoodSignals.length > 0 && matchedNonFoodRules.length > 0;
    const detectedCat: DetectedBusinessSubCategory = topRule ? topRule.category : 'non_food_other';
    const labels = getSubCategoryLabels(detectedCat);

    const reasonKh = isBypassAttempt
      ? `🚫 ប្រព័ន្ធ AI បានរកឃើញការព្យាយាមដាក់ឈ្មោះ ឬពាក្យម្ហូបអាហារលាយឡំជាមួយអាជីវកម្មមិនមែនម្ហូបអាហារ (${allFlaggedNonFoodSignals.slice(0, 4).join(', ')})។ ${topRule?.reasonKh || 'អនុញ្ញាតឱ្យបង្កើតហាងសម្រាប់តែភោជនីយដ្ឋាន និងហាងលក់ម្ហូបអាហារចម្អិនស្រាប់ប៉ុណ្ណោះ។'}`
      : `🚫 បដិសេធការបង្កើតហាង៖ ប្រព័ន្ធ AI បានពិនិត្យឃើញថាអាជីវកម្មនេះស្ថិតក្នុងប្រភេទ «${labels.kh}» (${allFlaggedNonFoodSignals.slice(0, 4).join(', ')})។ ${topRule?.reasonKh || 'អនុញ្ញាតឱ្យបង្កើតហាងសម្រាប់តែភោជនីយដ្ឋាន អាហារដ្ឋាន ហាងកាហ្វេ និងហាងលក់ម្ហូបអាហារចម្អិនស្រាប់ប៉ុណ្ណោះ។'}`;

    const reasonEn = isBypassAttempt
      ? `🚫 AI Anti-Bypass Protection: Detected misleading food keywords combined with non-food merchandise (${allFlaggedNonFoodSignals.slice(0, 4).join(', ')}). ${topRule?.reasonEn || 'Only genuine prepared-food businesses are allowed.'}`
      : `🚫 Store Rejected: AI classified this submission as "${labels.en}" (${allFlaggedNonFoodSignals.slice(0, 4).join(', ')}). ${topRule?.reasonEn || 'Only restaurants, eateries, cafés, and prepared food businesses are allowed.'}`;

    return {
      decision: 'rejected',
      isFoodBusiness: false,
      detectedCategory: detectedCat,
      detectedCategoryLabelKh: labels.kh,
      detectedCategoryLabelEn: labels.en,
      confidenceScore: 96,
      isBypassAttempt,
      reasonKh,
      reasonEn,
      matchedFoodSignals,
      flaggedNonFoodSignals: allFlaggedNonFoodSignals,
      photoAnalysisSummaryKh: photoCheck.summaryKh,
      photoAnalysisSummaryEn: photoCheck.summaryEn,
      verificationToken: generateVerificationToken(nameKh, 'rejected'),
      verifiedAt: nowIso,
      verifiedByModel: 'deterministic_semantic_guard_v1',
    };
  }

  // CASE B: Check for Gibberish / Too Short / Meaningless Input -> REJECT or PENDING_REVIEW
  const cleanNameOnly = `${nameKh}${nameEn}`.replace(/[\s0-9.,!@#$%^&*()_+\-=]/g, '');
  if (cleanNameOnly.length < 2 || /^(test|testing|asdf|qwerty|abc|xxx|123)+$/i.test(cleanNameOnly)) {
    const labels = getSubCategoryLabels('uncertain_ambiguous');
    return {
      decision: 'rejected',
      isFoodBusiness: false,
      detectedCategory: 'non_food_other',
      detectedCategoryLabelKh: 'ឈ្មោះហាងមិនត្រឹមត្រូវ ឬមិនមែនជាហាងអាហារ',
      detectedCategoryLabelEn: 'Invalid or Unrecognizable Store Name',
      confidenceScore: 92,
      isBypassAttempt: true,
      reasonKh:
        '🚫 បដិសេធការបង្កើតហាង៖ ឈ្មោះហាង ឬព័ត៌មានមិនត្រឹមត្រូវ។ សូមបញ្ចូលឈ្មោះភោជនីយដ្ឋាន ហាងអាហារ និងមុខម្ហូបពិសេសប្រចាំហាងឱ្យបានច្បាស់លាស់។',
      reasonEn:
        '🚫 Store Rejected: Invalid or test store name. Please enter a real restaurant or food shop name and signature dishes.',
      matchedFoodSignals: [],
      flaggedNonFoodSignals: [nameKh || nameEn || 'invalid_name'],
      photoAnalysisSummaryKh: photoCheck.summaryKh,
      photoAnalysisSummaryEn: photoCheck.summaryEn,
      verificationToken: generateVerificationToken(nameKh, 'rejected'),
      verifiedAt: nowIso,
      verifiedByModel: 'deterministic_semantic_guard_v1',
    };
  }

  // CASE C: Strong Prepared-Food Signals Present (Score >= 24 and recognizable food signal in name, signature dish, description, or menu) -> APPROVED
  const hasFoodSignalInNameOrSig = PREPARED_FOOD_STORE_TYPE_SIGNALS.some((s) =>
    nameAndSigText.includes(s.keyword.toLowerCase())
  ) || PREPARED_DISH_AND_MEAL_SIGNALS.some((d) => nameAndSigText.includes(d.toLowerCase()));

  if (foodScore >= 24 && (hasFoodSignalInNameOrSig || matchedFoodSignals.length >= 2) && photoCheck.hasValidFoodOrStorePhoto) {
    const confidence = Math.min(99, 76 + Math.min(23, Math.floor(foodScore / 4)));
    const labels = getSubCategoryLabels(primaryFoodSubCat);
    return {
      decision: 'approved',
      isFoodBusiness: true,
      detectedCategory: primaryFoodSubCat,
      detectedCategoryLabelKh: labels.kh,
      detectedCategoryLabelEn: labels.en,
      confidenceScore: confidence,
      isBypassAttempt: false,
      reasonKh: `✅ អនុម័តដោយ AI (${confidence}%)៖ ហាង «${nameKh}» ត្រូវបានផ្ទៀងផ្ទាត់ថាជាអាជីវកម្មម្ហូបអាហារត្រឹមត្រូវ (${labels.kh} • សញ្ញាសម្គាល់៖ ${matchedFoodSignals.slice(0, 4).join(', ')})។`,
      reasonEn: `✅ Approved by AI (${confidence}%): "${nameEn || nameKh}" verified as an eligible prepared-food business (${labels.en}).`,
      matchedFoodSignals,
      flaggedNonFoodSignals: [],
      photoAnalysisSummaryKh: photoCheck.summaryKh,
      photoAnalysisSummaryEn: photoCheck.summaryEn,
      verificationToken: generateVerificationToken(nameKh, 'approved'),
      verifiedAt: nowIso,
      verifiedByModel: 'deterministic_semantic_guard_v1',
    };
  }

  // CASE D: Uncertain / Ambiguous Submission (e.g. generic shop name without clear prepared-food dishes or low signal score)
  // Send to Admin for manual review instead of auto-approving!
  const labels = getSubCategoryLabels('uncertain_ambiguous');
  const uncertainConfidence = foodScore > 0 ? 55 : 35;
  return {
    decision: 'pending_review',
    isFoodBusiness: false,
    detectedCategory: 'uncertain_ambiguous',
    detectedCategoryLabelKh: labels.kh,
    detectedCategoryLabelEn: labels.en,
    confidenceScore: uncertainConfidence,
    isBypassAttempt: false,
    reasonKh: `⏳ រង់ចាំការពិនិត្យពី Admin៖ ប្រព័ន្ធ AI មិនទាន់អាចកំណត់បានច្បាស់លាស់ ១០០% ថាហាង «${nameKh}» ជាហាងលក់ម្ហូបអាហារចម្អិនស្រាប់នៅឡើយទេ (សូមបញ្ជាក់មុខម្ហូបពិសេស និងការពិពណ៌នាម្ហូបឱ្យច្បាស់)។ សំណើរបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់ Administrator ដើម្បីត្រួតពិនិត្យ និងអនុម័តដោយដៃ។`,
    reasonEn: `⏳ Sent to Admin for Manual Review: AI could not verify with high confidence whether "${nameEn || nameKh}" sells prepared food or meals. Your submission has been queued for Admin review.`,
    matchedFoodSignals,
    flaggedNonFoodSignals: [],
    photoAnalysisSummaryKh: photoCheck.summaryKh,
    photoAnalysisSummaryEn: photoCheck.summaryEn,
    verificationToken: generateVerificationToken(nameKh, 'pending_review'),
    verifiedAt: nowIso,
    verifiedByModel: 'deterministic_semantic_guard_v1',
  };
}

/**
 * Full Hybrid AI + Server-Side Validation Gate
 * Runs deterministic anti-bypass checks + optional Gemini 1.5 Flash multimodal verification,
 * and logs the verification audit trail to Supabase Cloud before any store is saved or published.
 */
export async function verifyFoodBusinessOnServer(
  input: StoreVerificationCandidateInput
): Promise<AiStoreCategoryVerificationReport> {
  // 1. Run deterministic semantic + anti-bypass analysis first
  const deterministicReport = analyzeFoodBusinessDeterministically(input);

  // Never allow Gemini to override a deterministic non-food / anti-bypass rejection
  if (deterministicReport.decision === 'rejected') {
    await logStoreVerificationAuditToCloud(input, deterministicReport);
    return deterministicReport;
  }

  // 2. If Gemini API is configured, run multimodal LLM + Vision cross-check
  const geminiResult = await callGeminiStoreCategoryVerifier(input);
  if (geminiResult) {
    // If Gemini detects a non-food business or bypass attempt, reject immediately
    if (geminiResult.decision === 'rejected') {
      const rejectedReport: AiStoreCategoryVerificationReport = {
        ...deterministicReport,
        decision: 'rejected',
        isFoodBusiness: false,
        detectedCategory: 'non_food_other',
        detectedCategoryLabelKh: 'អាជីវកម្មមិនពាក់ព័ន្ធនឹងម្ហូបអាហារ (AI Vision & Text)',
        detectedCategoryLabelEn: 'Non-Food Business (AI Vision & Text)',
        confidenceScore: geminiResult.confidenceScore || 94,
        isBypassAttempt: geminiResult.isBypassAttempt,
        reasonKh:
          geminiResult.reasonKh ||
          '🚫 បដិសេធដោយប្រព័ន្ធ AI៖ អាជីវកម្មនេះមិនមែនជាភោជនីយដ្ឋាន ឬហាងលក់ម្ហូបអាហារចម្អិនស្រាប់ឡើយ។',
        reasonEn:
          geminiResult.reasonEn ||
          '🚫 Rejected by AI: This business does not qualify as a prepared-food eatery or restaurant.',
        verificationToken: generateVerificationToken(input.nameKh, 'rejected'),
        verifiedByModel: 'hybrid_gemini_and_rules_v1',
      };
      await logStoreVerificationAuditToCloud(input, rejectedReport);
      return rejectedReport;
    }

    // If either deterministic OR Gemini is uncertain, send to Admin manual review
    if (geminiResult.decision === 'pending_review' || deterministicReport.decision === 'pending_review') {
      const pendingReport: AiStoreCategoryVerificationReport = {
        ...deterministicReport,
        decision: 'pending_review',
        isFoodBusiness: false,
        detectedCategory: 'uncertain_ambiguous',
        confidenceScore: Math.min(deterministicReport.confidenceScore, geminiResult.confidenceScore || 60),
        reasonKh:
          geminiResult.reasonKh ||
          deterministicReport.reasonKh,
        reasonEn:
          geminiResult.reasonEn ||
          deterministicReport.reasonEn,
        verificationToken: generateVerificationToken(input.nameKh, 'pending_review'),
        verifiedByModel: 'hybrid_gemini_and_rules_v1',
      };
      await logStoreVerificationAuditToCloud(input, pendingReport);
      return pendingReport;
    }

    // Both deterministic and Gemini approved
    const approvedReport: AiStoreCategoryVerificationReport = {
      ...deterministicReport,
      decision: 'approved',
      isFoodBusiness: true,
      confidenceScore: Math.max(deterministicReport.confidenceScore, geminiResult.confidenceScore || 90),
      verifiedByModel: 'hybrid_gemini_and_rules_v1',
    };
    await logStoreVerificationAuditToCloud(input, approvedReport);
    return approvedReport;
  }

  // 3. Log final server-validated decision to Supabase Cloud & local audit log
  await logStoreVerificationAuditToCloud(input, deterministicReport);
  return deterministicReport;
}

const STORE_VERIFICATION_AUDIT_KEY = 'kft_store_ai_verification_audit_v1';
const CLOUD_STORE_VERIFICATION_KEY = 'kft_cloud_store_ai_verifications_v1';

async function logStoreVerificationAuditToCloud(
  input: StoreVerificationCandidateInput,
  report: AiStoreCategoryVerificationReport
): Promise<void> {
  const entry = {
    id: report.verificationToken,
    storeNameKh: input.nameKh,
    storeNameEn: input.nameEn || '',
    ownerId: input.ownerId || 'unknown',
    ownerName: input.ownerName || 'VIP User',
    decision: report.decision,
    detectedCategory: report.detectedCategory,
    confidenceScore: report.confidenceScore,
    isBypassAttempt: report.isBypassAttempt,
    reasonKh: report.reasonKh,
    matchedFoodSignals: report.matchedFoodSignals,
    flaggedNonFoodSignals: report.flaggedNonFoodSignals,
    verifiedAt: report.verifiedAt,
  };

  try {
    const raw = localStorage.getItem(STORE_VERIFICATION_AUDIT_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 100);
    localStorage.setItem(STORE_VERIFICATION_AUDIT_KEY, JSON.stringify(next));
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const existing = await pullCloudDocument<any[]>(CLOUD_STORE_VERIFICATION_KEY, 5000);
      const merged = [entry, ...(Array.isArray(existing) ? existing : [])].slice(0, 200);
      await pushCloudDocument(CLOUD_STORE_VERIFICATION_KEY, merged, 8000);
    } catch {}
  }
}
