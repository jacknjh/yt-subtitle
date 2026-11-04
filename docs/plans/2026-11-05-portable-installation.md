# Portable installation and release packaging

User request: make the current GitHub project easier for another editor to install. Preserve the tested Premiere workflow. The package contains installer, panel and reader code; a compatible MOGRT is supplied separately.

## Scope

- Add a root Windows installer entry point with a double-click launcher.
- Resolve the Premiere installation and user-owned compatible template without hardcoding this computer's installation drive. Preserve the existing installer for development.
- Validate prerequisites and template control structure before changing the installed CEP panel or reader. Keep the previous developer-mode registry value and existing user settings.
- Build a versioned ZIP from an explicit file allowlist. Include no MOGRT, project, transcript, font, user config or machine path. Generate a SHA-256 checksum. Leave publication and the template-dependent release decision pending.
- Document the separate template requirement and the required exposed controls.

## Verification

Write regression checks before implementation for missing/invalid template paths, required exposed controls, reusable configuration, version bounds, and package contents. Test a real installed template read-only and build/extract the ZIP locally. Do not reinstall the reader, change registry settings, restart Premiere, or modify timeline graphics while testing the installer. A fresh-machine installation cannot be established by local preflight alone.
