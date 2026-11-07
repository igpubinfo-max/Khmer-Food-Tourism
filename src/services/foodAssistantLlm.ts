/**
 * Food Assistant LLM engine ("ChatGPT, but only for food").
 *
 * Design (audit fixes):
 *  - The language model is the BRAIN: it receives the real conversation (multi-turn), the user's photo
 *    (Gemini vision) and verified catalog facts as grounding - instead of a rules engine deciding the answer
 *    and the model only polishing 1-2 sentences.
 *  - Strict food-domain + medical boundary are enforced twice: in the system prompt AND in code
 *    (pre-check, `domain` field, post-check for cure/treat claims).
 *  - Honest uncertainty: image identification carries a calibrated confidence; below the threshold the
 *    assistant asks a clarifying question and shows NO dish card / NO photo (never a random lookalike).
 *  - Catalog cards come ONLY from ids that exist in the verified catalog (ids are re-validated in code).
 *
 * This file contains no UI. Pure functions (`buildGeminiRequestBody`, `interpretAssistantPayload`, ...)
 * are exported so they can be unit-tested without network access.
 */
import type { FoodItem, Language, Restaurant, User } from '../types';
import { stripForeignScripts, tr } from '../utils/i18n';
import { getApiUserId } from '../utils/apiIdentity';
import { searchKhmerFoods } from '../utils/khmerFoodSearch';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { getMatchingRestaurantsForDish } from '../utils/foodFilters';
import { detectReplyLanguage, type ReplyLanguage } from '../utils/foodQueryClassifier';
import { buildMedicalScopeNotice, isMedicalOrHealthQuery, type BrainChip } from './aiFoodBrain';
import {
  buildGeminiGenerateContentUrls,
  getGeminiCandidateModels,
  getWorkingGeminiRoute,
  isVertexExpressApiKey,
  recordWorkingGeminiRoute,
  resolveGeminiApiKey,
  type AiAssistantMessage,
  type AiConversationMemory,
  type AiImageAnalysis,
  type AiTurnIntent,
} from './conversationalAiAssistant';
import { getCloudApiConfig, verifyUserVipStatusFromBackend } from './supabaseService';

/* ------------------------------------------------------------------------------------------------ */
/* Types                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

export interface FoodImageInput {
  mimeType: string;
  /** Raw base64 (no `data:` prefix). */
  base64: string;
  /** Small data URL used to show the user's own photo in the chat. */
  previewDataUrl?: string;
}

export type FoodAssistantFailure =
  | 'no_key'
  | 'network'
  | 'timeout'
  | 'auth'
  | 'quota'
  | 'blocked'
  | 'bad_response'
  | 'unavailable';

export type FoodAssistantResult =
  | { ok: true; message: AiAssistantMessage; model: string }
  | { ok: false; reason: FoodAssistantFailure; detail?: string };

/** Below this calibrated confidence the assistant must ask instead of naming a dish. */
export const IMAGE_CONFIDENCE_THRESHOLD = 0.6;

const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CHARS = 700;

const TEXT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
];
const ESCALATION_MODEL = 'gemini-3.8-flash';

/* ------------------------------------------------------------------------------------------------ */
/* Prompt                                                                                           */
/* ------------------------------------------------------------------------------------------------ */

const LANGUAGE_NAME: Record<ReplyLanguage, string> = {
  km: 'Khmer (ភាសាខ្មែរ, Khmer script)',
  en: 'English',
  zh: 'Simplified Chinese (简体中文)',
};

/** Compact, STATIC catalog index (kept first in the system prompt so Gemini implicit caching can reuse it). */
export function buildCatalogIndex(foods: FoodItem[]): string {
  return foods
    .map((f) => `${f.id}|${f.nameKh}|${(f.nameEn || '').slice(0, 70)}|${f.categorySlug}`)
    .join('\n');
}

