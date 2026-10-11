# English and French localization

`locales` in `src/lib/i18n.ts` is the public allowlist. Historical dictionaries remain for compatibility, but cannot be selected or supplied through request parsing.

Selection order: a valid `monetizable_locale` cookie, country-level French detection (browser preference disambiguates multilingual countries), then English. An unknown country defaults to English. Editorial routes use this same resolver. The selector reloads the page to replace both server-rendered content and client-held report state.

`LocalizationProvider` provides the request locale. `Localized` performs synchronous presentation-only dictionary lookup on React output; it does not mutate the DOM. It preserves event handlers, component keys, URLs, IDs, option values and form values. Use `translate="no"` around names or verbatim source material. Canvas labels use the same `translateText` function. Never add data identifiers to a translated field.

Maintained French product dictionaries take precedence. Additional copy lives in `src/lib/messages-fr.json`; editorial HTML lives in `content/posts-fr`. Keep slugs, links, assets and dates identical to the source. Add reviewed UI translations to `scripts/i18n/overrides.json`, then run `node scripts/i18n/finalize.cjs`. Existing French strings are excluded to prevent double translation. Build-time draft translations used public-copy translation and the offline OPUS-MT English/French model; no user data is sent to a public translation service. The optional offline script loads model weights/tokenizers from `/tmp/monetizable-en-fr-model` with CTranslate2 and SentencePiece, without executing downloaded model code.

Private report and opportunity prose uses the existing configured OpenAI provider to produce a separate display dictionary. Original reports, matching inputs, account IDs, URLs, raw CV evidence, email drafts and application payloads are unchanged. Cached entries include the target language and a content hash, are bounded, and expire after 10 minutes. A translation failure is retryable; it must not silently replace a French report with mixed-language prose. English reports already written in English do not incur a translation request. The first translated view can take longer on a cold cache.

Validation:

- `node tests/localization.cjs`
- `node tests/request-locale.cjs`
- `node tests/display-translations.cjs`
- `node tests/localization-content.cjs`
- `npm run typecheck`
- `npm run build` (use `-- --webpack` if local Turbopack cannot bind its worker port)

Browser checks cover both selector directions, retained preference across public routes, French article bodies, HTML language, metadata and form values. Payment locale propagation is tested with mocked requests, without creating charges. Authenticated report translation is covered with synthetic records; production account/CV data is not needed for these tests.
