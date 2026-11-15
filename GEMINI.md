# Workspace & Sandbox Rules (Do Not Prompt User Repeatedly)

1. **Workspace Folder Already Added**:
   - Both `f:\Soft\System Program 2027 kimseng\KhmerFoodTourism` and `f:\Soft\System Program 2027 kimseng\AccountV4_Published11122018_WithLicense` are already added to the active workspace with full read/write access inside the sandbox.
   - **NEVER** ask the user to add `KhmerFoodTourism` to the workspace again.

2. **Zero Approval Prompts (`BypassSandbox: false`)**:
   - Always run `run_command` with `BypassSandbox: false` (sandboxed mode) for all commands, file reads/updates, TypeScript checks, and builds in `f:\Soft\System Program 2027 kimseng\KhmerFoodTourism` so the user is NEVER interrupted with approval dialogs.
   - Avoid native `read_file` / `edit_file` / `write_file` on `f:\Soft\System Program 2027 kimseng\KhmerFoodTourism` in legacy conversations if the IDE prompts per-file; use `run_command` with `BypassSandbox: false` instead.
   - Avoid chaining commands with `cd "..." ; ...` or `&&` if `BypassSandbox: true` is ever required; pass `--prefix "f:\Soft\System Program 2027 kimseng\KhmerFoodTourism"` to `npm.cmd` or `-p "f:\Soft\System Program 2027 kimseng\KhmerFoodTourism\tsconfig.json"` to `npx.cmd tsc`.

3. **Post-Update Quality & Anti-Regression Rules (Permanent)**:
   - After making feature updates or bug fixes, always run `npm run test:unit`, `npm run test:users:safety`, and `tsc --noEmit` to verify zero errors or regressions.
   - Reuse centralized helpers (`src/config/appConstants.ts`, `src/utils/nearMeNavigation.ts`, `applyKhmerSpellingVariants` in `src/utils/searchEngine.ts`) instead of duplicating constants, `window.__kft_*` globals, or search normalization logic.
   - Keep `AppContext.Provider` value memoized with `useMemo` and avoid adding unused imports or dead code (`if (false)` / `Boolean(1)`).
   - Never leave old `.apk` or `.aab` build files in the project root; keep only the latest release APK and Play Store AAB inside `Release_APK_AAB/`.
