# សវនកម្មស៊ីជម្រៅ៖ ប្រព័ន្ធគ្រប់គ្រងអ្នកប្រើប្រាស់ (User Data Safety)

កាលបរិច្ឆេទ៖ 2026-11-07 · កម្មវិធី៖ Cambodia Flavors & Tourism (`រសជាតិ និងទេសចរណ៍កម្ពុជា`) · កំណែកូដ 2.7.0

## 1. ភស្តុតាងពិតប្រាកដ (Production probe — អានតែប៉ុណ្ណោះ)

ការហៅ GET ទៅ Supabase production (`ryvltobwuwuulazqjnza`) ដោយប្រើ key សាធារណៈដូច App ត្រឡប់៖

```
HTTP 402  Service for this project is restricted due to the following violations: exceed_egress_quota.
```

**មូលដ្ឋានទិន្នន័យកណ្តាលកំពុងត្រូវបានរឹតត្បិត (អានមិនបាន សរសេរមិនបាន)។** គ្រប់ការ Sync ទាំងអស់ធ្លាក់ទៅ
Secondary failover = `ntfy.sh` (pub/sub សាធារណៈ, រក្សាសារតែ ~12 ម៉ោង) + localStorage mirror។
ដូច្នេះ បញ្ជីអ្នកប្រើនៅលើទូរស័ព្ទ Admin ត្រូវបានបង្កើតឡើងវិញពីទិន្នន័យក្នុងឧបករណ៍តែប៉ុណ្ណោះ → បង្ហាញ «2 គណនី»
ក្នុងរូបថតអេក្រង់របស់លោកអ្នក។ ភស្តុតាងក្នុងកូដ៖ `verifiedInvitedTesters` ក្នុង `syncAllAppDataWithSupabase`
គឺជាគណនីដែលអ្នកអភិវឌ្ឍន៍ត្រូវ *សរសេរជាប់ក្នុងកូដ* ដើម្បីស្តារ Tester ម្នាក់ដែលបាត់ពេល 402 ពីមុន។

> ខ្ញុំមិនអាចស្តារសេវា Supabase ឬមើលចំនួនអ្នកប្រើពិតប្រាកដបានទេ។ លោកអ្នកត្រូវចូល Supabase → Billing
> ដើម្បី Upgrade Plan ឬបិទ Spend Cap។ ហើយមិនមានវិធីអនុញ្ញាតឱ្យខ្ញុំគេចវាបានទេ។

## 2. មូលហេតុ Root Cause (តាមលំដាប់ធ្ងន់ធ្ងរ)

| # | មូលហេតុ | ទីតាំង | ផលប៉ះពាល់ |
|---|---|---|---|
| RC1 | គ្មាន Outbox: ការសរសេរគណនី/VIP ដែលបរាជ័យ (402/offline) ត្រូវចាត់ទុកជា «ជោគជ័យ» ពេលចូល ntfy ហើយបាត់ក្រោយ ~12 ម៉ោង | `pushCloudDocument` | គណនីចុះឈ្មោះពេល Server ដាច់ បាត់ |
| RC2 | **Egress**៖ ឧបករណ៍ទាំងអស់ (រួមទាំង User ធម្មតា) ទាញយកបញ្ជីអ្នកប្រើទាំងមូល (មាន PII) រាល់ Sync និងរាល់ Login ហើយ Admin ទាញ `kft_user_*` ទាំងអស់រាល់ពេល | `syncAllAppDataWithSupabase`, `upsertSingleUserToCloud` | ប្រើ quota ហួស → 402 → RC1 |
| RC3 | បញ្ជីមួយ (`kft_cloud_users_v2`) ត្រូវសរសេរជាន់ទាំងមូលពី local list ដែលអាចមិនពេញលេញ (15+ ចំណុចក្នុង AppContext) ហើយ **អានបរាជ័យ = ទទេ** | `pushCloudDocument`/`pullCloudDocument` | ឧបករណ៍ Admin ថ្មី/Update ដែល local តូច សរសេរជាន់បញ្ជីកណ្តាល |
| RC4 | `limit=1000` ជាប់ ឥតមាន pagination/order | `pullCloudDocumentsByPrefix` | លើស 1,000 នាក់ បាត់ជាស្ងាត់ៗ (មិនកំណត់) |
| RC5 | រាល់ Login: អាន-កែ-សរសេរបញ្ជីទាំងមូល (lost-update race) | `upsertSingleUserToCloud` | Login ពីរដំណាលគ្នា → ម្នាក់បាត់ |
| RC6 | Backup តែក្នុង localStorage (បាត់ជាមួយ App data); គ្មាន history/snapshot នៅ Server | `createUsersBackupSnapshot`, `kft_pre_update_db_backup_v1` | Reinstall/Clear data = បាត់ទាំង backup |
| RC7 | RLS `USING (true)` + anon key ក្នុង APK: អ្នកណាក៏លុប/សរសេរជាន់បាន | `SUPABASE_SETUP_SQL` | ហានិភ័យសុវត្ថិភាព (មិនទាន់ដោះស្រាយពេញលេញ — មើលផ្នែក 6) |
| RC8 | `google-chorn_ponnakka…` ជាគណនីបុគ្គលពិតសរសេរជាប់ក្នុងកូដ APK | `verifiedInvitedTesters` | PII លេចធ្លាយ + គណនីខ្មោច (Test ចាស់បរាជ័យដោយសារវា) |

