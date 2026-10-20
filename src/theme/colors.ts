/**
 * Khmer Food & Tourism — Professional Green Design System Theme
 * 
 * Palette:
 * - Primary Dark Green: #14532D
 * - Deep Forest Green: #0B3D2E
 * - Secondary Green: #228B4E
 * - Light Green: #A7DCA5
 * - Soft Mint Background: #EAF6EC
 * - White: #FFFFFF
 * - Main Text on Light Background: #183326
 * - Text on Dark Green Background: #FFFFFF
 * - Accent Green for buttons & highlights: #34A853
 */

export const THEME_COLORS = {
  primaryDarkGreen: '#14532D',
  deepForestGreen: '#0B3D2E',
  secondaryGreen: '#228B4E',
  lightGreen: '#A7DCA5',
  softMintBackground: '#EAF6EC',
  white: '#FFFFFF',
  mainText: '#183326',
  textOnDark: '#FFFFFF',
  accentGreen: '#34A853',
} as const;

export type ThemeColors = typeof THEME_COLORS;
