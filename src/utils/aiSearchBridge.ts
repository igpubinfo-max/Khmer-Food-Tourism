import type { Language } from '../types';

export interface ParsedSmartSearchIntent {
  rawQuery: string;
  coreQuery: string;
  detectedProvinceKh: string;
  detectedProvinceEn: string;
  semanticCategory:
    | 'cafe'
    | 'seafood'
    | 'bbq'
    | 'fine_dining'
    | 'vegetarian'
    | 'hotel'
    | 'resort'
    | 'guesthouse'
    | 'waterfall'
    | 'temple'
    | 'beach'
    | 'mountain'
    | null;
  isConversationalPrompt: boolean;
  isNearbyIntent: boolean;
}

const PROVINCE_ALIASES: Array<{ kh: string; en: string; patterns: RegExp }> = [
  { kh: 'ភ្នំពេញ', en: 'Phnom Penh', patterns: /ភ្នំពេញ|phnom\s*penh|pp\b|金边/i },
  { kh: 'សៀមរាប', en: 'Siem Reap', patterns: /សៀមរាប|siem\s*reap|暹粒/i },
  { kh: 'កំពត', en: 'Kampot', patterns: /កំពត|kampot|贡布/i },
  { kh: 'កែប', en: 'Kep', patterns: /កែប|\bkep\b|白马/i },
  { kh: 'បាត់ដំបង', en: 'Battambang', patterns: /បាត់ដំបង|battambang|马德望/i },
  { kh: 'ព្រះសីហនុ', en: 'Sihanoukville', patterns: /ព្រះសីហនុ|កំពង់សោម|sihanouk(?:ville)?|kampong\s*som|西哈努克|西港/i },
  { kh: 'កោះកុង', en: 'Koh Kong', patterns: /កោះកុង|koh\s*kong|戈公/i },
  { kh: 'កំពង់ចាម', en: 'Kampong Cham', patterns: /កំពង់ចាម|kampong\s*cham|磅湛/i },
  { kh: 'មណ្ឌលគិរី', en: 'Mondulkiri', patterns: /មណ្ឌលគិរី|mondulkiri|蒙多基里/i },
  { kh: 'រតនគិរី', en: 'Ratanakiri', patterns: /រតនគិរី|ratanakiri|拉达那基里/i },
  { kh: 'កណ្ដាល', en: 'Kandal', patterns: /កណ្ដាល|កណ្តាល|kandal|干拉/i },
  { kh: 'កំពង់ស្ពឺ', en: 'Kampong Speu', patterns: /កំពង់ស្ពឺ|kampong\s*speu|实居/i },
  { kh: 'តាកែវ', en: 'Takeo', patterns: /តាកែវ|takeo|茶胶/i },
  { kh: 'កំពង់ឆ្នាំង', en: 'Kampong Chhnang', patterns: /កំពង់ឆ្នាំង|kampong\s*chhnang|磅清扬/i },
  { kh: 'ពោធិ៍សាត់', en: 'Pursat', patterns: /ពោធិ៍សាត់|pursat|菩萨/i },
  { kh: 'កំពង់ធំ', en: 'Kampong Thom', patterns: /កំពង់ធំ|kampong\s*thom|磅同/i },
  { kh: 'ព្រះវិហារ', en: 'Preah Vihear', patterns: /ព្រះវិហារ|preah\s*vihear|柏威夏/i },
  { kh: 'ក្រចេះ', en: 'Kratie', patterns: /ក្រចេះ|kratie|桔井/i },
  { kh: 'ស្ទឹងត្រែង', en: 'Stung Treng', patterns: /ស្ទឹងត្រែង|stung\s*treng|上丁/i },
  { kh: 'បន្ទាយមានជ័យ', en: 'Banteay Meanchey', patterns: /បន្ទាយមានជ័យ|ប៉ោយប៉ែត|banteay\s*meanchey|poipet|班迭棉吉/i },
  { kh: 'ប៉ៃលិន', en: 'Pailin', patterns: /ប៉ៃលិន|pailin|拜林/i },
  { kh: 'ឧត្តរមានជ័យ', en: 'Oddar Meanchey', patterns: /ឧត្តរមានជ័យ|ឧត្ដរមានជ័យ|oddar\s*meanchey|奥多棉吉/i },
  { kh: 'ព្រៃវែង', en: 'Prey Veng', patterns: /ព្រៃវែង|prey\s*veng|波罗勉/i },
  { kh: 'ស្វាយរៀង', en: 'Svay Rieng', patterns: /ស្វាយរៀង|បាវិត|svay\s*rieng|bavet|柴桢/i },
  { kh: 'ត្បូងឃ្មុំ', en: 'Tbong Khmum', patterns: /ត្បូងឃ្មុំ|tbong\s*khmum|特本克蒙/i },
];