Migration ក្នុង `main.tsx` **មិនមែនជាមូលហេតុ** — Test បង្ហាញថា v4→v5, VIP stacking, avatar, shop ត្រូវរក្សាបានត្រឹមត្រូវ។
ប៉ុន្តែវាពឹងលើ localStorage ដែលនៅដដែល ដូច្នេះ Reinstall/Clear data ត្រូវការ Server ជាអ្នកស្តារ។

## 3. អ្វីដែលបានកែ (កម្រិត Database / Backend / API)

**Database (`supabase_user_data_safety_v1.sql` — non-destructive, idempotent)**
- Trigger `a_kft_kv_guard`: បដិសេធការបង្រួមបញ្ជី `kft_cloud_users_v1/v2` លើស 20%; បដិសេធ DELETE key ដែលការពារ លើកលែងមាន header `x-kft-allow-destructive`; VIP active ក្នុង row `kft_user_*` **មិនអាចត្រូវបន្ទាបឬលុប** ដោយ client ចាស់ (លើកលែងបោះបង់ VIP ច្បាស់លាស់); `createdAt` អាចរំកិលទៅមុនបានតែប៉ុណ្ណោះ។
- Trigger `b_kft_kv_archive` + តារាង `kft_app_kv_history`: រក្សា row ដែលត្រូវសរសេរជាន់/លុបគ្រប់ពេល។
- `kft_create_snapshot()`, `kft_history_prune()`, `kft_restore_missing_users_from_snapshot()` (ស្ដារតែ row ដែលបាត់ មិនសរសេរជាន់ — មាន dry-run), `kft_users_integrity_report()`។
- Index សម្រាប់ 10,000+ នាក់ (prefix, updated_at, email, phone, role, VIP)។

**Backend/API (`supabaseService.ts`)**
- `pushCloudDocument`: shrink-guard ក្នុង client + **Durable Outbox** (`flushCloudOutbox`, ផ្ញើឡើងវិញពេល Server ត្រឡប់/online/រាល់ sync) + header `allowDestructive`។
- `pullCloudDocument`/`wasCloudPullOk`: បែងចែក «Server ឆ្លើយថាទទេ» ពី «Server មិនឆ្លើយ»; Sync មិនសរសេរបញ្ជីកណ្តាលទៀតឡើយ លុះត្រាតែអានជោគជ័យ។
- `pullCloudDocumentsByPrefix`: pagination ពេញលេញ + `order=key.asc` + delta (`updated_at=gt.`)។
- Admin ទាញតែ row ដែលបានផ្លាស់ប្តូរ (cursor) ហើយបង្ខំទាញពេញលេញបើ local តូចជាង 90% នៃចំនួនបានបញ្ជាក់។
- Regular device **លែងទាញបញ្ជីអ្នកប្រើទាំងមូល** (ទាញតែ legacy account ដែលគ្មាន atomic row, ម្តង)។ Login លែងសរសេរបញ្ជីទាំងមូល។
- Avatar base64 ត្រូវជំនួសដោយ URL Cloud (បើមាន) ក្នុង row សម្រាប់កាត់បន្ថយ egress។
- `fetchServerUserCounts()` (count=exact ដោយមិនទាញទិន្នន័យ)។

