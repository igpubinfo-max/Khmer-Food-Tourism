export type Language = 'km' | 'en';

export type UserRole = 'user' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  bio?: string;
  restaurantName?: string;
  passwordHash?: string;
  createdAt: string;
}

export type FoodCategorySlug = 
  | 'soup' 
  | 'grilled' 
  | 'stirfry' 
  | 'salad' 
  | 'dessert' 
  | 'noodles' 
  | 'rice' 
  | 'specialty';

export interface Ingredient {
  nameKh: string;
  nameEn: string;
  amount: string;
}

export interface CookingStep {
  stepNumber: number;
  instructionKh: string;
  instructionEn: string;
  tipKh?: string;
}

export interface FoodItem {
  id: string;
  nameKh: string;
  nameEn: string;
  categorySlug: FoodCategorySlug;
  categoryKh: string;
  categoryEn: string;
  descriptionKh: string;
  descriptionEn: string;
  photoUrl: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  calories?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priceRiel: number;
  priceUsd: number;
  ingredients: Ingredient[];
  steps: CookingStep[];
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
}

export type RestaurantPriceLevel = '$' | '$$' | '$$$' | '$$$$';

export interface Restaurant {
  id: string;
  nameKh: string;
  nameEn: string;
  descriptionKh: string;
  descriptionEn: string;
  photoUrl: string;
  galleryPhotos?: string[];
  addressKh: string;
  addressEn: string;
  provinceKh: string;
  provinceEn: string;
  phone: string;
  openingHoursKh: string;
  openingHoursEn: string;
  priceLevel: RestaurantPriceLevel;
  mapUrl: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  signatureDishesKh: string[];
  ownerId?: string;
  status: 'approved' | 'pending' | 'rejected';
  isVerified: boolean;
  isFeatured?: boolean;
}

export type DestinationCategorySlug = 'temple' | 'nature' | 'mountain' | 'beach' | 'resort';

export interface TouristDestination {
  id: string;
  nameKh: string;
  nameEn: string;
  categorySlug: DestinationCategorySlug;
  categoryKh: string;
  categoryEn: string;
  descriptionKh: string;
  descriptionEn: string;
  photoUrl: string;
  galleryPhotos?: string[];
  provinceKh: string;
  provinceEn: string;
  addressKh: string;
  addressEn: string;
  entranceFeeKh: string;
  entranceFeeEn: string;
  bestTimeToVisitKh: string;
  bestTimeToVisitEn: string;
  mapUrl: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  highlightsKh: string[];
  isFeatured?: boolean;
}

export interface CommentItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  titleKh: string;
  descriptionKh: string;
  photoUrl: string;
  categoryTag: string;
  locationName: string;
  likesCount: number;
  likedByUserIds: string[];
  comments: CommentItem[];
  createdAt: string;
  status: 'approved' | 'pending' | 'flagged';
}

export interface ReportedItem {
  id: string;
  postId: string;
  reason: string;
  reporterName: string;
  createdAt: string;
}

export interface AppSettings {
  apkDownloadUrl: string;
  playStoreUrl: string;
  appStoreUrl: string;
  supportQrImageUrl: string;
  supportBankName: string;
  supportAccountName: string;
  supportMessageKh: string;
  supportMessageEn: string;
  adminPasswordHash: string;
  isAdminInitialized: boolean;
}
