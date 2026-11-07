# សុវត្ថិភាព Admin — Phase B1

## បញ្ហាដែលបានរកឃើញ (ពិនិត្យលើ Server ពិត និងកូដ)

| # | ហានិភ័យ | ភស្តុតាង |
|---|---|---|
| 1 | **ពាក្យសម្ងាត់ Admin ស្ថិតក្នុងកូដ** | Server hash ត្រូវនឹងពាក្យសម្ងាត់ដែលសរសេរក្នុង APK (`CheaSavuth@2026`) ហើយកូដមាន «backdoor» ទទួលពាក្យសម្ងាត់ពីរនោះទោះ hash ខុស |
| 2 | **PIN Admin ជាតម្លៃរោងចក្រ** | `pinHash` លើ Server = ធៀបស្មើ `DEFAULT_ADMIN_PIN_HASH` ក្នុងកូដ (មិនទាន់ដែលបានប្តូរ) |
| 3 | **Biometric/Web fallback** | កូដមានពាក្យសម្ងាត់លំនាំដើមក្នុង fallback ហើយ web fallback ជោគជ័យដោយគ្មានការពិនិត្យ |
| 4 | **ទិន្នន័យទូទាត់សរសេរបានដោយ key សាធារណៈ** | `kft_cloud_app_settings_v1` មាន `supportQrImageUrl`, `supportAccountName`, `supportBankName`, តម្លៃ VIP, `apkDownloadUrl`, `playStoreUrl`។ អ្នកណាមាន anon key (មានក្នុង APK ទាំងអស់) ប្តូរ QR ទៅគណនីខ្លួន ឬដាក់តំណ APK មេរោគបាន |

ការចូល Admin ពីមុនជាការត្រួតពិនិត្យលើ UI ប៉ុណ្ណោះ។ Server មិនដឹងថា «Admin» ជានរណាទេ។

## អ្វីដែល Phase B1 ធ្វើ

1. **`admin-auth` Edge Function**៖ PIN និងពាក្យសម្ងាត់ត្រូវផ្ទៀងផ្ទាត់នៅ Server (secrets `ADMIN_PIN`, `ADMIN_PASSWORD` មិនស្ថិតក្នុងកូដ ឬតារាងសាធារណៈ)។ ជោគជ័យ → token ចុះហត្ថលេខា (HMAC) រយៈពេល 7 ថ្ងៃ។ ការចាក់សោរ brute-force នៅ Server (8 ដងក្នុង 1 IP/ថ្ងៃ; 200 សរុប/ថ្ងៃ)។
2. **Database guard `kft_admin_keys_guard`** (SQL [supabase_admin_security_v1.sql](../supabase_admin_security_v1.sql))៖ ពេលបើក `enforce_admin_keys='on'` ការសរសេរ/លុបលើ 3 key (`kft_cloud_app_settings_v1`, `kft_cloud_admin_vip_pricing_v2`, `kft_admin_pin_security_v1`) តាម API សាធារណៈ **ត្រូវមាន token Admin ត្រឹមត្រូវ**។ SQL Editor និង service role មិនរងឥទ្ធិពល។ **ចាប់ផ្តើមជា `off`** — គ្មានអ្វីប្តូរ រហូតដល់លោកអ្នកបើក។
3. **កម្មវិធី**៖ ការចូល Admin ហៅ Server; token ត្រូវផ្ញើជាមួយរាល់ការរក្សាទុកការកំណត់; ពាក្យសម្ងាត់លំនាំដើមទាំងអស់ត្រូវលុបចេញ (រួមទាំង backdoor, biometric, web fallback); hash លែងត្រូវបានផ្សព្វផ្សាយក្នុង settings ពេល Server auth សកម្ម។
4. **Fallback សុវត្ថិភាព**៖ បើ Function មិនទាន់ deploy / មិនទាន់មាន secret / គ្មាន Internet កម្មវិធីប្រើការផ្ទៀងផ្ទាត់ក្នុងឧបករណ៍ចាស់ (ដោយគ្មាន backdoor)។ ដូច្នេះមិនបិទសោអ្នកក្រៅការផ្លាស់ប្តូរ។

## លំដាប់ដែលត្រូវធ្វើ (លោកអ្នក · ~15 នាទី)