**Integrity + Logs (`userDataIntegrityService.ts`, `userDataSafety.ts`, Admin card)**
- High-water mark, ការរកឃើញការថយចុះ (critical បើ <80%), duplicate id/email, គ្មានថ្ងៃចុះឈ្មោះ, VIP ផុតកំណត់, current user បាត់; Error log 200 ជួរ; Upgrade audit (មុន→ក្រោយ) គ្រប់ Version។
- Admin → អ្នកប្រើ → Backup & តេស្ត: កាត «ការពារទិន្នន័យអ្នកប្រើ» (Server vs ឧបករណ៍, Outbox, Log)។

**Pipeline មុន Deploy** — `npm run build:release` = `test:users:safety` → `test:users:migration` → `backup:users` (សរសេរ `backups/users/<UTC>_v<ver>/` + SHA-256) → `test:users:restore`។ បើ Server ត្រូវបានរឹតត្បិត Backup បរាជ័យ (exit 2) ហើយ Build ឈប់។ `scripts/origin-fingerprint.json` ការពារកុំឱ្យប្តូរ appId / iOS scheme (ដែលនឹងលុប storage ទាំងអស់)។

## 4. ជំហានត្រូវធ្វើ (តាមលំដាប់)

1. Supabase → Billing: Upgrade Plan / បិទ Spend Cap (ទាមទារ — ខ្ញុំធ្វើមិនបាន)។
2. Supabase → SQL Editor: Run `supabase_user_data_safety_v1.sql` (ម្តង)។
3. `npm run backup:users` រួច `npm run test:users:restore` → រក្សាថតនោះក្រៅកុំព្យូទ័រ (Drive/USB)។
4. `npm run build:release` មុន Build APK/AAB ទាំងអស់។
5. បន្ទាប់ពី Deploy: Admin → Backup & តេស្ត → «ពិនិត្យ Server ឥឡូវនេះ»។

## 5. លទ្ធផលតេស្ត (ដំណើរការពិតក្នុងបរិស្ថាននេះ)

| Test | លទ្ធផល |
|---|---|
| `tsc --noEmit` | 0 errors |
| `test:users:safety` | 23/23 ជោគជ័យ (50,004 records វិភាគ 61 ms) |
| `test:users:migration` (Suite 1–4) | ជោគជ័យ ១០០% — រួមមាន Update 2.4.9→2.5.0→2.6.0 និង 2.6.9→2.7.0 ជាមួយ user ឥតគិតថ្លៃ + VIP 30/90/365 ថ្ងៃ + shop + transaction; pagination 2,600 users; shrink-guard 100→2 ត្រូវបដិសេធ; 402 → Outbox → ផ្ញើវិញ; admin sync ពេល outage មិនប៉ះបញ្ជីកណ្តាល; regular device 0 aggregate download |
| Restore drill (12,000 users សំយោគ) | Total-loss ដូចដើមបេះបិទ; Partial-loss ស្តារ 3,634 គណនីបាត់ ហើយរក្សា 624 កំណែថ្មីមិនសរសេរជាន់; ដាក់ byte ខូច → បរាជ័យត្រឹមត្រូវ |
| `backup:users` លើ production | បដិសេធ (exit 2, HTTP 402) ហើយមិនសរសេរអ្វីទាល់តែសោះ |

Test ចាស់ (Suite 2) **ធ្លាប់បរាជ័យ** មុនការកែ (5≠4 = គណនីខ្មោច RC8); ឥឡូវកត់ត្រាច្បាស់ ហើយ Suite 2 ជោគជ័យ។

## 6. មិនទាន់បានផ្ទៀងផ្ទាត់ / ហានិភ័យនៅសល់ (សូមអានឱ្យច្បាស់)

