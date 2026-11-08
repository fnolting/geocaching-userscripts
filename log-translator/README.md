# Geocaching Log Translator

Adds a **"Übersetzen" (Translate)** button to every log entry on geocaching.com cache pages. A click translates the log text into your browser language.

## Install

[Install the script](https://raw.githubusercontent.com/fnolting/geocaching-userscripts/main/log-translator/geocaching-log-translator.user.js) (requires [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager).

## Usage

Open a cache listing. Every log has a translate button next to its other actions. Click it, and the log text is replaced with the translation. Logs that load later (infinite scroll) get their button automatically. Reload the page to see the original text again.

The target language is the language of your browser (for example `de` for `de-AT`). To use a different one, set `TARGET_LANG_OVERRIDE` in the `CONFIG` block, for example `'en'`.

## Privacy

**The text of the log is sent to Google.** The script uses the unofficial public Google Translate endpoint (`translate.googleapis.com`). No API key is required and nothing is sent until you click the button, and then only the text of that one log.

## Known limitations

- The endpoint is **unofficial and undocumented**. Google can change it, rate-limit it or switch it off at any time, then translations stop working.
- The text is sent in the URL, so **very long logs** may fail with an error.
- The translated log is shown as plain text. Formatting, links and images inside the log are not kept until you reload the page.
- The button and status texts are German (see `TEXT` in the script).
- Depends on the current HTML of geocaching.com. If the site changes, update the selectors in `CONFIG`.

## Configuration

All settings are in the `CONFIG` block at the top of the script: target language, API endpoint, selectors, button styles. Texts are in `TEXT`.

## Troubleshooting

Open the browser console (F12) and look for `[Log Translator]` entries. Include them in your issue.

## Credits

The script icon is the "Antu google-translate" icon from the Antu icon theme, hosted on Wikimedia Commons.
