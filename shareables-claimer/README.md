# Geocaching Shareables Claimer

Claims the Shareables for your found geocaches automatically.

Normally you have to filter the search for "found by me" + "contains Shareable", open every listing and click **"Get this Shareable"**. This script does exactly that for you with one click.

## Install

[Install the script](https://raw.githubusercontent.com/fnolting/geocaching-userscripts/main/shareables-claimer/geocaching-shareables-claimer.user.js) (requires [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager).

## Usage

1. Log in to geocaching.com. A small Shareables icon appears in the header, to the left of the message center.
2. Click the icon. The script opens the search `https://www.geocaching.com/play/results?fb=<your username>&sh=1` (found by you, contains Shareable).
3. It collects all caches from all result pages, opens one listing after another and clicks the claim button.
4. When it is done, it opens the page with your received Shareables (`FINISH_URL`) and shows a short summary in the bottom right corner.

While a run is active the icon gets an orange outline. Click it again to stop the run.

Your username is read from the page header, so there is nothing to configure. If you want to override it, set `USERNAME_OVERRIDE`.

## First run: test mode

Every Shareable can only be claimed **once**, so the script ships with `DRY_RUN: true`. In this mode it walks through all listings, but does not click anything.

1. Run it with `DRY_RUN: true` and check the summary: "x with button" should match the number of caches where you see the claim button yourself.
2. Set `DRY_RUN` to `false` and run it again to claim the Shareables for real.
3. Check the page with your received Shareables to confirm that they arrived.

The script cannot verify a successful claim. It counts a cache as "claimed" when the claim button is gone after clicking.

## Configuration

All settings are in the `CONFIG` block at the top of the script.

| Option | Default | Description |
| --- | --- | --- |
| `DRY_RUN` | `true` | `true` = only look for claim buttons, do not click anything. |
| `USERNAME_OVERRIDE` | `''` | Use this username instead of the one from the page header. |
| `FINISH_URL` | received Shareables (table view) | Page that is opened after a run. |
| `RESULTS_URL_TEMPLATE` | `...results?fb={USER}&sh=1` | Search that lists your found caches with Shareables. |
| `TEST_COLLECT_ONLY` | `false` | Only collect caches from all result pages, do not open listings. Useful to test pagination. |
| `AUTO_START_ON_RESULTS` | `false` | Start automatically when the results page opens. |
| `PAGINATION_MAX_PAGES` | `100` | Upper limit for result pages. |
| `DELAY_BETWEEN_PAGES_MS` / `DELAY_BETWEEN_LISTINGS_MS` | `1000` / `2000` | Pauses between requests. Please do not shorten them. |
| `MAX_ATTEMPTS_PER_LISTING` | `2` | Protects against endless loops when a claim does not work. |

Texts, selectors and styles are configurable in the same block (`TEXT`, `SELECTOR_*`, `STYLE_*`).

## Known limitations

- Depends on the current HTML of geocaching.com (header, results list, pagination, claim button). If the site changes, the selectors in `CONFIG` may need an update.
- If the header button does not show up, the script falls back to a small panel with a start button in the bottom right corner.
- The user interface is German (see `TEXT`).

## Troubleshooting

Open the browser console (F12) and filter for `[Shareables]`. The script logs every step: collected caches, button found, click, result. If something does not work, include this output in your issue.
