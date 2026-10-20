/**
 * Khmer Food & Tourism — Clean White & Deep Emerald Design System Theme
 * 
 * Palette:
 * - Deep Emerald Header: #064E3B
 * - Primary Action Emerald: #059669
 * - Emerald Light Accent: #10B981
 * - Soft Emerald Pill/Badge: #ECFDF5
 * - Clean Page Background: #F8FAFC (Soft Pearl White)
 * - Card Surface: #FFFFFF (Crisp Pure White)
 * - Main Text: #0F172A (Crisp Slate Charcoal — 100% sharp Khmer readability)
 * - Muted Text: #64748B (Slate Muted)
 * - Warm Gold (Food Stars/Prices): #F59E0B
 * - Card Border: #E2E8F0
 */

export const THEME_COLORS = {
  deepEmerald: '#064E3B',
  primaryEmerald: '#059669',
  lightEmerald: '#10B981',
  softEmeraldMint: '#ECFDF5',
  pageBackground: '#F8FAFC',
  cardWhite: '#FFFFFF',
  mainText: '#0F172A',
  mutedText: '#64748B',
  textOnDark: '#FFFFFF',
  warmGold: '#F59E0B',
  cardBorder: '#E2E8F0',
} as const;

export type ThemeColors = typeof THEME_COLORS;