export function buildFoodAssistantSystemPrompt(catalogIndex: string): string {
  return `You are "Cambodia Flavors AI": a professional, ChatGPT-class assistant dedicated EXCLUSIVELY to FOOD, built into the app "Cambodia Flavors" (រសជាតិកម្ពុជា). You think carefully, understand context, and answer like an experienced chef + food historian + food-safety expert.

## SCOPE - answer fully, accurately and in depth
Cambodian AND international food & drink: dish names (Khmer / English / Chinese), ingredients, approximate nutrition, cooking methods & complete recipes, comparisons, recommendations, origins / history / culture, food & beverage pairing, storage / preservation / food safety, restaurant dishes & menu explanations, and identifying dishes from photos.
- Tourism, travel, hotels, politics, coding, math, general chat and anything not about food/drink/cooking/dining are OUT OF SCOPE -> domain="off_topic": reply in 1-2 friendly sentences that you only help with food, and suggest a food topic. (Questions about food in a province/city, or restaurants, ARE in scope.)

## MEDICAL BOUNDARY (strict)
Never diagnose, never advise treatment, never claim a food cures / prevents / treats / heals any disease or symptom, never advise on medication, supplements or doses, never answer "what should a patient with <disease> eat". For such requests set domain="medical_advice" and write a short, kind refusal (the app shows its own notice). Allowed: neutral food facts (typical calories, macros, ingredients, allergens present in a recipe), food-safety practice (storage, reheating, cross-contamination), and dietary PREFERENCE filtering (vegetarian, low sugar, low oil, not spicy) described as recipe characteristics - never as health advice. For allergens say recipes vary and people with allergies must confirm with the cook.
Illegal / dangerous / protected-wildlife requests -> domain="unsafe".

## ACCURACY RULES
1. Understand the question first. Answer exactly what was asked with concrete specifics (numbers, temperatures, times, steps, reasons). Be thorough but well organised (short intro, then bullets or numbered steps). No filler, no repetition.
2. Never invent facts, dishes, history, statistics or sources. If unsure, say what is uncertain, give the most probable answer labelled "typically / usually / approx.", or ask ONE clarifying question and set needsClarification=true. It is better to ask than to guess.
3. Nutrition numbers are approximate per typical serving - say so. Do not present them as medical guidance.
4. Cambodian vocabulary: use correct Khmer spelling (ម្ជូរ, អាម៉ុក, គុយទាវ, សម្លកកូរ, ប្រហុក, ស្ងោរជ្រក់...). Understand informal / phonetic / mobile-keyboard spellings and regional names. Never confuse similar words (e.g. ស្ករ sugar vs ស្ករត្នោត palm sugar; ជ្រក់ pickled vs ស្ងោរ boiled).
5. LANGUAGE: write the entire answer in REPLY_LANGUAGE (given in each request). Dish names: local name first, English/pinyin in parentheses only when helpful. Do not mix languages at random. Never output Thai, Lao or Burmese script.
6. Use the conversation history: resolve "it", "that dish", "ចានហ្នឹង", "这个" from earlier turns.
7. CATALOG: "catalogDishIds" may contain ONLY ids that appear in CATALOG_INDEX and that genuinely match the request (max 4). If nothing genuinely matches return []. NEVER add unrelated dishes to "fill" the list. Prefer facts from RELEVANT_DISH_DETAILS when they cover the dish; otherwise use your own culinary knowledge.
8. RESTAURANTS: "restaurantIds" may contain ONLY ids from RESTAURANTS and only when the user wants places to eat.
9. RECIPES: when a recipe / ingredients / how-to-cook is requested, fill "recipe" with accurate ingredients (with amounts) and 4-8 clear steps. For catalog dishes also set catalogDishIds.
10. Keep "followUps" to 2-4 short, useful next questions in REPLY_LANGUAGE.

## IMAGE RULES (when a photo is attached)
1. Analyse the ACTUAL pixels. In imageAnalysis.evidence list what you really see: ingredients, colours, textures, broth vs dry, cooking method, garnish, vessel.
2. If there is no food or drink in the picture, set containsFood=false, say so, and do NOT guess a dish.
3. Identify the dish (dishNameLocal in REPLY_LANGUAGE, dishNameEnglish). Compare with CATALOG_INDEX; set catalogDishId ONLY if it is the same dish, not merely similar. Otherwise "".
4. confidence is calibrated 0-1: >=0.85 only with distinctive evidence; 0.6-0.85 probable; <0.6 uncertain. If confidence < ${IMAGE_CONFIDENCE_THRESHOLD}, or the photo is blurry / partial / ambiguous / several dishes are plausible: set needsClarification=true, list up to 3 alternatives with confidences and ask ONE short question that would settle it (broth or dry? which meat? sweet or savoury?). Do NOT state a single dish as fact when uncertain.
5. Distinguish look-alikes carefully: amok vs fish curry; kuy teav vs pho; bai sach chrouk vs other pork rice; nom banh chok vs other rice noodles; lok lak vs beef salad; samlor machu vs tom yum; num ansom vs num kom; fried rice vs rice porridge.
6. Name ingredients / cooking method only from visible evidence; mark unseen items as "possibly".

## OUTPUT
Return ONLY a JSON object that matches the response schema. "answer" holds the full user-facing reply (light markdown allowed: **bold**, "- " bullets, "1." steps).

## CATALOG_INDEX (id|Khmer|English|category) - the only dishes that may be returned as catalogDishIds
${catalogIndex}`;
}

/* ------------------------------------------------------------------------------------------------ */
/* Response schema                                                                                  */
/* ------------------------------------------------------------------------------------------------ */

const INTENTS = [
  'general_food_qa',
  'recipe',
  'nutrition',
  'compare',
  'recommend',
  'pairing',
  'storage_safety',
  'history_culture',
  'restaurant_menu',
  'identify_image',
  'clarify',
  'off_topic',
] as const;

const STR = { type: 'STRING' } as const;
const NUM = { type: 'NUMBER' } as const;
const BOOL = { type: 'BOOLEAN' } as const;
const strArray = { type: 'ARRAY', items: STR } as const;

export const FOOD_ASSISTANT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    domain: { type: 'STRING', format: 'enum', enum: ['food', 'medical_advice', 'off_topic', 'unsafe'] },
    intent: { type: 'STRING', format: 'enum', enum: [...INTENTS] },
    answer: STR,
    needsClarification: BOOL,
    imageAnalysis: {
      type: 'OBJECT',
      properties: {
        containsFood: BOOL,
        confidence: NUM,
        dishNameLocal: STR,
        dishNameEnglish: STR,
        catalogDishId: STR,
        alternatives: {
          type: 'ARRAY',
          items: { type: 'OBJECT', properties: { name: STR, confidence: NUM }, required: ['name'] },
        },
        visibleIngredients: strArray,
        cookingMethod: STR,
        evidence: STR,
      },
      required: ['containsFood', 'confidence'],
    },
    catalogDishIds: strArray,
    restaurantIds: strArray,
    recipe: {
      type: 'OBJECT',
      properties: {
        dishName: STR,
        englishName: STR,
        servings: STR,
        totalTime: STR,
        ingredients: {
          type: 'ARRAY',
          items: { type: 'OBJECT', properties: { name: STR, amount: STR }, required: ['name'] },
        },
        steps: strArray,
      },
    },
    followUps: strArray,
  },
  required: ['domain', 'intent', 'answer', 'needsClarification'],
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* Grounding + request building (pure)                                                              */
/* ------------------------------------------------------------------------------------------------ */

export interface AssistantHistoryTurn {
  role: 'user' | 'assistant';
  text: string;
  hadImage?: boolean;
  dishNames?: string[];
}

/** Convert UI chat messages into compact history turns for the model. */
export function toHistoryTurns(messages: AiAssistantMessage[]): AssistantHistoryTurn[] {
  const turns: AssistantHistoryTurn[] = [];
  for (const m of messages) {
    if (m.id === 'ai-welcome' || m.isPending) continue;
    const text = (m.text || '').trim();
    if (!text && !m.imagePreviewUrl) continue;
    turns.push({
      role: m.role,
      text,
      hadImage: Boolean(m.imagePreviewUrl),
      dishNames:
        m.role === 'assistant'
          ? (m.dishes || []).slice(0, 4).map((d) => d.nameKh)
          : undefined,
    });
  }
  return turns.slice(-MAX_HISTORY_MESSAGES);
}

