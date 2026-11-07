# Supabase Pro — ការដំឡើង Phase A (Edge Functions · Cache · Quota · Backup · Image)

គោលដៅ៖ ដាក់ **Google Maps key** និង **AI key (Gemini/OpenAI)** នៅលើ Server ប៉ុណ្ណោះ (មិនមានក្នុង APK), កំណត់ **ចំនួនប្រើប្រចាំថ្ងៃ** ដើម្បីគ្រប់គ្រងថ្លៃ, **cache** លទ្ធផល Places ក្នុង Postgres, **backup ស្វ័យប្រវត្តិ** និង **thumbnail រូបភាព** ពី Storage។ គ្មានការលុប/កែ គណនី, VIP, ហាង, ម្ហូប, សណ្ឋាគារ ឬទេសចរណ៍ទេ។

## ជំហានដែលលោកអ្នកត្រូវធ្វើ (ម្តងគត់ · ~10 នាទី)

| # | ធ្វើអ្វី | ពេលណា |
|---|---|---|
| 1 | Supabase → **SQL Editor** → បិទភ្ជាប់ [supabase_pro_platform_v1.sql](../supabase_pro_platform_v1.sql) → **Run** (លទ្ធផលត្រូវបាន `new_tables_expected_3 = 3`, `new_functions_expected_5 = 5`, `rls_on_expected_3 = 3`) | មុន |
| 2 | បង្កើត **Google Maps key ថ្មី** (Google Cloud Console → Credentials): ដាក់ *API restriction = Places API (New)* តែមួយ, បើក Billing, ដាក់ **Budget alert** (ឧ. \$20/ខែ) | មុន |
| 3 | បង្កើត **Gemini key ថ្មី** (aistudio.google.com) និង (ជម្រើស) OpenAI key សម្រាប់ fail-over | មុន |
| 4 | ចុចពីរដង [deploy_supabase_pro.bat](../deploy_supabase_pro.bat) → login → បញ្ចូល key → វា deploy `food-ai` + `places-proxy` ហើយរត់ smoke test | ក្រោយ 1-3 |
| 5 | ផ្ញើលទ្ធផល smoke test មកខ្ញុំ → ខ្ញុំលុប key ចាស់ចេញពីកូដ APK (`DEFAULT_*_API_KEY`) ហើយចេញ build ថ្មី | ក្រោយ 4 |
| 6 | **បិទ (revoke) key ចាស់** ក្នុង Google (ព្រោះធ្លាប់នៅក្នុង APK និង Cloud Settings) | ក្រោយ build ថ្មីចេញ |

> កុំបិទ key ចាស់មុន Update ចេញ — APK ចាស់នៅត្រូវការវា។ កម្មវិធីថ្មីប្រើ Edge Function ដោយស្វ័យប្រវត្តិ ហើយ **ត្រឡប់ទៅ key ចាស់វិញបើ Function មិនទាន់ deploy** (មិនបំបែកអ្វីទាំងអស់មុន deploy)។

## អ្វីដែលបានបន្ថែម

- **`food-ai`** (Gemini → OpenAI fail-over): quota ប្រចាំថ្ងៃ (VIP 150 · Free 20 · អនាមិក 20 · ពិនិត្យបង្កាន់ដៃ 45 «credits»; រូបភាព = 3 credits), log រាល់ការហៅ (model, tokens, status), ជម្រើសបង្ខំ VIP នៅ Server។
- **`places-proxy`**: អនុញ្ញាតតែ 4 ប្រតិបត្តិការ (searchText, searchNearby, details, photo) · whitelist field mask (ការពារ billing SKU ថ្លៃ) · cache 1-7 ថ្ងៃ (ក្រោម 30 ថ្ងៃតាមលក្ខខណ្ឌ Google) · រូបភាព **មិនត្រូវ cache** (តាមលក្ខខណ្ឌ Google) · quota User 400 / IP 120 ប្រចាំថ្ងៃ។
- **Client**: ការហៅ Places ទាំងអស់ឆ្លងកាត់ `placesFetch` ([placesProxy.ts](../src/services/placesProxy.ts)); បង់ប្រាក់/បង្កាន់ដៃប្រើ [aiGatewayClient.ts](../src/services/aiGatewayClient.ts) មុន រួចទើប key ក្នុងឧបករណ៍។ រូបភាពក្នុង FoodCard ប្រើ **Image Transformation** (ធ្វើតេស្តពិត: 265 KB → 79 KB) ហើយត្រឡប់ទៅ original បើមានបញ្ហា។
- **SQL**: តារាង `kft_api_usage_*`, `kft_places_cache` (Service-role តែប៉ុណ្ណោះ, RLS បើក, គ្មាន policy) · `pg_cron`: snapshot ប្រចាំយប់ 03:00, រក្សា 21 snapshots, សម្អាត history/cache/log, VACUUM ប្រចាំសប្តាហ៍។

