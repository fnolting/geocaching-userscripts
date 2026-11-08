# Geocaching Userscripts

Two small [Tampermonkey](https://www.tampermonkey.net/) userscripts for [geocaching.com](https://www.geocaching.com/).

| Script | What it does | Install |
| --- | --- | --- |
| [Shareables Claimer](shareables-claimer/) | Finds your found caches with unclaimed Shareables and claims them for you. | [Install](https://raw.githubusercontent.com/fnolting/geocaching-userscripts/main/shareables-claimer/geocaching-shareables-claimer.user.js) |
| [Log Translator](log-translator/) | Adds a "Translate" button to every log entry and translates it into your browser language. | [Install](https://raw.githubusercontent.com/fnolting/geocaching-userscripts/main/log-translator/geocaching-log-translator.user.js) |

## Installation

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Edge, Firefox, Safari) or Violentmonkey.
2. Click the **Install** link of the script you want. Your userscript manager opens an install dialog.
3. Confirm. Updates are picked up automatically via the `@updateURL` in the script header.

Each script has its own README with usage, configuration and known limitations.

## Language

The user interface of both scripts is currently **German**. All texts are collected in a `TEXT` block at the top of each script, so they are easy to translate or change.

## Disclaimer

These scripts are unofficial community tools and are **not affiliated with or endorsed by Geocaching / Groundspeak**. They act only on your own logged-in session, and you are responsible for how you use them. Please read the [Geocaching Terms of Use](https://www.geocaching.com/about/termsofuse.aspx) and keep the built-in delays; do not use the scripts for bulk requests. The scripts depend on the current page structure of geocaching.com and can stop working when the site changes.

## Contributing

Bug reports and suggestions are welcome as [issues](https://github.com/fnolting/geocaching-userscripts/issues). For problems with a script, please include the browser, the userscript manager and the console output (the scripts log with a `[Shareables]` or `[Log Translator]` prefix).

## License

[MIT](LICENSE)