function clip(text: string, max: number): string {
  const t = (text || '').replace(/\s+\n/g, '\n').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function turnToText(t: AssistantHistoryTurn): string {
  let out = clip(t.text, MAX_HISTORY_CHARS);
  if (t.hadImage) out = `[the user attached a food photo] ${out}`.trim();
  if (t.dishNames && t.dishNames.length > 0) out = `${out}\n[dishes shown to the user: ${t.dishNames.join(', ')}]`;
  return out;
}

/** Verified catalog facts for the dishes most relevant to this turn. */
export function retrieveGroundingDishes(
  foods: FoodItem[],
  userText: string,
  history: AssistantHistoryTurn[],
  memory?: Pick<AiConversationMemory, 'lastDishes'> | null,
  limit = 8
): FoodItem[] {
  const picked = new Map<string, FoodItem>();
  const add = (list: FoodItem[], max: number) => {
    for (const f of list.slice(0, max)) {
      if (picked.size >= limit) return;
      picked.set(f.id, f);
    }
  };
  try {
    add(searchKhmerFoods(foods, userText), 6);
  } catch {
    /* retrieval is best-effort */
  }
  // Follow-up questions ("how long does it keep?") refer to the previous turn
  const lastUser = [...history].reverse().find((t) => t.role === 'user' && t.text);
  if (lastUser && lastUser.text !== userText) {
    try {
      add(searchKhmerFoods(foods, lastUser.text), 3);
    } catch {
      /* ignore */
    }
  }
  if (memory?.lastDishes?.length) {
    add(
      memory.lastDishes.filter((d) => foods.some((f) => f.id === d.id)),
      3
    );
  }
  return Array.from(picked.values());
}

function dishFacts(f: FoodItem) {
  const ingredients = (f.ingredients || [])
    .slice(0, 9)
    .map((i) => i.nameEn || i.nameKh)
    .filter(Boolean);
  return {
    id: f.id,
    kh: f.nameKh,
    en: f.nameEn,
    category: f.categorySlug,
    province: f.provinceEn || f.provinceKh || undefined,
    approxKcal: f.calories || undefined,
    ingredients,
    about: clip(f.descriptionEn || f.descriptionKh || '', 170),
  };
}

export interface BuildRequestParams {
  userText: string;
  uiLanguage: Language;
  foods: FoodItem[];
  restaurants: Restaurant[];
  history: AssistantHistoryTurn[];
  memory?: AiConversationMemory | null;
  image?: FoodImageInput | null;
  model: string;
  /** progressive degradation when a model rejects optional fields: 0 = schema+thinking, 1 = schema, 2 = JSON mime only, 3 = plain contents-only */
  level?: 0 | 1 | 2 | 3;
  now?: Date;
}

export function supportsThinkingConfig(model: string): boolean {
  return /gemini-2\.5|gemini-3|flash-latest|pro-latest/i.test(model);
}

function normalizeContents(
  history: AssistantHistoryTurn[],
  finalParts: Array<Record<string, unknown>>
): Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];
  for (const turn of history) {
    const role = turn.role === 'assistant' ? 'model' : 'user';
    const text = turnToText(turn);
    if (!text) continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts.push({ text });
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }
  // Gemini requires the conversation to start with a user turn
  while (contents.length > 0 && contents[0].role !== 'user') contents.shift();
  const last = contents[contents.length - 1];
  if (last && last.role === 'user') {
    // two consecutive user turns -> merge into the final turn
    last.parts.push(...finalParts);
  } else {
    contents.push({ role: 'user', parts: finalParts });
  }
  return contents;
}

