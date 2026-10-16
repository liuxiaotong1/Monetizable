# Monetizable locales

Public visitors default to `fr`; an explicit one-year language cookie preserves `zh`, `en` or `fr`. The administrator defaults to `zh` ; all visitors can switch between all three languages. Language is presentation only: identifiers, canonical answer order, saved judgments, learning mastery and subscription entitlements are never translated.

`fr.json` is the checked-in French catalog, including template messages and learning content. The initial offline draft used OPUS-MT en→fr (Helsinki-NLP/opus-mt-en-fr, converted weights Sams200/opus-mt-en-fr, CC BY 4.0); finance terminology and all 62 static questions, choices and explanations were reviewed separately. No translator runs in production. Source: https://huggingface.co/Helsinki-NLP/opus-mt-en-fr ; license: https://creativecommons.org/licenses/by/4.0/ .

`LocalizeTree` renders translated React text and display attributes while retaining handlers, refs, keys and input values. User-authored display content must use `translate="no"`. APIs localize learning copy using the same catalog, preserving card and concept identities across French and English. External source publications remain in their original language.

For new content, add the normalized English string and its French equivalent to `fr.json`. Preserve all `{0}` placeholders. Run `node tests/french-locale.mjs`, the relevant feature tests and `npm run build`. The extraction helper can inventory source strings; do not treat its output as a reviewed catalog.
