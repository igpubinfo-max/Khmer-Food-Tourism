/**
 * Centralized Application Constants (CHG-19 / DUP-06)
 * Single source of truth for Supabase Cloud endpoint, publishable key, KV table name,
 * media storage bucket, and official ABA Bank merchant configuration.
 */

export const DEFAULT_SUPABASE_URL = 'https://ryvltobwuwuulazqjnza.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';
export const SUPABASE_KV_TABLE = 'kft_app_kv_store';
export const SUPABASE_MEDIA_BUCKET = 'food-media';
export const OFFICIAL_APP_PACKAGE_ID = 'com.khmerfood.tourism';

export { ABA_OFFICIAL_MERCHANT } from '../utils/abaKhqrGenerator';
