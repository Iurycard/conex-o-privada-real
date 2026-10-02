# Project rules

- Public backend settings (VITE_SUPABASE_*) are given fallback values through `define` in vite.config.ts — `.env` is gitignored and does not reach hosted builds, so leaving them out blanks the published app.
