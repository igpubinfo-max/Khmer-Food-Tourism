/* Food assistant audit tests - run: npm run test:food-ai  (loads TS through Vite SSR; never touches the real network) */
const { createServer } = require(require.resolve('vite', { paths: [process.cwd()] }));

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, extra) {
  if (cond) {
    pass++;
    console.log('  ✓', name);
  } else {
    fail++;
    failures.push(name);
    console.log('  ✗ FAIL:', name, extra !== undefined ? '=> ' + JSON.stringify(extra) : '');
  }
}
function section(t) {
  console.log('\n' + t);
}

(async () => {
  const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    const { initial200Foods: foods } = await server.ssrLoadModule('/src/data/seedFoods.ts');
    const cls = await server.ssrLoadModule('/src/utils/foodQueryClassifier.ts');
    const brain = await server.ssrLoadModule('/src/services/aiFoodBrain.ts');
    const conv = await server.ssrLoadModule('/src/services/conversationalAiAssistant.ts');
    const llm = await server.ssrLoadModule('/src/services/foodAssistantLlm.ts');
    const api = await server.ssrLoadModule('/src/utils/universalDishOpenApi.ts');
    const rich = await server.ssrLoadModule('/src/components/RichAnswerText.tsx');
    const up = await server.ssrLoadModule('/src/utils/foodImageUpload.ts');
    const gen = await server.ssrLoadModule('/src/utils/generatedDish.ts');

    const memory = { lastDishes: [], lastRestaurants: [], lastDestinations: [], activeProvinceKh: '', lastQuery: '', turnSeed: 1 };
    const rules = (q, lang = 'km') =>
      conv.generateConversationalAiResponse({ userInput: q, language: lang, foods, restaurants: [], destinations: [], canUseVip: true, memory });

    /* ------------------------------------------------------------------ */
    section('1. Screenshot bug: criteria sentence is NOT a dish name');
    const BUG = 'សម្លដែលមានជាតិស្ករតិច';
    ok(cls.isQuestionOrCriteriaQuery(BUG), 'classifier flags the screenshot query as criteria/question');
    ok(conv.detectOutOfCatalogDishName(BUG, foods) === null, 'detectOutOfCatalogDishName -> null (no fake dish)');
    const r1 = rules(BUG).reply;
    ok(!String(r1.recipePreview?.food?.id || '').startsWith('custom-recipe-'), 'no custom-recipe card created');
    ok(!(r1.dishes || []).some((d) => String(d.id).startsWith('custom-recipe-')), 'no generated dish in reply');
    ok(r1.intent === 'food_discovery', 'handled as criteria discovery', r1.intent);
    const soups = r1.dishes || [];
    ok(soups.length > 0 && soups.every((d) => /សម្ល|ស្ងោរ|ស៊ុប|ម្ជូរ|ប្រហើរ|កកូរ|ការី/.test(d.nameKh) && !/^បាយ|^គុយទាវ|^មី/.test(d.nameKh)), 'only samlor/soup dishes returned (no noodles/amok/rice)', soups.map((d) => d.nameKh));
    const sugarRe = /ស្ករ|ទឹកឃ្មុំ|ទឹកដោះគោខាប់|sugar|honey|syrup|condensed/i;
    ok(soups.every((d) => !sugarRe.test((d.ingredients || []).map((i) => i.nameKh + ' ' + i.nameEn).join(' '))), 'no returned soup lists sugar as an ingredient');
    ok(/ស្ករ/.test(r1.text) && /ទេ|ផ្អែកលើ/.test(r1.text), 'answer explains the criteria honestly (Khmer)', r1.text.slice(0, 120));
    ok(r1.text.includes('health advice') || r1.text.includes('ដំបូន្មានសុខភាព'), 'states it is not health advice');
    const r1en = rules('soups that are low in sugar', 'en').reply;
    ok(r1en.intent === 'food_discovery' && (r1en.dishes || []).length > 0, 'English "soups that are low in sugar" also handled', r1en.intent);
    const r1zh = rules('低糖的汤', 'zh').reply;
    ok((r1zh.dishes || []).length > 0, 'Chinese "低糖的汤" also handled');

    /* ------------------------------------------------------------------ */
    section('2. Real dish names still work; sentences do not become dishes');
    ok(conv.detectOutOfCatalogDishName('ប្រហុកចំហុយ', foods) === 'ប្រហុកចំហុយ', 'ប្រហុកចំហុយ -> dish');
    ok(conv.detectOutOfCatalogDishName('ងាវអាំង', foods) === 'ងាវអាំង', 'ងាវអាំង -> dish');
    ok(conv.detectOutOfCatalogDishName('Pad Thai', foods) === 'Pad Thai', 'Pad Thai -> dish');
    ok(conv.detectOutOfCatalogDishName('How long can amok stay in the fridge?', foods) === null, 'storage question -> not a dish');
    ok(conv.detectOutOfCatalogDishName('តើអាម៉ុកមានកាឡូរីប៉ុន្មាន?', foods) === null, 'Khmer calorie question -> not a dish');
    ok(conv.detectOutOfCatalogDishName('什么汤热量比较低？', foods) === null, 'Chinese question -> not a dish');
    ok(conv.detectOutOfCatalogDishName('ប្រៀបធៀបអាម៉ុក និងការី', foods) === null, 'comparison -> not a dish');
    for (const q of ['មីឆាសាច់គោ', 'បុកមីកញ្ចប់', 'មីសួរសាច់មាន់', 'ឆាក្តៅអន្ទង់', 'ញាំម្កាក់ត្រីឆ្អើរ']) {
      const rr = rules(q).reply;
      ok((rr.dishes || [])[0] && foods.some((f) => f.id === rr.dishes[0].id), `catalog dish "${q}" resolves to a REAL catalog dish`, rr.dishes?.[0]?.nameKh);
    }

    /* ------------------------------------------------------------------ */
    section('3. Out-of-catalog dish card never borrows another dish');
    const custom = conv.createOutOfCatalogDishItem('ផាត់ថៃ', foods);
    ok(custom.photoUrl === '' || /^https?:/.test(custom.photoUrl), 'custom dish has no catalog photo', custom.photoUrl);
    ok(custom.rating === 0 && custom.reviewCount === 0, 'no invented rating');
    ok(custom.calories === undefined, 'no invented calories');
    ok(!custom.provinceKh, 'no borrowed province');
    ok(gen.foodPhotoSrc(custom).startsWith('data:image/svg'), 'UI shows neutral placeholder for generated dish without verified photo');
    ok(gen.foodPhotoSrc(foods[0]).includes('/foods/'), 'catalog dish keeps its own photo');

    /* ------------------------------------------------------------------ */
    section('4. No-match is honest (no random popular dishes)');
    const r4 = rules('zzqxv').reply;
    ok(r4.needsClarification === true || r4.intent === 'clarification' || (r4.dishes || []).some((d) => String(d.id).startsWith('custom-recipe-')), 'unknown word does not return random catalog dishes', r4.intent);
    ok(!((r4.dishes || []).some((d) => foods.some((f) => f.id === d.id)) && !(r4.dishes || []).some((d) => String(d.id).startsWith('custom-recipe-'))), 'no unrelated catalog dishes padded in');
    const broad = rules('ម្ហូបឆ្ងាញ់').reply;
    ok((broad.dishes || []).length > 0, 'broad request ("ម្ហូបឆ្ងាញ់") still gets suggestions');

    /* ------------------------------------------------------------------ */
    section('5. Tourism requests: food-only redirect');
    const t5 = rules('ណែនាំកន្លែងដើរលេងសៀមរាប').reply;
    ok((t5.destinations || []).length === 0, 'no tourist attractions recommended');
    ok(/ឯកទេសតែលើម្ហូប/.test(t5.text), 'polite food-only redirect', t5.text.slice(0, 80));

    /* ------------------------------------------------------------------ */
    section('6. Fact questions (offline engine) are honest, not dish cards');
    const r6 = rules('How long can leftover soup stay in the fridge?', 'en').reply;
    ok(r6.intent === 'general_food_qa' && r6.suppressDishCard === true, 'storage question -> general_food_qa, no dish card', r6.intent);
    ok(/AI/.test(r6.text) && /guess/i.test(r6.text), 'says live AI is needed instead of guessing');
    const r6b = rules('តើអាម៉ុកត្រីមានកាឡូរីប៉ុន្មាន?').reply;
    ok(r6b.intent === 'general_food_qa' && /kcal/.test(r6b.text), 'calorie question answered from catalog facts', r6b.text.slice(0, 80));

    /* ------------------------------------------------------------------ */
    section('7. Medical boundary: false positives fixed, real medical still refused');
    const notMedical = ['ឆាថ្លើមជ្រូក', 'របៀបធ្វើថ្លើមជ្រូកឆា', 'pork liver stir fry recipe', 'how to cook beef kidney soup', 'salt-cured pork belly', 'sweet treats for dessert', 'which dishes contain peanuts? I have a peanut allergy', 'how much cholesterol is in an egg', '猪肝炒法', 'រក្សាទុកសាច់ជ្រូកអំបិល'];
    for (const q of notMedical) ok(!brain.isMedicalOrHealthQuery(q), `allowed: ${q}`);
    const medical = ['ញ៉ាំអីល្អសម្រាប់ជំងឺទឹកនោមផ្អែម', 'what to eat to cure diabetes', 'ឈឺថ្លើមគួរញ៉ាំអី', 'fatty liver diet', 'foods that treat high blood pressure', '糖尿病吃什么好', 'best food for stomach ache', 'I have a fever what should I eat', 'which food heals cancer', 'ក្អួតចង្អោរ ញ៉ាំអីបាន'];
    for (const q of medical) ok(brain.isMedicalOrHealthQuery(q), `refused: ${q}`);

    /* ------------------------------------------------------------------ */
    section('8. Language detection (consistent Khmer / English / Chinese)');
    ok(cls.detectReplyLanguage('របៀបធ្វើអាម៉ុក', 'en') === 'km', 'Khmer text -> km even if UI is English');
    ok(cls.detectReplyLanguage('How do I make amok?', 'km') === 'en', 'English text -> en even if UI is Khmer');
    ok(cls.detectReplyLanguage('怎么做阿莫克？', 'km') === 'zh', 'Chinese text -> zh');
    ok(cls.detectReplyLanguage('How to make ប្រហុកចំហុយ', 'km') === 'en', 'English sentence with a Khmer dish name -> en');
    ok(cls.detectReplyLanguage('', 'zh') === 'zh', 'empty -> UI language');

    /* ------------------------------------------------------------------ */
    section('9. LLM request building (system prompt, history, vision, schema)');
    const history = [
      { role: 'user', text: 'ប្រហុកចំហុយធ្វើម៉េច' },
      { role: 'assistant', text: 'នេះជារូបមន្ត...', dishNames: ['ប្រហុកចំហុយ'] },
    ];
    const img = { mimeType: 'image/jpeg', base64: 'QUJD', previewDataUrl: 'data:image/jpeg;base64,QUJD' };
    const body = llm.buildGeminiRequestBody({ userText: 'what is this?', uiLanguage: 'km', foods, restaurants: [], history, memory, image: img, model: 'gemini-2.5-flash' });
    const sys = body.systemInstruction.parts[0].text;
    ok(sys.includes('EXCLUSIVELY to FOOD') && sys.includes('MEDICAL BOUNDARY') && sys.includes('IMAGE RULES'), 'system prompt has scope, medical and image rules');
    ok(sys.includes('food-40|មីឆាសាច់គោ|'), 'system prompt carries the verified catalog index (updated names)');
    ok(sys.includes('If confidence < 0.6') || sys.includes('confidence < 0.6'), 'confidence threshold stated in prompt');
    ok(body.contents[0].role === 'user' && body.contents[body.contents.length - 1].role === 'user', 'contents start and end with a user turn');
    ok(body.contents.length >= 2, 'conversation history is sent (multi-turn)', body.contents.length);
    const lastParts = body.contents[body.contents.length - 1].parts;
    ok(lastParts[0].inlineData && lastParts[0].inlineData.data === 'QUJD' && lastParts[0].inlineData.mimeType === 'image/jpeg', 'image is sent first as inlineData');
    ok(JSON.stringify(lastParts).includes('REPLY_LANGUAGE: English'), 'reply language follows the USER message (English)');
    ok(body.generationConfig.responseMimeType === 'application/json' && body.generationConfig.responseSchema, 'JSON schema requested');
    ok(body.generationConfig.maxOutputTokens >= 4096, 'enough output tokens (old limit 750 truncated answers)', body.generationConfig.maxOutputTokens);
    ok(body.generationConfig.thinkingConfig && body.generationConfig.thinkingConfig.thinkingBudget > 0, 'thinking budget enabled for 2.5 models');
    const lvl2 = llm.buildGeminiRequestBody({ userText: 'x', uiLanguage: 'en', foods, restaurants: [], history: [], image: null, model: 'gemini-1.5-flash', level: 2 });
    ok(!lvl2.generationConfig.responseSchema && !lvl2.generationConfig.thinkingConfig, 'degraded request drops schema/thinking');
    const alt = llm.buildGeminiRequestBody({ userText: 'a', uiLanguage: 'en', foods, restaurants: [], history: [{ role: 'assistant', text: 'hi' }, { role: 'user', text: 'u1' }, { role: 'user', text: 'u2' }], image: null, model: 'gemini-2.5-flash' });
    ok(alt.contents[0].role === 'user', 'leading assistant turn dropped');
    ok(alt.contents.every((c, i, arr) => i === 0 || c.role !== arr[i - 1].role), 'roles alternate (no consecutive same-role turns)');

    /* ------------------------------------------------------------------ */
    section('10. Interpretation: confidence gate, catalog ids validated, boundaries');
    const ctxBase = { foods, restaurants: [], uiLanguage: 'km', replyLanguage: 'km', hasImage: true, imagePreviewUrl: 'data:image/jpeg;base64,QUJD', model: 'test' };
    const amok = foods.find((f) => /អាម៉ុក/.test(f.nameKh));
    const lowConf = llm.interpretAssistantPayload(
      { domain: 'food', intent: 'identify_image', answer: 'តើវាមានទឹកស៊ុប ឬស្ងួត?', needsClarification: true,
        imageAnalysis: { containsFood: true, confidence: 0.42, dishNameLocal: 'អាម៉ុក?', alternatives: [{ name: 'អាម៉ុកត្រី', confidence: 0.4 }, { name: 'ការីត្រី', confidence: 0.3 }], visibleIngredients: ['ស្លឹកចេក'], evidence: 'steamed in banana leaf', catalogDishId: amok.id },
        catalogDishIds: [amok.id] }, ctxBase);
    ok(lowConf.needsClarification === true, 'low confidence -> needsClarification');
    ok(!lowConf.dishes && lowConf.suppressDishCard === true, 'low confidence -> NO dish card, NO photo', lowConf.dishes?.map((d) => d.nameKh));
    ok(lowConf.imageAnalysis.identified === false, 'imageAnalysis.identified=false');
    ok(lowConf.followUpChips && lowConf.followUpChips.some((c) => c.id.startsWith('alt_')), 'clarification chips offered from alternatives');
    const sneaky = llm.interpretAssistantPayload(
      { domain: 'food', intent: 'identify_image', answer: 'នេះគឺអាម៉ុក', needsClarification: false,
        imageAnalysis: { containsFood: true, confidence: 0.35, dishNameLocal: 'អាម៉ុក', catalogDishId: amok.id }, catalogDishIds: [amok.id] }, ctxBase);
    ok(sneaky.needsClarification === true && !sneaky.dishes, 'model claiming a dish with low confidence is overridden in code');
    const good = llm.interpretAssistantPayload(
      { domain: 'food', intent: 'identify_image', answer: 'នេះគឺ **' + amok.nameKh + '**', needsClarification: false,
        imageAnalysis: { containsFood: true, confidence: 0.93, dishNameLocal: amok.nameKh, dishNameEnglish: amok.nameEn, catalogDishId: amok.id, visibleIngredients: ['fish', 'banana leaf'] }, catalogDishIds: [amok.id] }, ctxBase);
    ok(good.dishes && good.dishes.length === 1 && good.dishes[0].id === amok.id, 'high confidence + valid id -> exact catalog dish card');
    ok(good.imageAnalysis.identified === true && !good.needsClarification, 'identified=true');
    const fakeId = llm.interpretAssistantPayload(
      { domain: 'food', intent: 'identify_image', answer: 'x', needsClarification: false,
        imageAnalysis: { containsFood: true, confidence: 0.95, dishNameLocal: 'Pizza', catalogDishId: 'food-99999' }, catalogDishIds: ['food-99999', 'hallucinated'] }, ctxBase);
    ok(!fakeId.dishes, 'hallucinated catalog ids are discarded');
    const noFood = llm.interpretAssistantPayload(
      { domain: 'food', intent: 'identify_image', answer: 'មិនមានម្ហូបទេ', needsClarification: false, imageAnalysis: { containsFood: false, confidence: 0.9 } }, ctxBase);
    ok(noFood.imageAnalysis.containsFood === false && !noFood.dishes && noFood.imageAnalysis.confidence === 0, 'no food in photo -> no dish, confidence 0');
    const skipped = llm.interpretAssistantPayload({ domain: 'food', intent: 'general_food_qa', answer: 'It is pizza', needsClarification: false }, ctxBase);
    ok(skipped.needsClarification === true, 'photo answer without mandatory analysis block is not trusted');
    const textCtx = { ...ctxBase, hasImage: false, imagePreviewUrl: undefined };
    const rec = llm.interpretAssistantPayload(
      { domain: 'food', intent: 'recipe', answer: 'រូបមន្តផាត់ថៃ', needsClarification: false,
        recipe: { dishName: 'ផាត់ថៃ', englishName: 'Pad Thai', servings: '2', totalTime: '30 នាទី', ingredients: [{ name: 'គុយទាវស្ងួត', amount: '200 ក្រាម' }], steps: ['ត្រាំគុយទាវ', 'ឆា'] }, catalogDishIds: [] }, textCtx);
    ok(rec.recipePreview && rec.recipePreview.food.id.startsWith('ai-dish-'), 'AI recipe for non-catalog dish uses ai-dish- id');
    ok(rec.recipePreview.food.photoUrl === '' && rec.recipePreview.food.rating === 0, 'AI dish has no borrowed photo / rating');
    const recCat = llm.interpretAssistantPayload(
      { domain: 'food', intent: 'recipe', answer: 'រូបមន្ត', needsClarification: false, recipe: { dishName: amok.nameKh, ingredients: [{ name: 'x' }], steps: ['y'] }, catalogDishIds: [amok.id] }, textCtx);
    ok(recCat.recipePreview.food.id === amok.id && recCat.recipePreview.steps.length > 0 && recCat.recipePreview.steps[0].instruction !== 'y', 'catalog dish recipe comes from the verified catalog, not the model');
    const medical1 = llm.interpretAssistantPayload({ domain: 'medical_advice', intent: 'general_food_qa', answer: 'eat X', needsClarification: false }, textCtx);
    ok(medical1.isScopeRefusal && medical1.intent === 'medical_scope_refusal' && !/eat X/.test(medical1.text), 'medical_advice -> fixed safe notice (model text discarded)');
    const claim = llm.interpretAssistantPayload({ domain: 'food', intent: 'general_food_qa', answer: 'Bitter melon cures diabetes.', needsClarification: false }, textCtx);
    ok(claim.isScopeRefusal === true, 'disease-cure claim slipped into a food answer is blocked in code');
    const claimKh = llm.interpretAssistantPayload({ domain: 'food', intent: 'general_food_qa', answer: 'ម្ជូរនេះព្យាបាលជំងឺក្រពះបាន', needsClarification: false }, textCtx);
    ok(claimKh.isScopeRefusal === true, 'Khmer cure claim blocked');
    const off = llm.interpretAssistantPayload({ domain: 'off_topic', intent: 'off_topic', answer: 'I only talk about food.', needsClarification: false }, textCtx);
    ok(off.isScopeRefusal && off.text === 'I only talk about food.' && off.suppressDishCard, 'off-topic -> short redirect, no cards');
    const thai = llm.interpretAssistantPayload({ domain: 'food', intent: 'general_food_qa', answer: 'ផាត់ថៃ ผัดไทย ឆ្ងាញ់', needsClarification: false }, textCtx);
    ok(!/[\u0E00-\u0E7F]/.test(thai.text), 'Thai script stripped from Khmer answers (app policy)');
    ok(llm.containsMedicalClaim('this heals cancer') && !llm.containsMedicalClaim('Amok is steamed fish custard.'), 'containsMedicalClaim sanity');

    /* ------------------------------------------------------------------ */
    section('11. askFoodAssistant with a mocked transport');
    const calls = [];
    const mk = (obj) => ({ ok: true, text: JSON.stringify(obj) });
    const okPayload = { domain: 'food', intent: 'storage_safety', answer: 'Keep soup 3-4 days at ≤4°C.', needsClarification: false, followUps: ['Can I freeze it?'] };
    const base = { uiLanguage: 'en', foods, restaurants: [], history: [], memory, geminiApiKey: 'TEST' };
    const t1 = await llm.askFoodAssistant({ ...base, userText: 'How long does leftover soup keep?', transport: async (m, b) => { calls.push([m, b.generationConfig]); return mk(okPayload); } });
    ok(t1.ok && t1.message.text.includes('3-4 days') && t1.message.isLiveGemini && t1.message.source === 'llm', 'success returns validated message');
    ok(!t1.message.dishes && t1.message.suppressDishCard, 'fact answer shows no random dish card');
    ok(t1.message.followUpChips && t1.message.followUpChips[0].query === 'Can I freeze it?', 'follow-up chips from model');
    ok(calls.length === 1 && calls[0][0] === 'gemini-3.5-flash-lite', 'single call to the primary model');

    const lv = [];
    const t2 = await llm.askFoodAssistant({ ...base, userText: 'hello food', transport: async (m, b) => { lv.push(Boolean(b.generationConfig.responseSchema) + ':' + Boolean(b.generationConfig.thinkingConfig)); return lv.length < 3 ? { ok: false, kind: 'bad_request', status: 400, message: 'schema not supported' } : mk(okPayload); } });
    ok(t2.ok && lv.join('|') === 'true:true|true:false|false:false', 'HTTP 400 degrades thinking -> schema -> plain JSON on the same model', lv);

    const t3 = await llm.askFoodAssistant({ ...base, userText: 'hi', transport: async () => ({ ok: false, kind: 'auth', status: 403, message: 'API key not valid' }) });
    ok(!t3.ok && t3.reason === 'auth', 'invalid key -> typed auth failure (no endless retries)');
    const t4 = await llm.askFoodAssistant({ ...base, userText: 'hi', transport: async () => ({ ok: false, kind: 'quota', status: 429 }) });
    ok(!t4.ok && t4.reason === 'quota', 'quota error reported');
    const t5b = await llm.askFoodAssistant({ ...base, userText: 'hi', transport: async () => ({ ok: false, kind: 'network', message: 'offline' }) });
    ok(!t5b.ok && t5b.reason === 'network', 'network error reported');
    const t6 = await llm.askFoodAssistant({ ...base, userText: 'hi', transport: async () => ({ ok: true, text: 'not json at all' }) });
    ok(!t6.ok && t6.reason === 'bad_response', 'garbage output -> bad_response (never shown as an answer)');
    const t7calls = [];
    const t7 = await llm.askFoodAssistant({ ...base, uiLanguage: 'km', userText: 'ញ៉ាំអីល្អសម្រាប់ជំងឺទឹកនោមផ្អែម', transport: async (m) => { t7calls.push(m); return mk(okPayload); } });
    ok(t7.ok && t7.message.isScopeRefusal && t7calls.length === 0, 'medical request is refused BEFORE any network call');
    // NOTE: resolveGeminiApiKey() falls back to the embedded Google Maps key, so a true "no key" path cannot be unit-tested
    // without touching the network. The honest-notice text for it is checked below instead.
    const noKeyMsg = llm.buildAssistantFailureMessage('no_key', 'en', false);
    ok(noKeyMsg.suppressDishCard && /not connected|API key/i.test(noKeyMsg.text), 'no_key notice is honest and shows no dish');
    ok(conv.detectProvinceFromText('តើអាម៉ុកមានកាឡូរីប៉ុន្មាន') === null, 'calorie word "កាឡូរី" no longer triggers Battambang');
    ok(conv.detectProvinceFromText('ម្ហូបបាត់ដំបង')?.en === 'Battambang', 'real Battambang mention still detected');

    const esc = [];
    const photoPayload = (conf, withAlt) => ({ domain: 'food', intent: 'identify_image', answer: 'Looks like a curry?', needsClarification: false,
      imageAnalysis: { containsFood: true, confidence: conf, dishNameLocal: 'Khmer red curry', alternatives: withAlt ? [{ name: 'Fish amok', confidence: 0.3 }] : [] } });
    const t9 = await llm.askFoodAssistant({ ...base, userText: '', image: img, transport: async (m) => { esc.push(m); return mk(photoPayload(m === 'gemini-3.8-flash' ? 0.88 : 0.45, true)); } });
    ok(esc.join(',') === 'gemini-3.5-flash-lite,gemini-3.8-flash', 'uncertain photo is re-examined once by the stronger model', esc);
    ok(t9.ok && t9.model === 'gemini-3.8-flash' && t9.message.imageAnalysis.identified === true, 'stronger model result adopted when it is more confident');
    const esc2 = [];
    const t10 = await llm.askFoodAssistant({ ...base, userText: '', image: img, transport: async (m) => { esc2.push(m); return mk(photoPayload(0.3, true)); } });
    ok(t10.ok && t10.message.needsClarification === true && !t10.message.dishes, 'still uncertain after second opinion -> ASK the user, show nothing');
    const esc3 = [];
    await llm.askFoodAssistant({ ...base, userText: '', image: img, transport: async (m) => { esc3.push(m); return mk(photoPayload(0.9, false)); } });
    ok(esc3.length === 1, 'confident photo needs only one call');

    const failMsg = llm.buildAssistantFailureMessage('no_key', 'km', true);
    ok(failMsg.suppressDishCard && /មិនទាយ|ទាយ/.test(failMsg.text), 'photo + no AI -> honest "I will not guess" message');

    /* ------------------------------------------------------------------ */
    section('12. Photo lookup relevance (Open API)');
    ok(!api.isTitleRelevantToDish('low sugar soup', 'Sugar'), 'generic "Sugar" page rejected for "low sugar soup"');
    ok(!api.isTitleRelevantToDish('low sugar soup', 'Egg tart', 'sweet pastry'), 'unrelated pastry rejected');
    ok(api.isTitleRelevantToDish('Fish amok', 'Amok trey'), 'Fish amok -> "Amok trey" accepted');
    ok(api.isTitleRelevantToDish('Grilled blood cockles', 'Blood cockle'), 'blood cockle accepted');
    ok(!api.isTitleRelevantToDish('Grilled blood cockles', 'Steam locomotive'), 'locomotive rejected');
    ok(api.isTitleRelevantToDish('Spaghetti Bolognese', 'Spaghetti alla Bolognese'), 'spaghetti bolognese accepted');
    ok(!api.isTitleRelevantToDish('fish soup', 'Fish'), 'all-generic query needs all words');
    ok(api.isTitleRelevantToDish('fish soup', 'Fish soup'), 'all-generic query accepted when all words present');
    ok((await api.fetchUniversalDishPhotoFromOpenApis(BUG)) === null, 'photo lookup for a sentence returns null immediately (no network)');

    /* ------------------------------------------------------------------ */
    section('13. Rich text + image helpers');
    const blocks = rich.parseAnswerBlocks('## Title\nIntro **bold**\n- a\n- b\n1. one\n2. two\n\nend');
    ok(blocks.map((b) => b.kind).join(',') === 'h,p,ul,ol,p', 'markdown blocks parsed', blocks.map((b) => b.kind));
    ok(blocks[2].items.length === 2 && blocks[3].items.length === 2, 'list items grouped');
    const sz = up.computeScaledSize(4000, 3000, 1280);
    ok(sz.width === 1280 && sz.height === 960, 'image downscaled keeping aspect ratio', sz);
    const sz2 = up.computeScaledSize(800, 600, 1280);
    ok(sz2.width === 800 && sz2.height === 600, 'small image never upscaled');
    const React = require(require.resolve('react', { paths: [process.cwd()] }));
    const { renderToStaticMarkup } = require(require.resolve('react-dom/server', { paths: [process.cwd()] }));
    const html = renderToStaticMarkup(React.createElement(rich.RichAnswerText, { text: '**Hi** <script>alert(1)</script>\n- a\n1. b' }));
    ok(html.includes('<strong') && !html.includes('<script>') && html.includes('<li>'), 'RichAnswerText renders markdown and escapes HTML', html);
    ok(gen.isGeneratedDishId('ai-dish-x') && gen.isGeneratedDishId('custom-recipe-x') && !gen.isGeneratedDishId('food-1'), 'generated-dish id detection');

    /* ------------------------------------------------------------------ */
    section('14. History conversion');
    const turns = llm.toHistoryTurns([
      { id: 'ai-welcome', role: 'assistant', text: 'welcome', timestamp: '' },
      { id: 'u1', role: 'user', text: 'amok?', timestamp: '', imagePreviewUrl: 'data:x' },
      { id: 'p', role: 'assistant', text: '', timestamp: '', isPending: true },
      { id: 'a1', role: 'assistant', text: 'It is amok', timestamp: '', dishes: [amok] },
    ]);
    ok(turns.length === 2 && turns[0].hadImage === true && turns[1].dishNames[0] === amok.nameKh, 'welcome/pending dropped; photo + shown dishes remembered', turns);

    /* ------------------------------------------------------------------ */
    section('15. Edge-function request hardening (supabase/functions/food-ai/sanitize.ts)');
    const san = await server.ssrLoadModule('/supabase/functions/food-ai/sanitize.ts');
    const goodBody = llm.buildGeminiRequestBody({ userText: 'what is this?', uiLanguage: 'km', foods, restaurants: [], history, memory, image: img, model: 'gemini-2.5-flash' });
    const sOk = san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: goodBody });
    ok(sOk.ok === true, 'the exact request the app builds passes the proxy whitelist', sOk);
    ok(sOk.ok && sOk.body.contents.at(-1).parts[0].inlineData.data === 'QUJD', 'image survives sanitising');
    ok(sOk.ok && sOk.body.generationConfig.responseSchema && sOk.body.generationConfig.thinkingConfig.thinkingBudget === 1536, 'schema + thinking budget survive');
    ok(!san.sanitizeGeminiRequest({ model: 'gemini-1.0-ultra', body: goodBody }).ok, 'unknown model rejected');
    ok(!san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: { ...goodBody, tools: [{ googleSearch: {} }] } }).ok === false && !('tools' in san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: { ...goodBody, tools: [{ googleSearch: {} }], safetySettings: [], cachedContent: 'x' } }).body), 'tools / safetySettings / cachedContent are dropped (proxy is not an open relay)');
    ok(!san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: { contents: [{ role: 'user', parts: [{ fileData: { fileUri: 'gs://x' } }] }] } }).ok, 'fileData parts rejected');
    ok(!san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: { contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: 'QUJD' } }] }] } }).ok, 'non-image inlineData rejected');
    ok(!san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: { contents: [{ role: 'system', parts: [{ text: 'x' }] }] } }).ok, 'bad role rejected');
    const manyImgs = { contents: [{ role: 'user', parts: [1, 2, 3].map(() => ({ inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } })) }] };
    ok(!san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: manyImgs }).ok, 'more than 2 images rejected');
    const huge = san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: { contents: [{ role: 'user', parts: [{ text: 'a'.repeat(160000) }] }] } });
    ok(!huge.ok && huge.status === 413, 'oversized text -> 413');
    const clamped = san.sanitizeGeminiRequest({ model: 'gemini-2.5-flash', body: { contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 999999, temperature: 7, thinkingConfig: { thinkingBudget: 99999 }, responseMimeType: 'text/x-evil' } } });
    ok(clamped.ok && clamped.body.generationConfig.maxOutputTokens === 8192 && clamped.body.generationConfig.temperature === 1 && clamped.body.generationConfig.thinkingConfig.thinkingBudget === 4096 && !('responseMimeType' in clamped.body.generationConfig), 'generationConfig values are clamped / whitelisted');
    const lim = new san.SlidingWindowLimiter(3, 1000);
    ok([0, 1, 2].every((i) => lim.allow('ip', 100 + i)) && lim.allow('ip', 200) === false && lim.allow('other', 200) && lim.allow('ip', 1200), 'rate limiter blocks the 4th call per window, per client, then recovers');

    /* ------------------------------------------------------------------ */
    section('16. Client transport: proxy first, direct key only as fallback (mocked fetch)');
    const realFetch = globalThis.fetch;
    const calledUrls = [];
    const geminiOk = (obj) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] }, finishReason: 'STOP' }] });
    const mkResp = (status, data, proxy) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => (proxy && k.toLowerCase() === 'x-food-ai-proxy' ? '1' : null) }, json: async () => data });
    const payload = { domain: 'food', intent: 'general_food_qa', answer: 'Via proxy OK', needsClarification: false };
    const t16 = { uiLanguage: 'en', foods, restaurants: [], history: [], memory, userText: 'hello', geminiApiKey: 'LOCALKEY' };
    try {
      // (a) proxy answers -> direct Google endpoint never contacted, key never sent
      llm.resetFoodAiProxyState();
      globalThis.fetch = async (url, init) => { calledUrls.push([String(url), init.headers && (init.headers.Authorization || '')]); return mkResp(200, geminiOk(payload), true); };
      const pa = await llm.askFoodAssistant(t16);
      ok(pa.ok && pa.message.text === 'Via proxy OK', 'proxy answer is used');
      ok(calledUrls.length === 1 && /\/functions\/v1\/food-ai$/.test(calledUrls[0][0]), 'only the proxy was called', calledUrls.map((c) => c[0]));
      ok(!JSON.stringify(calledUrls).includes('LOCALKEY') && !calledUrls.some((c) => /generativelanguage/.test(c[0])), 'device key is NOT sent anywhere when the proxy works');

      // (b) proxy not deployed (gateway 404, no stamp) -> direct fallback, proxy skipped afterwards
      llm.resetFoodAiProxyState();
      calledUrls.length = 0;
      globalThis.fetch = async (url) => { calledUrls.push([String(url)]); return /food-ai/.test(String(url)) ? mkResp(404, { message: 'Function not found' }, false) : mkResp(200, geminiOk(payload), false); };
      const pb = await llm.askFoodAssistant(t16);
      ok(pb.ok, 'falls back to the direct key when the proxy is not deployed');
      ok(calledUrls.length === 2 && /food-ai/.test(calledUrls[0][0]) && /generativelanguage/.test(calledUrls[1][0]), 'order: proxy then direct', calledUrls.map((c) => c[0]));
      calledUrls.length = 0;
      await llm.askFoodAssistant(t16);
      ok(calledUrls.length === 1 && /generativelanguage/.test(calledUrls[0][0]), 'proxy is skipped for a while after it was found unavailable');

      // (c) proxy deployed but GEMINI_API_KEY secret missing (503 stamped) -> direct fallback
      llm.resetFoodAiProxyState();
      calledUrls.length = 0;
      globalThis.fetch = async (url) => { calledUrls.push([String(url)]); return /food-ai/.test(String(url)) ? mkResp(503, { error: { status: 'FOOD_AI_NOT_CONFIGURED' } }, true) : mkResp(200, geminiOk(payload), false); };
      const pc = await llm.askFoodAssistant(t16);
      ok(pc.ok && calledUrls.length === 2, 'not-configured proxy (503) -> direct fallback');

      // (d) proxy rate limit (429 stamped) must NOT be bypassed through the direct key
      llm.resetFoodAiProxyState();
      calledUrls.length = 0;
      globalThis.fetch = async (url) => { calledUrls.push([String(url)]); return mkResp(429, { error: { message: 'Too many AI requests' } }, true); };
      const pd = await llm.askFoodAssistant(t16);
      ok(!pd.ok && pd.reason === 'quota' && !calledUrls.some((c) => /generativelanguage/.test(c[0])), 'proxy 429 -> quota, direct key not used to dodge the limit');

      // (e) request sent to the proxy has the {model, body} envelope the edge function expects
      llm.resetFoodAiProxyState();
      let envelope = null;
      globalThis.fetch = async (url, init) => { envelope = JSON.parse(init.body); return mkResp(200, geminiOk(payload), true); };
      await llm.askFoodAssistant(t16);
      ok(envelope && envelope.model === 'gemini-3.5-flash-lite' && envelope.body && envelope.body.contents && san.sanitizeGeminiRequest(envelope).ok, 'envelope {model, body} is accepted by the proxy whitelist');
    } finally {
      globalThis.fetch = realFetch;
      llm.resetFoodAiProxyState();
    }
  } catch (e) {
    fail++;
    failures.push('EXCEPTION ' + e.message);
    console.error(e);
  } finally {
    await server.close();
  }
  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  if (fail) {
    console.log('Failures:\n - ' + failures.join('\n - '));
    process.exit(1);
  }
})();
