# Changelog

## Shareables Claimer

### 1.0.0
- First public release.
- Username is read from the page header.
- Collects caches over all result pages (pagination).
- Header icon button with start/stop, status panel as fallback.
- Test mode (`DRY_RUN`) enabled by default.
- Summary of the last run on the page that opens after the run.

## Log Translator

### 1.0.0
- First public release.
- Translated text is inserted as plain text only (prevents HTML from log text being executed).
- All settings and texts moved to a `CONFIG` / `TEXT` block at the top.
- Optional target language override (`TARGET_LANG_OVERRIDE`).
- Error handling for failed requests of the translation service.
