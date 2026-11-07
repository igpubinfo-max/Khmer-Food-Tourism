# `food-ai` — Gemini proxy for the AI Food Assistant

The Gemini API key lives **only** in a Supabase secret. The app calls this function with the public anon key;
if the function is not deployed (or the secret is missing) the app automatically falls back to the key stored in
Admin → Overview → Box 4.

## Deploy (once)

```powershell
npm i -g supabase            # or: scoop install supabase
supabase login
supabase secrets set GEMINI_API_KEY=<key from aistudio.google.com> --project-ref ryvltobwuwuulazqjnza
supabase functions deploy food-ai --no-verify-jwt --project-ref ryvltobwuwuulazqjnza
# optional: OpenAI fail-over + limits -> see docs/SUPABASE_PRO_SETUP.md  (or just run deploy_supabase_pro.bat)
```

After it works you can delete the Gemini key from Admin → Box 4 (the app then never holds a Gemini key).
Rotate the old key in Google AI Studio, because it was shipped inside earlier app builds.

## What the function enforces

| Rule | Value |
| --- | --- |
| Models | `gemini-2.5-flash`, `gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-2.5-pro` |
| Forwarded fields | `systemInstruction`, `contents`, `generationConfig` (whitelisted keys, clamped) — no tools / safety / cache fields |
| Parts | text and up to 2 JPEG/PNG/WebP images |
| Size | request ≤ 6 MB, text ≤ 150 000 chars, output ≤ 8192 tokens |
| Rate limit (per IP, best-effort per isolate) | 20 / minute, 240 / hour |

Logic lives in `sanitize.ts` and is covered by `npm run test:food-ai`.