| # | ធ្វើអ្វី | ប្រសិនបើខុស |
|---|---|---|
| 1 | SQL Editor → រត់ `supabase_admin_security_v1.sql` ទាំងមូល (ត្រូវបាន `config_rows_expected_2=2`, `enforcement_expected_off=off`, `trigger_expected_1=1`, `rls_on_expected_1=1`, `selftest_all_true` ទាំងអស់ `true`) | ផ្ញើរូបមក |
| 2 | `.\scripts\setAdminSecrets.ps1` ក្នុង PowerShell → ជ្រើស **PIN ថ្មី 6 ខ្ទង់** និង **ពាក្យសម្ងាត់ថ្មី ≥12 តួ** (មិនបង្ហាញលើអេក្រង់ ហើយមិនបញ្ចូលក្នុង chat) | — |
| 3 | Deploy `admin-auth` (`deploy_supabase_pro.bat` ឬខ្ញុំជួយ) | — |
| 4 | `node scripts\adminSecurityTool.mjs test` → បញ្ចូល PIN/ពាក្យសម្ងាត់ថ្មី → ទាំងអស់ត្រូវ PASS | **កុំទាន់បើក enforcement** |
| 5 | ចេញ build ថ្មីរបស់កម្មវិធី ហើយចូល Admin លើទូរស័ព្ទជាមួយ PIN/ពាក្យសម្ងាត់ថ្មី → រក្សាទុក Settings (ឧ. ប្តូរតម្លៃ VIP ហើយប្តូរមកវិញ) ដើម្បីបញ្ជាក់ | — |
| 6 | `node scripts\adminSecurityTool.mjs migrate` → លុប hash ចេញពី settings សាធារណៈ ហើយបិទ PIN ចាស់ | — |
| 7 | SQL Editor → `UPDATE public.kft_security_config SET value='on' WHERE name='enforce_admin_keys';` ហើយរត់ `adminSecurityTool.mjs test` ម្តងទៀត → «write WITHOUT an admin token … BLOCKED» | **Undo ភ្លាមៗ៖** `SET value='off'` |

ក្រោយជំហាន 7: ការផ្លាស់ប្តូរ QR/គណនីធនាគារ/តម្លៃ VIP/តំណទាញយក តម្រូវ token Admin ពិតប្រាកដ។

## ត្រូវដឹង (សុចរិត)

- **ការគ្រប់គ្រង PIN/ពាក្យសម្ងាត់**៖ ប្តូរដោយ `setAdminSecrets.ps1` ម្តងទៀត មិនអាចប្តូរក្នុងកម្មវិធីទេ (ប៊ូតុងប្តូរក្នុង UI នឹងប្រាប់ពីរឿងនេះ)។
- **Biometric**៖ នៅដំណើរការ ប៉ុន្តែប្រើពាក្យសម្ងាត់ដែលបានរក្សាក្នុង Keystore ទៅផ្ទៀងផ្ទាត់នៅ Server។ ដូច្នេះត្រូវ **ចូលដោយពាក្យសម្ងាត់ម្តង** ក្រោយប្តូរ ដើម្បីរក្សាទុកពាក្យសម្ងាត់ថ្មី។
- **Phase B1 មិនបិទប្រហោងទាំងអស់**៖ 
  - ទិន្នន័យអ្នកប្រើ (`kft_user_*`) ហើយ VIP នៅសរសេរបានដោយ key សាធារណៈ ក្រោមការការពារ trigger ចាស់ (ការ **បង្កើតថ្មី** មិនត្រូវបានការពារទេ → អាចបង្កើតគណនី VIP ក្លែងបាន)។ **ត្រូវការ Phase B2** (ការផ្ទៀងផ្ទាត់ការទូទាត់ និងការផ្តល់ VIP នៅ Server)។
  - ការ **លុបគណនីខ្លួនឯង** (តម្រូវដោយ App Store) មិនត្រូវបានប៉ះពាល់ក្នុង B1 ទេ ព្រោះមិនប្រើ key ទាំង 3។
- កម្មវិធី Admin ចាស់ (មុន build ថ្មី) នឹងមិនអាចរក្សាទុក Settings បាន ពេល enforcement `on` — ត្រូវ update ជាមុន។
- Token រក្សាក្នុង localStorage ក្នុងឧបករណ៍ Admin; បើទូរស័ព្ទបាត់ ប្តូរ `admin_token_secret` ដើម្បីបិទ token ទាំងអស់៖
  `UPDATE public.kft_security_config SET value = encode(extensions.gen_random_bytes(32),'hex') WHERE name='admin_token_secret';`