/** Build the exact Gemini `generateContent` request body (pure - unit-testable). */
export function buildGeminiRequestBody(params: BuildRequestParams): Record<string, unknown> {
  const { userText, uiLanguage, foods, restaurants, history, memory, image, model } = params;
  const level = params.level ?? 0;
  const replyLanguage = detectReplyLanguage(userText, uiLanguage);
  const hasImage = Boolean(image?.base64);
  const grounding = retrieveGroundingDishes(foods, userText, history, memory);
  const shopCandidates = new Map<string, Restaurant>();
  for (const d of grounding.slice(0, 3)) {
    for (const r of getMatchingRestaurantsForDish(d, restaurants, 2)) shopCandidates.set(r.id, r);
  }
  const shops = Array.from(shopCandidates.values())
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      name: r.nameKh,
      en: r.nameEn,
      province: r.provinceEn || r.provinceKh,
      signatureDishes: (r.signatureDishesKh || []).slice(0, 3),
    }));

  const now = params.now || new Date();
  const dynamicBlock = [
    `REPLY_LANGUAGE: ${LANGUAGE_NAME[replyLanguage]}`,
    `APP_LANGUAGE: ${uiLanguage}`,
    `LOCAL_TIME (Cambodia, UTC+7): ${now.toISOString()}`,
    `RELEVANT_DISH_DETAILS: ${JSON.stringify(grounding.map(dishFacts))}`,
    `RESTAURANTS: ${JSON.stringify(shops)}`,
    hasImage
      ? 'A food photo is attached to this message - follow the IMAGE RULES. If the text is empty, identify the dish and explain it.'
      : '',
    `USER_MESSAGE: ${userText.trim() || '(photo only - please identify what is in the photo)'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const finalParts: Array<Record<string, unknown>> = [];
  if (hasImage && image) {
    finalParts.push({ inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.base64 } });
  }
  finalParts.push({ text: dynamicBlock });

  const sysPromptText = buildFoodAssistantSystemPrompt(buildCatalogIndex(foods));

  if (level === 3) {
    const plainParts: Array<Record<string, unknown>> = [];
    if (hasImage && image) {
      plainParts.push({ inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.base64 } });
    }
    plainParts.push({
      text: `${sysPromptText}\n\n${dynamicBlock}\n\nRespond ONLY with a single valid JSON object matching the instructions above.`,
    });
    return {
      contents: normalizeContents(history, plainParts),
      generationConfig: {
        temperature: hasImage ? 0.2 : 0.35,
        maxOutputTokens: 4096,
      },
    };
  }

  const generationConfig: Record<string, unknown> = {
    temperature: hasImage ? 0.2 : 0.35,
    topP: 0.9,
    maxOutputTokens: 6144,
    responseMimeType: 'application/json',
  };
  if (level <= 1) generationConfig.responseSchema = FOOD_ASSISTANT_RESPONSE_SCHEMA;
  if (level === 0 && supportsThinkingConfig(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: hasImage ? 1536 : 512 };
  }

  return {
    systemInstruction: { role: 'user', parts: [{ text: sysPromptText }] },
    contents: normalizeContents(history, finalParts),
    generationConfig,
  };
}

/* ------------------------------------------------------------------------------------------------ */
/* Interpretation of the model's JSON (pure)                                                        */
/* ------------------------------------------------------------------------------------------------ */

const MEDICAL_CLAIM_RE =
  /\b(?:cures?|cured\s+by|heals?|treats?\s+(?:the\s+)?(?:diabetes|cancer|hypertension|disease|illness|gastritis|ulcer|arthritis|asthma)|prevents?\s+(?:the\s+)?(?:diabetes|cancer|disease|illness)|reduces?\s+the\s+risk\s+of\s+(?:diabetes|cancer|heart\s+disease))\b|ព្យាបាលជំងឺ|ព្យាបាល|បំបាត់ជំងឺ|ការពារជំងឺ|ជាសះស្បើយ|治疗|治愈|治病|食疗|预防.{0,6}病/i;

export function containsMedicalClaim(answer: string): boolean {
  return MEDICAL_CLAIM_RE.test(answer || '');
}

function clamp01(n: unknown): number {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  if (!isFinite(v)) return 0;
  // some models answer 0-100
  const scaled = v > 1 && v <= 100 ? v / 100 : v;
  return Math.max(0, Math.min(1, scaled));
}

function str(v: unknown, max = 600): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function strList(v: unknown, maxItems: number, maxLen = 160): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const s = str(item, maxLen);
    if (s) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'dish';
}

export const AI_DISH_ID_PREFIX = 'ai-dish-';

export interface InterpretContext {
  foods: FoodItem[];
  restaurants: Restaurant[];
  uiLanguage: Language;
  replyLanguage: ReplyLanguage;
  hasImage: boolean;
  imagePreviewUrl?: string;
  model: string;
}

export function foodAssistantStarterChips(language: Language): BrainChip[] {
  return [
    {
      id: 'q_tonight',
      label: tr(language, 'ថ្ងៃនេះគួរញ៉ាំអ្វី?', 'What should I eat today?', '今天吃什么？'),
      query: tr(language, 'ថ្ងៃនេះគួរញ៉ាំអ្វីល្អ?', 'What should I eat today?', '今天吃什么好？'),
    },
    {
      id: 'q_amok',
      label: tr(language, 'របៀបធ្វើអាម៉ុក', 'How to make amok', '阿莫克做法'),
      query: tr(language, 'សុំរូបមន្តអាម៉ុកត្រីលម្អិត', 'Give me a detailed fish amok recipe', '请给我详细的阿莫克鱼食谱'),
    },
    {
      id: 'q_storage',
      label: tr(language, 'រក្សាទុកម្ហូប', 'Storing leftovers', '剩菜保存'),
      query: tr(language, 'តើរក្សាទុកម្ហូបសម្លក្នុងទូទឹកកកបានប៉ុន្មានថ្ងៃ?', 'How long can leftover soup stay in the fridge?', '剩下的汤放冰箱能保存几天？'),
    },
  ];
}

/** Interpret + VALIDATE the model JSON and turn it into a chat message. Never trusts ids / confidence blindly. */
export function interpretAssistantPayload(raw: unknown, ctx: InterpretContext): AiAssistantMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, any>;
  const language = ctx.uiLanguage;
  const answerRaw = stripForeignScripts(str(p.answer, 6000));
  const domain = str(p.domain, 24) || 'food';
  const base = {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: 'assistant' as const,
    timestamp: new Date().toISOString(),
    isLiveGemini: true,
    source: 'llm' as const,
    model: ctx.model,
  };

  // ---- Boundaries -------------------------------------------------------------------------------
  if (domain === 'medical_advice' || (domain === 'food' && containsMedicalClaim(answerRaw))) {
    const notice = buildMedicalScopeNotice(language);
    return {
      ...base,
      intent: 'medical_scope_refusal',
      isScopeRefusal: true,
      suppressDishCard: true,
      text: `${notice.headline}\n\n${notice.explanation}`,
      followUpChips: notice.followUps,
    };
  }
  if (domain === 'unsafe') {
    return {
      ...base,
      intent: 'off_topic',
      isScopeRefusal: true,
      suppressDishCard: true,
      text: tr(
        language,
        'សូមអភ័យទោស ខ្ញុំមិនអាចជួយលើសំណើនេះបានទេ។ សូមសួរអំពីម្ហូបអាហារសុវត្ថិភាពវិញ។',
        'Sorry, I can’t help with that request. Please ask me about safe, legal food instead.',
        '抱歉，我无法协助此请求。请改问与安全、合法美食相关的问题。'
      ),
      followUpChips: foodAssistantStarterChips(language),
    };
  }
  if (domain === 'off_topic') {
    return {
      ...base,
      intent: 'off_topic',
      isScopeRefusal: true,
      suppressDishCard: true,
      text:
        answerRaw ||
        tr(
          language,
          'ខ្ញុំជាជំនួយការឯកទេសតែផ្នែកម្ហូបអាហារប៉ុណ្ណោះ។ សូមសួរអំពីម្ហូប រូបមន្ត គ្រឿងផ្សំ ឬការរក្សាទុកអាហារ។',
          'I’m a food-only assistant. Ask me about dishes, recipes, ingredients, pairings or food storage.',
          '我是专注于美食的助手。欢迎询问菜品、食谱、食材、搭配或食物保存。'
        ),
      followUpChips: foodAssistantStarterChips(language),
    };
  }

  if (!answerRaw) return null;

  const foodById = new Map(ctx.foods.map((f) => [f.id, f]));
  const shopById = new Map(ctx.restaurants.map((r) => [r.id, r]));
  const validIds = (ids: unknown, max: number): FoodItem[] => {
    const out: FoodItem[] = [];
    for (const id of strList(ids, max * 2, 60)) {
      const f = foodById.get(id);
      if (f && !out.some((o) => o.id === f.id)) out.push(f);
      if (out.length >= max) break;
    }
    return out;
  };

  // ---- Image analysis (with confidence gate) ----------------------------------------------------
  let imageAnalysis: AiImageAnalysis | undefined;
  let needsClarification = Boolean(p.needsClarification);
  let catalogDish: FoodItem | null = null;
  if (ctx.hasImage && p.imageAnalysis && typeof p.imageAnalysis === 'object') {
    const ia = p.imageAnalysis as Record<string, any>;
    const containsFood = ia.containsFood !== false;
    const confidence = containsFood ? clamp01(ia.confidence) : 0;
    const alternatives = (Array.isArray(ia.alternatives) ? ia.alternatives : [])
      .map((a: any) => ({ name: stripForeignScripts(str(a?.name, 80)), confidence: clamp01(a?.confidence) }))
      .filter((a: { name: string }) => a.name)
      .slice(0, 3);
    const identified = containsFood && confidence >= IMAGE_CONFIDENCE_THRESHOLD && !needsClarification;
    const cid = str(ia.catalogDishId, 60);
    if (identified && cid && foodById.has(cid)) catalogDish = foodById.get(cid)!;
    if (containsFood && !identified) needsClarification = true;
    imageAnalysis = {
      containsFood,
      confidence,
      dishName: stripForeignScripts(str(ia.dishNameLocal, 100)) || undefined,
      dishNameEn: str(ia.dishNameEnglish, 100) || undefined,
      alternatives,
      visibleIngredients: strList(ia.visibleIngredients, 10, 50).map((s) => stripForeignScripts(s)),
      cookingMethod: stripForeignScripts(str(ia.cookingMethod, 80)) || undefined,
      evidence: stripForeignScripts(str(ia.evidence, 400)) || undefined,
      identified,
    };
  } else if (ctx.hasImage) {
    // The model skipped the mandatory analysis block -> do not trust any dish claim
    needsClarification = true;
  }

  // ---- Cards: catalog ids only ------------------------------------------------------------------
  let dishes = validIds(p.catalogDishIds, 4);
  if (ctx.hasImage) {
    // Photo flow: only show a catalog card when the model positively identified that exact dish.
    dishes = catalogDish ? [catalogDish] : [];
  }

  // ---- Recipe card ------------------------------------------------------------------------------
  let recipePreview: AiAssistantMessage['recipePreview'] | undefined;
  const recipe = p.recipe && typeof p.recipe === 'object' ? (p.recipe as Record<string, any>) : null;
  const llmIngredients = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const llmSteps = recipe ? strList(recipe.steps, 10, 500) : [];
  const wantsRecipe = p.intent === 'recipe' || (recipe && llmIngredients.length > 0 && llmSteps.length > 0);
  if (wantsRecipe && !needsClarification) {
    const recipeCatalogDish = dishes[0];
    const recipeName = stripForeignScripts(str(recipe?.dishName, 100));
    const recipeNameEn = str(recipe?.englishName, 100);
    const nameMatchesCatalog =
      recipeCatalogDish &&
      (!recipeName ||
        recipeCatalogDish.nameKh.includes(recipeName) ||
        recipeName.includes(recipeCatalogDish.nameKh) ||
        (recipeNameEn && (recipeCatalogDish.nameEn || '').toLowerCase().includes(recipeNameEn.toLowerCase().slice(0, 12))));
    if (recipeCatalogDish && (nameMatchesCatalog || !recipe)) {
      // Verified catalog recipe is authoritative.
      const loc = getLocalizedFood(recipeCatalogDish, ctx.uiLanguage);
      recipePreview = {
        food: recipeCatalogDish,
        ingredients: (recipeCatalogDish.ingredients || []).slice(0, 8).map((ing, idx) => ({
          name:
            ctx.uiLanguage === 'km'
              ? ing.nameKh
              : ctx.uiLanguage === 'zh'
                ? loc.ingredients?.[idx]?.name || ing.nameEn || ing.nameKh
                : ing.nameEn || ing.nameKh,
          amount: ing.amount || '',
        })),
        steps: (recipeCatalogDish.steps || []).slice(0, 8).map((st, idx) => ({
          stepNumber: st.stepNumber || idx + 1,
          instruction:
            ctx.uiLanguage === 'km'
              ? st.instructionKh
              : ctx.uiLanguage === 'zh'
                ? loc.steps?.[idx]?.instruction || st.instructionEn || st.instructionKh
                : st.instructionEn || st.instructionKh,
        })),
      };
    } else if (recipe && recipeName && llmIngredients.length > 0 && llmSteps.length > 0) {
      const ingredients = llmIngredients.slice(0, 14).map((i: any) => ({
        name: stripForeignScripts(str(i?.name, 120)),
        amount: stripForeignScripts(str(i?.amount, 60)),
      }));
      const steps = llmSteps.map((s, idx) => ({ stepNumber: idx + 1, instruction: stripForeignScripts(s) }));
      const aiFood: FoodItem = {
        id: `${AI_DISH_ID_PREFIX}${slugify(recipeNameEn || recipeName)}`,
        nameKh: recipeName,
        nameEn: recipeNameEn || recipeName,
        categorySlug: 'specialty',
        categoryKh: tr(language, 'រូបមន្តពី AI', 'AI recipe', 'AI 食谱'),
        categoryEn: 'AI recipe',
        descriptionKh: clip(answerRaw.split('\n')[0] || '', 220),
        descriptionEn: clip(answerRaw.split('\n')[0] || '', 220),
        // The user's own photo is the only image we can honestly attach; otherwise a VERIFIED photo is looked up later.
        photoUrl: ctx.hasImage && imageAnalysis?.identified ? ctx.imagePreviewUrl || '' : '',
        prepTime: str(recipe.totalTime, 40) || '',
        cookTime: str(recipe.totalTime, 40) || '',
        servings: str(recipe.servings, 40) || '',
        difficulty: 'medium',
        priceRiel: 0,
        priceUsd: 0,
        ingredients: ingredients.map((i: { name: string; amount: string }) => ({
          nameKh: i.name,
          nameEn: i.name,
          amount: i.amount,
        })),
        steps: steps.map((s: { stepNumber: number; instruction: string }) => ({
          stepNumber: s.stepNumber,
          instructionKh: s.instruction,
          instructionEn: s.instruction,
        })),
        rating: 0,
        reviewCount: 0,
      };
      recipePreview = { food: aiFood, ingredients, steps };
      dishes = [aiFood, ...dishes.filter((d) => d.id !== aiFood.id)].slice(0, 4);
    }
  }

  // ---- Restaurants ------------------------------------------------------------------------------
  const restaurants: Restaurant[] = [];
  for (const id of strList(p.restaurantIds, 6, 60)) {
    const r = shopById.get(id);
    if (r && !restaurants.some((x) => x.id === r.id)) restaurants.push(r);
    if (restaurants.length >= 3) break;
  }

  // ---- Chips ------------------------------------------------------------------------------------
  const chips: BrainChip[] = [];
  if (needsClarification && imageAnalysis?.alternatives?.length) {
    for (const [i, alt] of imageAnalysis.alternatives.entries()) {
      chips.push({
        id: `alt_${i}`,
        label: alt.name.slice(0, 48),
        query: tr(
          language,
          `ម្ហូបក្នុងរូបភាពគឺ «${alt.name}» សូមប្រាប់ព័ត៌មានលម្អិត`,
          `The dish in my photo is "${alt.name}". Tell me more about it.`,
          `我照片里的菜是“${alt.name}”，请详细介绍一下。`
        ),
      });
    }
  }
  for (const [i, f] of strList(p.followUps, 4, 90).entries()) {
    chips.push({ id: `fu_${i}`, label: f.slice(0, 64), query: f });
  }

  const intentMap: Record<string, AiTurnIntent> = {
    recipe: 'recipe_detail',
    compare: 'dish_comparison',
    pairing: 'beverage_pairing',
    recommend: 'food_discovery',
    restaurant_menu: 'restaurant_recommend',
    identify_image: 'image_identification',
    clarify: 'clarification',
  };
  const intent: AiTurnIntent =
    ctx.hasImage ? 'image_identification' : needsClarification ? 'clarification' : intentMap[str(p.intent, 30)] || 'general_food_qa';

  return {
    ...base,
    intent,
    text: answerRaw,
    dishes: dishes.length > 0 ? dishes : undefined,
    compareDishes: intent === 'dish_comparison' && dishes.length >= 2 ? dishes.slice(0, 3) : undefined,
    recipePreview,
    restaurants: restaurants.length > 0 ? restaurants : undefined,
    imageAnalysis,
    needsClarification: needsClarification || undefined,
    suppressDishCard: dishes.length === 0 && !recipePreview,
    followUpChips: chips.length > 0 ? chips.slice(0, 6) : undefined,
  };
}

/* ------------------------------------------------------------------------------------------------ */
/* Network layer                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

type CallFailureKind =
  | 'no_key'
  | 'network'
  | 'timeout'
  | 'auth'
  | 'quota'
  | 'blocked'
  | 'bad_request'
  | 'not_found'
  | 'server'
  | 'bad_response'
  /** The Supabase `food-ai` proxy is not deployed / not configured -> use the direct key instead. */
  | 'proxy_unavailable';

type CallOutcome = { ok: true; text: string } | { ok: false; kind: CallFailureKind; status?: number; message?: string };

interface RawCall {
  url: string;
  headers: Record<string, string>;
  payload: unknown;
  timeoutMs: number;
  viaProxy?: boolean;
}

async function callGeminiRaw(call: RawCall): Promise<CallOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), call.timeoutMs);
  try {
    const response = await fetch(call.url, {
      method: 'POST',
      headers: call.headers,
      signal: controller.signal,
      body: JSON.stringify(call.payload),
    });
    clearTimeout(timer);

    if (call.viaProxy) {
      // Our proxy stamps every answer with this header. No header (gateway 401/404) or 503 = proxy not usable.
      const stamped = response.headers.get('x-food-ai-proxy') === '1';
      if (!stamped || response.status === 503) return { ok: false, kind: 'proxy_unavailable', status: response.status };
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = String(err?.error?.message || `HTTP ${response.status}`);
      const status = response.status;
      if (status === 401 || status === 403) return { ok: false, kind: 'auth', status, message };
      if (status === 429) return { ok: false, kind: 'quota', status, message };
      if (status === 404) return { ok: false, kind: 'not_found', status, message };
      if (status === 400) {
        // An invalid / expired key is reported as 400 "API key not valid"
        if (/api key|API_KEY_INVALID|key not valid|expired/i.test(message)) return { ok: false, kind: 'auth', status, message };
        return { ok: false, kind: 'bad_request', status, message };
      }
      return { ok: false, kind: 'server', status, message };
    }
    const data = await response.json();
    if (data?.promptFeedback?.blockReason) {
      return { ok: false, kind: 'blocked', message: String(data.promptFeedback.blockReason) };
    }
    const candidate = data?.candidates?.[0];
    const parts: any[] = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts
      .filter((pt) => typeof pt?.text === 'string' && !pt.thought)
      .map((pt) => pt.text)
      .join('')
      .trim();
    if (!text) {
      if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
        return { ok: false, kind: 'blocked', message: String(candidate.finishReason) };
      }
      return { ok: false, kind: 'bad_response', message: `empty response (${candidate?.finishReason || 'unknown'})` };
    }
    return { ok: true, text };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') return { ok: false, kind: 'timeout' };
    return { ok: false, kind: 'network', message: err?.message };
  }
}

/** Direct call with a key that lives on the device (supports both AI Studio AIzaSy... and Vertex Express AQ... keys). */
async function callGeminiOnce(key: string, model: string, body: unknown, timeoutMs: number): Promise<CallOutcome> {
  const urls = buildGeminiGenerateContentUrls(key, model);
  const primary = await callGeminiRaw({
    url: urls[0],
    headers: { 'Content-Type': 'application/json' },
    payload: body,
    timeoutMs,
  });
  if (primary.ok) {
    recordWorkingGeminiRoute(urls[0], model);
    return primary;
  }
  if (urls[1] && primary.kind !== 'blocked' && primary.kind !== 'quota') {
    const secondary = await callGeminiRaw({
      url: urls[1],
      headers: { 'Content-Type': 'application/json' },
      payload: body,
      timeoutMs,
    });
    if (secondary.ok) {
      recordWorkingGeminiRoute(urls[1], model);
      return secondary;
    }
    // Prefer a non-auth failure so a rejected endpoint does not mask a model/schema mismatch on the real endpoint
    if (primary.kind === 'auth' && secondary.kind !== 'auth') {
      return secondary;
    }
  }
  return primary;
}

/* ---- Supabase Edge Function proxy: the Gemini key stays server-side (secret GEMINI_API_KEY) ---- */
const PROXY_RETRY_AFTER_MS = 10 * 60 * 1000;
let proxyDownUntil = 0;

/** Test hook: forget that the proxy was found unavailable. */
export function resetFoodAiProxyState(): void {
  proxyDownUntil = 0;
}

function hasProxyConfig(): boolean {
  try {
    const cfg = getCloudApiConfig();
    return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  } catch {
    return false;
  }
}

async function callViaProxy(model: string, body: unknown, timeoutMs: number): Promise<CallOutcome> {
  const cfg = getCloudApiConfig();
  const out = await callGeminiRaw({
    url: `${cfg.supabaseUrl}/functions/v1/food-ai`,
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      // lets the Edge Function apply this user's daily AI quota (and VIP check when enforcement is on)
      ...(getApiUserId() ? { 'x-kft-user-id': getApiUserId() as string } : {}),
    },
    payload: { model, body },
    timeoutMs,
    viaProxy: true,
  });
  // The proxy host itself is unreachable -> let the direct path try.
  if (!out.ok && out.kind === 'network') return { ok: false, kind: 'proxy_unavailable' };
  return out;
}

/** Tolerant JSON extraction (code fences, leading prose, truncated tail). */
export function parseModelJson(text: string): unknown | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface AskFoodAssistantParams {
  userText: string;
  uiLanguage: Language;
  foods: FoodItem[];
  restaurants: Restaurant[];
  history: AssistantHistoryTurn[];
  memory?: AiConversationMemory | null;
  image?: FoodImageInput | null;
  geminiApiKey?: string;
  currentUser?: User | null;
  /** Test hook / future proxy: replaces the raw network call. */
  transport?: (model: string, body: unknown, timeoutMs: number) => Promise<CallOutcome>;
}

/**
 * Ask the food assistant. Never throws. Returns a validated chat message or a typed failure.
 */
export async function askFoodAssistant(params: AskFoodAssistantParams): Promise<FoodAssistantResult> {
  const { userText, uiLanguage, foods, restaurants, history, memory, image } = params;
  const text = (userText || '').trim();
  const hasImage = Boolean(image?.base64);

  // Backend VIP verification before any LLM execution
  if (!params.transport) {
    const vipCheck = await verifyUserVipStatusFromBackend(params.currentUser);
    if (!vipCheck.isVip) {
      return { ok: false, reason: 'blocked', detail: 'vip_required' };
    }
  }

  // Hard boundary BEFORE any network call: medical advice requests are never sent to the model.
  if (text && isMedicalOrHealthQuery(text)) {
    const notice = buildMedicalScopeNotice(uiLanguage);
    return {
      ok: true,
      model: 'policy',
      message: {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        intent: 'medical_scope_refusal',
        isScopeRefusal: true,
        suppressDishCard: true,
        source: 'notice',
        text: `${notice.headline}\n\n${notice.explanation}`,
        followUpChips: notice.followUps,
      },
    };
  }

  const key = resolveGeminiApiKey(params.geminiApiKey);
  const proxyPossible = !params.transport && hasProxyConfig();
  if (!key && !proxyPossible && !params.transport) return { ok: false, reason: 'no_key' };

  // 1) Supabase proxy (key never leaves the server)  2) fallback: key stored in the app
  const transport =
    params.transport ||
    (async (model: string, body: unknown, timeoutMs: number): Promise<CallOutcome> => {
      if (proxyPossible && Date.now() >= proxyDownUntil) {
        const viaProxy = await callViaProxy(model, body, timeoutMs);
        if (!(viaProxy.ok === false && viaProxy.kind === 'proxy_unavailable')) return viaProxy;
        proxyDownUntil = Date.now() + PROXY_RETRY_AFTER_MS;
      }
      if (!key) return { ok: false, kind: 'no_key', message: 'No Gemini API key available' };
      return callGeminiOnce(key, model, body, timeoutMs);
    });

  const replyLanguage = detectReplyLanguage(text, uiLanguage);
  const ctx: InterpretContext = {
    foods,
    restaurants,
    uiLanguage,
    replyLanguage,
    hasImage,
    imagePreviewUrl: image?.previewDataUrl,
    model: '',
  };
  const timeoutMs = hasImage ? 35000 : 25000;
  const deadline = Date.now() + (hasImage ? 60000 : 40000);

  const attemptModel = async (
    model: string
  ): Promise<{ message: AiAssistantMessage } | { fail: FoodAssistantFailure; detail?: string; stop?: boolean }> => {
    let lastFail: { fail: FoodAssistantFailure; detail?: string } = { fail: 'unavailable' };
    for (const level of [0, 1, 2, 3] as const) {
      if (Date.now() > deadline) return { fail: 'timeout', stop: true };
      const body = buildGeminiRequestBody({
        userText: text,
        uiLanguage,
        foods,
        restaurants,
        history,
        memory,
        image,
        model,
        level,
      });
      const out = await transport(model, body, timeoutMs);
      if (out.ok) {
        const json = parseModelJson(out.text);
        const message = interpretAssistantPayload(json, { ...ctx, model });
        if (message) return { message };
        lastFail = { fail: 'bad_response', detail: 'unparseable model output' };
        continue;
      }
      if (out.kind === 'bad_request') {
        lastFail = { fail: 'bad_response', detail: out.message };
        continue; // degrade optional fields (thinking / schema / systemInstruction) and retry the same model
      }
      if (out.kind === 'no_key') return { fail: 'no_key', detail: out.message, stop: true };
      if (out.kind === 'auth') return { fail: 'auth', detail: out.message, stop: true };
      if (out.kind === 'quota') return { fail: 'quota', detail: out.message };
      if (out.kind === 'blocked') return { fail: 'blocked', detail: out.message, stop: true };
      if (out.kind === 'not_found') return { fail: 'unavailable', detail: out.message };
      if (out.kind === 'timeout') return { fail: 'timeout' };
      if (out.kind === 'network') return { fail: 'network', detail: out.message };
      return { fail: 'unavailable', detail: out.message };
    }
    return lastFail;
  };

  const savedWorkingModel = getWorkingGeminiRoute().model;
  const models = savedWorkingModel
    ? [savedWorkingModel, ...TEXT_MODELS.filter((m) => m !== savedWorkingModel)]
    : [...TEXT_MODELS];
  let failure: { fail: FoodAssistantFailure; detail?: string } = { fail: 'unavailable' };
  let triedDiscovery = false;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const res = await attemptModel(model);
    if ('message' in res) {
      let best = res.message;
      let usedModel = model;
      // Second opinion: an uncertain PHOTO is re-examined once by the strongest model before asking the user.
      if (hasImage && best.imageAnalysis && !best.imageAnalysis.identified && best.imageAnalysis.containsFood) {
        const second = await attemptModel(ESCALATION_MODEL);
        if (
          'message' in second &&
          second.message.imageAnalysis &&
          second.message.imageAnalysis.confidence > best.imageAnalysis.confidence
        ) {
          best = second.message;
          usedModel = ESCALATION_MODEL;
        }
      }
      return { ok: true, message: { ...best, model: usedModel }, model: usedModel };
    }
    failure = res;
    if (res.stop) break;
    // Model list exhausted -> ask Google which models this key can use
    if (i === models.length - 1 && !triedDiscovery && !params.transport && Boolean(key) && failure.fail === 'unavailable') {
      triedDiscovery = true;
      const discovered = (await getGeminiCandidateModels(key)).filter((m) => !models.includes(m));
      models.push(...discovered.slice(0, 3));
    }
  }
  return { ok: false, reason: failure.fail, detail: failure.detail };
}

/* ------------------------------------------------------------------------------------------------ */
/* User-facing failure messages (honest, never a fake answer)                                        */
/* ------------------------------------------------------------------------------------------------ */

export function buildAssistantFailureMessage(
  reason: FoodAssistantFailure,
  language: Language,
  hasImage: boolean,
  options?: { isAdmin?: boolean }
): AiAssistantMessage {
  const isAdmin = options?.isAdmin ?? true;
  if (!isAdmin && (reason === 'no_key' || reason === 'auth')) {
    const publicText = hasImage
      ? tr(
          language,
          'បច្ចុប្បន្នប្រព័ន្ធស្គាល់រូបភាពម្ហូបមិនទាន់អាចភ្ជាប់បានបណ្តោះអាសន្ន។ សូមវាយឈ្មោះម្ហូបជាអក្សរ ឬព្យាយាមម្តងទៀតបន្តិចទៀត។',
          'Food photo recognition is temporarily unavailable right now. Please type the dish name or try again shortly.',
          '美食照片识别服务暂时无法连接，请直接输入菜名或稍后重试。'
        )
      : tr(
          language,
          'សេវាឆ្លើយតបកំពុងរវល់បណ្តោះអាសន្ន។ សូមព្យាយាមម្តងទៀតបន្តិចទៀត។',
          'The assistant is temporarily busy. Please try again shortly.',
          '助手服务暂时繁忙，请稍后重试。'
        );
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'clarification',
      source: 'notice',
      suppressDishCard: true,
      failureReason: 'unavailable',
      text: publicText,
      followUpChips: foodAssistantStarterChips(language),
    };
  }

  const imageNeedsAi = hasImage
    ? tr(
        language,
        '\n\nការស្គាល់រូបភាពម្ហូបត្រូវការ AI ដែលភ្ជាប់បាន។ ខ្ញុំនឹងមិនទាយឈ្មោះម្ហូបខុសៗទេ។ សូមវាយឈ្មោះម្ហូបជាអក្សរ ឬព្យាយាមម្តងទៀត។',
        '\n\nRecognising a food photo needs the AI connection. I will not guess a dish name. Please type the dish name or try again.',
        '\n\n识别美食照片需要 AI 连接。我不会随意猜测菜名。请直接输入菜名或稍后重试。'
      )
    : '';
  const reasonText: Record<FoodAssistantFailure, string> = {
    no_key: tr(
      language,
      'ជំនួយការ AI មិនទាន់បានតភ្ជាប់ទេ (មិនទាន់មាន Gemini API Key)។ សូមឱ្យអ្នកគ្រប់គ្រងបិទភ្ជាប់សោក្នុង Admin → ទិដ្ឋភាពទូទៅ → ប្រអប់ទី ៤ (Gemini AI API Key)។',
      'The AI assistant is not connected yet (no Gemini API key). Ask the admin to paste it in Admin → Overview → Box 4 (Gemini AI API Key).',
      'AI 助手尚未连接（未配置 Gemini API Key）。请联系管理员在后台“概览”第 4 个框（Gemini AI API Key）中填写。'
    ),
    network: tr(
      language,
      'មិនអាចភ្ជាប់អ៊ីនធឺណិតទៅ AI បានទេ។ សូមពិនិត្យអ៊ីនធឺណិត រួចព្យាយាមម្តងទៀត។',
      'Couldn’t reach the AI service. Please check your internet connection and try again.',
      '无法连接 AI 服务，请检查网络后重试。'
    ),
    timeout: tr(
      language,
      'AI ឆ្លើយយឺតពេក។ សូមព្យាយាមម្តងទៀត។',
      'The AI took too long to answer. Please try again.',
      'AI 响应超时，请重试。'
    ),
    auth: tr(
      language,
      'Gemini API Key មិនត្រឹមត្រូវ ឬផុតកំណត់។ សូមបង្កើតសោថ្មីពី Google AI Studio (aistudio.google.com/app/apikey) រួចបិទភ្ជាប់នៅខាងក្រោម ឬក្នុង Admin → ទិដ្ឋភាពទូទៅ → ប្រអប់ទី ៤។',
      'The Gemini API key is invalid or expired. Create a new key in Google AI Studio (aistudio.google.com/app/apikey) and paste it below or in Admin → Overview → Box 4.',
      'Gemini API Key 无效或已过期。请在 Google AI Studio (aistudio.google.com/app/apikey) 创建新密钥并粘贴到下方或后台“概览”第 4 框。'
    ),
    quota: tr(
      language,
      'ដែនកំណត់ប្រើប្រាស់ AI ថ្ងៃនេះពេញហើយ។ សូមព្យាយាមម្តងទៀតបន្តិចក្រោយ។',
      'The AI usage limit has been reached for now. Please try again in a little while.',
      'AI 使用额度暂时已满，请稍后再试。'
    ),
    blocked: tr(
      language,
      'AI មិនអាចវិភាគមាតិកានេះបានទេ។ សូមសាកល្បងរូបភាព ឬសំណួរផ្សេង។',
      'The AI could not process this content. Please try a different photo or question.',
      'AI 无法处理该内容，请换一张图片或换个问题。'
    ),
    bad_response: tr(
      language,
      'AI ឆ្លើយមិនបានត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត។',
      'The AI returned an unusable answer. Please try again.',
      'AI 返回的结果无法使用，请重试。'
    ),
    unavailable: tr(
      language,
      'សេវា AI មិនអាចប្រើបានបណ្តោះអាសន្ន។ សូមព្យាយាមម្តងទៀត។',
      'The AI service is temporarily unavailable. Please try again.',
      'AI 服务暂时不可用，请稍后重试。'
    ),
  };
  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    timestamp: new Date().toISOString(),
    intent: 'clarification',
    source: 'notice',
    suppressDishCard: true,
    failureReason: reason,
    text: `${reasonText[reason]}${imageNeedsAi}`,
    followUpChips: foodAssistantStarterChips(language),
  };
}