const CONVERSATIONAL_FILLER_RE =
  /(?:សូមជួយ|ជួយរក|ជួយណែនាំ|ណែនាំ|ខ្ញុំចង់រក|ខ្ញុំចង់ញ៉ាំ|ខ្ញុំចង់ទៅ|ចង់រក|ចង់ញ៉ាំ|ចង់ទៅ|មានកន្លែងណា|កន្លែងណា|ហាងណា|តើមាន|នៅឯណា|ឆ្ងាញ់ៗ|ឆ្ងាញ់|ស្អាតៗ|ស្អាត|ល្បីៗ|ល្បី|ពេញនិយម|តម្លៃសមរម្យ|តម្លៃថោក|ល្អបំផុត|នៅក្នុងខេត្ត|នៅខេត្ត|នៅក្រុង|នៅរាជធានី|នៅម្ដុំ|នៅជិតខ្ញុំ|ជិតខ្ញុំ|នៅជិត|\bplease\b|\brecommend\b|\bfind\s+me\b|\bfind\b|\blooking\s+for\b|\bwhere\s+(?:can\s+i|to|is)\b|\bwhat\s+is\b|\bbest\b|\bfamous\b|\bpopular\b|\baffordable\b|\bcheap\b|\bnice\b|\bbeautiful\b|\bin\b|\bat\b|\bnear\s+me\b|\bnearby\b|请推荐|推荐|我想吃|我想去|找一下|哪里有|最好|著名|热门|便宜|实惠|附近)/gi;

const CONVERSATIONAL_PROMPT_CHECK_RE =
  /(?:\?|？|ជួយ|ណែនាំ|ចង់|តើ|កន្លែងណា|ហាងណា|គម្រោង|ផែនការ|ថវិកា|កាឡូរី|សុខភាព|ជិតខ្ញុំ|ផ្លូវទៅ|\brecommend\b|\bwhere\s+to\b|\bwhat\s+to\b|\bitinerary\b|\bbudget\b|\bcalorie|\bhealthy\b|\bnear\s+me\b|\bdirections?\s+to\b|推荐|行程|预算|卡路里|附近|怎么去)/i;

/**
 * Parses natural-language search queries across all app search bars (Home, Shop, Hotel, Tourism, Near Me, Trending)
 * so users can type conversational Khmer, English, or Chinese sentences and get accurate semantic + location results.
 */