- **SQL មិនទាន់ដំណើរការលើ Postgres ពិត** (Supabase ត្រូវបានរឹតត្បិត; គ្មាន Postgres ក្នុងម៉ាស៊ីននេះ)។ ត្រូវតេស្តក្រោយ Run: ព្យាយាម DELETE `kft_user_*` ដោយគ្មាន header → ត្រូវទទួល `KFT_GUARD`។ ប្រសិនបើ gateway CORS បដិសេធ custom header `x-kft-allow-destructive` ការលុបគណនីដោយ Admin នឹងបរាជ័យ (សុវត្ថិភាព) — ប្រាប់ខ្ញុំដើម្បីកែ។
- **មិនទាន់បានតេស្តលើទូរស័ព្ទពិត** (APK ចាស់ → ថ្មី)។ ការ Simulate ប្រើ migration code ពិតពី `main.tsx` ជាមួយ localStorage/IndexedDB/Supabase simulator។
- RLS សាធារណៈនៅដដែល: Trigger ការពារ **Bug/Client ចាស់** (មូលហេតុពិត) ប៉ុន្តែអ្នកវាយប្រហារដែលដឹង header អាចជំរុញបាន។ ដំណោះស្រាយពិត = ផ្លាស់ការសរសេរទៅ Edge Function ដែលមាន secret (Phase 2)។
- Egress នៅសល់៖ `kft_cloud_transactions_v1`, `kft_cloud_custom_restaurants_v1`, `kft_cloud_support_tickets_v1`, `kft_ov_*`, `kft_proof_*` នៅតែទាញទាំងមូល។ ទាមទារ Egress budget audit ដាច់ដោយឡែក (មិនទាន់ធ្វើ)។ Pro Plan (250 GB) នឹងមិនគ្រប់បើមិនកាត់បន្ថយ។
- ✅ **ដោះស្រាយរួច (កូដ)**៖ `ntfy.sh` លែងទទួលទិន្នន័យផ្ទាល់ខ្លួន — `isKeyEligibleForSecondaryFailover` ជា allow-list តែ `kft_ov_food_*`, `kft_ov_dest_*`, `kft_ov_trend_*`, `kft_cloud_deleted_restaurants_v1`។ គណនី/VIP/ប្រតិបត្តិការ/បង្កាន់ដៃ/រូបភាពប្រវត្តិរូប/Tickets/Settings/Admin PIN មិនត្រូវបានផ្ញើទៀតទេ ហើយសារចាស់ត្រូវបានមិនអើពើពេលអាន។ **ប៉ុន្តែ APK ចាស់ដែលបានដំឡើងរួចនៅតែផ្ញើដដែលរហូតដល់អ្នកប្រើ Update**; សារដែលបានផ្ញើរួចលុបមិនបាន (ផុតកំណត់ ~12 ម៉ោង)។ ផលប៉ះពាល់៖ ពេល Supabase ដាច់ គណនីថ្មីត្រូវរង់ចាំក្នុង Outbox លើទូរស័ព្ទ (មិនមាន ntfy ជួយទៀត)។
- ✅ **ដោះស្រាយរួច (កូដ)**៖ `verifiedInvitedTesters` (Chorn Ponnakka) ត្រូវបានលុបចេញពីកូដ។ កំណត់ត្រាដែលធ្លាប់ត្រូវបាន Inject ចូល `kft_cloud_users_v2` លើ Server (បើនៅមាន) ត្រូវលុបដាច់ដោយឡែក (ត្រូវការការអនុញ្ញាតពី Admin)។
- ⚠️ **សុវត្ថិភាពនៅសល់**៖ `adminPasswordHash` / `pinHash` (ក្នុង `kft_cloud_app_settings_v1`, `kft_admin_pin_security_v1`) អាចអានបានដោយអ្នកដែលមាន anon key សាធារណៈ (RLS បើក) ហើយធ្លាប់ត្រូវបានផ្ញើទៅ ntfy។ គួរប្តូរ PIN/ពាក្យសម្ងាត់ Admin ក្រោយ Update និងផ្លាស់ Admin Auth ទៅ Edge Function (Phase 2)។
- Admin ដែលព្យាយាម *កាត់បន្ថយ* VIP expiry ដោយមិន Cancel នឹងត្រូវ Trigger រក្សាកាលបរិច្ឆេទដើម (ប្រើ Cancel + Grant)។
- `kft_users_directory` (តារាងរៀងៗខ្លួនក្នុង `supabase_admin_users_scale_10k.sql`) មិនទាន់ត្រូវបានប្រើ — Phase 2 សម្រាប់ >50,000 នាក់។