## Secrets ជម្រើស (ដាក់ជាមួយ `supabase secrets set NAME=value`)

| Secret | លំនាំដើម | ន័យ |
|---|---|---|
| `FOOD_AI_ENFORCE_VIP` | មិនបើក | `true` = Server បដិសេធ AI ចំពោះអ្នកមិនមែន VIP (ពិនិត្យបង្កាន់ដៃមិនរងឥទ្ធិពល)។ **បើកតែក្រោយអ្នកប្រើ Update ទាំងអស់** |
| `AI_DAILY_LIMIT_VIP / _FREE / _ANON / _PAYMENT` | 150 / 20 / 20 / 45 | credits ប្រចាំថ្ងៃ |
| `PLACES_DAILY_LIMIT_USER / _ANON / PLACES_DAILY_PHOTO_LIMIT` | 400 / 120 / 1500 | ចំនួនហៅ Google ប្រចាំថ្ងៃ |
| `OPENAI_MODEL` | `gpt-4o-mini` | `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-4.1` |

## តាមដានថ្លៃ និងសុខភាព (SQL Editor)

```sql
SELECT public.kft_platform_health();          -- ទំហំ DB, snapshots, cron jobs, ការហៅថ្ងៃនេះ
SELECT * FROM public.kft_api_usage_report(7); -- AI/Places 7 ថ្ងៃ: calls, cache hits, errors, tokens
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;  -- cron ដំណើរការឬអត់
```

Restore ពី snapshot (មិនលុបទិន្នន័យ — បន្ថែមតែអ្នកប្រើដែលបាត់)៖ `SELECT * FROM public.kft_restore_missing_users_from_snapshot('<snapshot_id>', true);` (dry-run) → `false` (apply)។

## ដែនកំណត់ដែលត្រូវដឹង (សុចរិត)

- `x-kft-user-id` មិនមែនជាការបញ្ជាក់ខ្លួនទេ — អ្នកដឹង id របស់ VIP អាចយក quota/សិទ្ធិគាត់បាន។ ដំណោះស្រាយពិត = **Phase B** (Server ចេញ token ចុះហត្ថលេខា/Supabase Auth)។ Quota ប្រចាំថ្ងៃនៅតែកំណត់ដំបូលថ្លៃ។
- ទូរស័ព្ទ Cambodia ជាញឹកញាប់ចែក IP (CGNAT) — quota អនាមិក (IP) អាចចែកគ្នា ដូច្នេះកម្មវិធីផ្ញើ user id ជានិច្ច។
- **Spend cap** (Dashboard → Billing)៖ បើបើក ហើយលើសកូតា Pro ប្រព័ន្ធអាចត្រូវរឹតត្បិតវិញ (HTTP 402)។ ទំហំទិន្នន័យឥឡូវតូច (~5 MB) ដូច្នេះហានិភ័យទាប; ប្រសិនបើចង់ឱ្យមិនដាច់ដាច់ខាត សូមបិទ Spend cap ហើយដាក់ Usage alerts។
- PITR (restore ដល់វិនាទី) ជា add-on បន្ថែម មិនរួមក្នុង \$25។ Daily backup របស់ Pro (7 ថ្ងៃ) + snapshots របស់យើង + `npm run backup:users` គ្របដណ្តប់ការពិតប្រាកដ។
- Image Transformation: រួមបញ្ចូល 100 រូបប្លែកក្នុងមួយខែ ក្រោយនោះ ~\$5 ក្នុង 1,000 រូប។