export function parseSmartSearchIntent(rawQuery: string): ParsedSmartSearchIntent {
  const trimmed = (rawQuery || '').trim();
  if (!trimmed) {
    return {
      rawQuery: '',
      coreQuery: '',
      detectedProvinceKh: '',
      detectedProvinceEn: '',
      semanticCategory: null,
      isConversationalPrompt: false,
      isNearbyIntent: false,
    };
  }

  let detectedProvinceKh = '';
  let detectedProvinceEn = '';
  let working = trimmed;

  for (const p of PROVINCE_ALIASES) {
    if (p.patterns.test(working)) {
      detectedProvinceKh = p.kh;
      detectedProvinceEn = p.en;
      working = working.replace(new RegExp(p.patterns.source, 'gi'), ' ');
      break;
    }
  }

  const isNearbyIntent = /(?:ជិតខ្ញុំ|នៅជិតខ្ញុំ|ក្បែរខ្ញុំ|\bnear\s+me\b|\bnearby\b|\bclosest\b|附近)/i.test(trimmed);
  const isConversationalPrompt =
    CONVERSATIONAL_PROMPT_CHECK_RE.test(trimmed) || trimmed.split(/\s+/).length >= 4;

  // Detect high-level semantic category before stripping keywords
  let semanticCategory: ParsedSmartSearchIntent['semanticCategory'] = null;
  if (/កាហ្វេ|តែគុជ|ម៉ាត់ឆា|\bcafe\b|\bcafé\b|\bcoffee\b|\bboba\b|\bmatcha\b|咖啡|奶茶/i.test(trimmed)) {
    semanticCategory = 'cafe';
  } else if (/គ្រឿងសមុទ្រ|មាត់ទន្លេ|\bseafood\b|\briverside\b|海鲜|河畔/i.test(trimmed)) {
    semanticCategory = 'seafood';
  } else if (/សាច់អាំង|ជួបជុំ|\bbbq\b|\bgrill\b|烧烤/i.test(trimmed)) {
    semanticCategory = 'bbq';
  } else if (/បួស|\bvegetarian\b|\bvegan\b|素食/i.test(trimmed)) {
    semanticCategory = 'vegetarian';
  } else if (/រីសត|\bresort\b|度假村/i.test(trimmed)) {
    semanticCategory = 'resort';
  } else if (/ផ្ទះសំណាក់|បឹងហ្គាឡូ|\bguesthouse\b|\bbungalow\b|\bhostel\b|客栈|民宿/i.test(trimmed)) {
    semanticCategory = 'guesthouse';
  } else if (/សណ្ឋាគារ|កន្លែងគេង|កន្លែងស្នាក់នៅ|\bhotel\b|\bstay\b|酒店|住宿/i.test(trimmed)) {
    semanticCategory = 'hotel';
  } else if (/ទឹកធ្លាក់|ជ្រោះ|\bwaterfall\b|瀑布/i.test(trimmed)) {
    semanticCategory = 'waterfall';
  } else if (/ប្រាសាទ|វត្ត|\btemple\b|\bpagoda\b|寺庙|古迹/i.test(trimmed)) {
    semanticCategory = 'temple';
  } else if (/ឆ្នេរ|សមុទ្រ|កោះ|\bbeach\b|\bisland\b|海滩|海岛/i.test(trimmed)) {
    semanticCategory = 'beach';
  } else if (/ភ្នំ|\bmountain\b|\bhill\b|山/i.test(trimmed)) {
    semanticCategory = 'mountain';
  }

  const stripped = working
    .replace(CONVERSATIONAL_FILLER_RE, ' ')
    .replace(/[?？!！។«»"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip standalone generic words like "ហាង" / "សណ្ឋាគារ" / "កន្លែងដើរលេង" ONLY if other specific tokens remain
  const withoutGenericContainer = stripped
    .replace(/^(?:ហាងអាហារ|ហាង|ភោជនីយដ្ឋាន|សណ្ឋាគារ|កន្លែងដើរលេង|តំបន់ទេសចរណ៍|រមណីយដ្ឋាន|ម្ហូប|អាហារ|restaurant|restaurants|shop|shops|hotel|hotels|place|places)\s+/i, '')
    .trim();

  const coreQuery = withoutGenericContainer || stripped || (detectedProvinceKh ? '' : trimmed);

  return {
    rawQuery: trimmed,
    coreQuery,
    detectedProvinceKh,
    detectedProvinceEn,
    semanticCategory,
    isConversationalPrompt,
    isNearbyIntent,
  };
}

/**
 * Escalates any search query from Home, Shop, Hotel, Tourism, or Trending views
 * directly into the Conversational AI Agent Modal (`WhatToEatModal`) with zero API cost ($0 MCP tools + optional LLM).
 */
export function openAiAssistantWithQuery(
  query: string,
  setIsWhatToEatModalOpen: (open: boolean) => void
): void {
  const clean = (query || '').trim();
  if (typeof window !== 'undefined' && clean) {
    (window as any).__kft_pending_ai_query = clean;
    window.dispatchEvent(new CustomEvent('kft:ask-ai-assistant', { detail: { query: clean } }));
  }
  setIsWhatToEatModalOpen(true);
}

export function getAskAiButtonLabel(language: Language, query?: string): string {
  const shortQ = (query || '').trim().slice(0, 28);
  const suffix = shortQ && (query || '').trim().length > 28 ? '…' : '';
  if (language === 'km') {
    return shortQ ? `សួរជំនួយការ AI៖ «${shortQ}${suffix}»` : 'សួរជំនួយការ AI ផ្ទាល់';
  }
  if (language === 'zh') {
    return shortQ ? `询问 AI 助手：“${shortQ}${suffix}”` : '询问 AI 助手';
  }
  return shortQ ? `Ask AI Assistant: "${shortQ}${suffix}"` : 'Ask AI Assistant';
}
