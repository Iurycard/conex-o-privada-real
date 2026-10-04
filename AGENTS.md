# Project rules

- Runtime persistence uses the Cloudflare Worker bindings `DB` (D1) and `MEDIA` (R2), configured in `wrangler.toml`; never expose database credentials or bucket secrets in `VITE_*` variables.
