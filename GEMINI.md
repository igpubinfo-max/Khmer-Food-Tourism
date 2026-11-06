# Workspace & Sandbox Rules (Do Not Prompt User Repeatedly)

1. **Workspace Folder Already Added**:
   - Both `f:\Soft\System Program 2027 kimseng\KhmerFoodTourism` and `f:\Soft\System Program 2027 kimseng\AccountV4_Published11122018_WithLicense` are already added to the active workspace with full read/write access inside the sandbox.
   - **NEVER** ask the user to add `KhmerFoodTourism` to the workspace again.

2. **Zero Approval Prompts (`BypassSandbox: false`)**:
   - Always run `run_command` with `BypassSandbox: false` (sandboxed mode) for all commands, file reads/updates, TypeScript checks, and builds in `f:\Soft\System Program 2027 kimseng\KhmerFoodTourism` so the user is NEVER interrupted with approval dialogs.
   - Avoid native `read_file` / `edit_file` / `write_file` on `f:\Soft\System Program 2027 kimseng\KhmerFoodTourism` in legacy conversations if the IDE prompts per-file; use `run_command` with `BypassSandbox: false` instead.
   - Avoid chaining commands with `cd "..." ; ...` or `&&` if `BypassSandbox: true` is ever required; pass `--prefix "f:\Soft\System Program 2027 kimseng\KhmerFoodTourism"` to `npm.cmd` or `-p "f:\Soft\System Program 2027 kimseng\KhmerFoodTourism\tsconfig.json"` to `npx.cmd tsc`.
