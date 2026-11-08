// ==UserScript==
// @name         Geocaching Shareables Claimer
// @name:de      Geocaching – Shareables automatisch einlösen
// @namespace    https://www.muggelfrei.at
// @author       SpeedCore
// @version      1.0.0
// @description  Finds your found geocaches with unclaimed Shareables on geocaching.com and claims them automatically.
// @description:de Sucht gefundene Caches mit Shareables und löst diese automatisch ein.
// @license      MIT
// @homepageURL  https://github.com/fnolting/geocaching-userscripts/tree/main/shareables-claimer
// @supportURL   https://github.com/fnolting/geocaching-userscripts/issues
// @updateURL    https://raw.githubusercontent.com/fnolting/geocaching-userscripts/main/shareables-claimer/geocaching-shareables-claimer.user.js
// @downloadURL  https://raw.githubusercontent.com/fnolting/geocaching-userscripts/main/shareables-claimer/geocaching-shareables-claimer.user.js
// @match        https://www.geocaching.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-idle
// @icon         https://geocaching.com/favicon.ico
// @icon64       https://geocaching.com/favicon.ico
// ==/UserScript==

(function () {
    'use strict';

    // ======================= KONFIGURATION =======================
    const CONFIG = {
        // Username wird aus dem Header ausgelesen (eingeloggt). Nur setzen, um ihn zu überschreiben.
        USERNAME_OVERRIDE: '',
        SELECTOR_USERNAME: '.li-user .user-name',
        USERNAME_CACHE_KEY: 'shareableClaimerUsername', // zuletzt gelesener Username (Fallback)

        // Zielseite nach dem Durchlauf (dort wird auch die Zusammenfassung angezeigt)
        FINISH_URL: 'https://www.geocaching.com/play/shareables/received?view=table',

        // Gefilterte Suche: gefunden von mir (fb) + enthält Shareable (sh)
        RESULTS_URL_TEMPLATE: 'https://www.geocaching.com/play/results?fb={USER}&sh=1',
        LISTING_URL_TEMPLATE: 'https://www.geocaching.com/geocache/{GC}',

        // Testmodus: true = es wird NICHTS eingelöst, nur geloggt
        DRY_RUN: true,

        // Nur Caches sammeln (alle Seiten durchblättern), keine Listings öffnen.
        // Zum Testen der Pagination, z. B. mit RESULTS_URL_TEMPLATE ohne "&sh=1".
        TEST_COLLECT_ONLY: false,

        // Nach Seitenaufruf der Ergebnisliste automatisch starten (sonst per Button)
        AUTO_START_ON_RESULTS: false,

        // Button im Header: erster passender Eintrag gewinnt
        // position: 'before' = vor dem Element, 'prepend' = als erstes Kind im Element
        HEADER_ANCHORS: [
            { selector: 'li.messagecenterheaderwidget', position: 'before' },
            { selector: 'ul.logged-in-user', position: 'prepend' },
            { selector: '#ctl00_uxLoginStatus_divSignedIn', position: 'prepend' },
        ],
        WAIT_FOR_HEADER_MS: 15000,
        HEADER_BUTTON_CLASS: 'li-shareables',
        HEADER_ICON_URL: 'https://www.geocaching.com/play/Content/images/digital-treasures/how-it-works-finalize.svg',
        HEADER_ICON_FALLBACK: '🎁', // wird angezeigt, falls das Icon nicht geladen werden kann
        STYLE_HEADER_ITEM:
            'display:inline-flex;align-items:center;align-self:center;vertical-align:middle;' +
            'padding:0;list-style:none;',
        STYLE_HEADER_BUTTON:
            'display:inline-flex;align-items:center;justify-content:center;margin:0;padding:4px;' +
            'border:0;border-radius:4px;background:transparent;line-height:1;font-size:20px;' +
            'cursor:pointer;',
        STYLE_HEADER_BUTTON_ACTIVE: 'outline:2px solid #ff9800;', // zusätzlich, solange ein Lauf aktiv ist
        STYLE_HEADER_ICON: 'display:block;width:48px;height:40px;',

        // Selektoren / Muster
        SELECTOR_RESULT_LINKS: 'a[href*="/geocache/GC"]',
        SELECTOR_CLAIM_BUTTON: 'button[onclick*="ClaimShareable"]',
        GC_CODE_REGEX: /\/geocache\/(GC[0-9A-Z]+)/i,
        GC_CODE_FROM_PAGE_REGEX: /\b(GC[0-9A-Z]{2,})\b/,

        // Pagination: "Nächste Seite"-Element (erster Treffer, der nicht deaktiviert ist)
        SELECTORS_NEXT_PAGE: [
            'button[data-testid="gc-pagination-forward"]',
            'button[data-direction="forward"]',
            'a[rel="next"]',
            'button[aria-label*="next" i]',
            'a[aria-label*="next" i]',
            'button[aria-label*="weiter" i]',
            'a[aria-label*="weiter" i]',
            'button[title*="next" i]',
            'a[title*="next" i]',
            '[data-testid*="next" i]',
        ],
        PAGINATION_MAX_PAGES: 100,
        WAIT_FOR_RESULTS_TIMEOUT_MS: 15000,
        WAIT_FOR_PAGE_CHANGE_MS: 8000,
        DELAY_BETWEEN_PAGES_MS: 1000,

        // Ablauf im Listing
        WAIT_FOR_BUTTON_MS: 4000, // so lange nach dem Button gesucht wird
        DELAY_BEFORE_CLICK_MS: 800,
        DELAY_BETWEEN_LISTINGS_MS: 2000,
        MAX_ATTEMPTS_PER_LISTING: 2, // Schutz vor Endlosschleifen

        // Speicher-Schlüssel (GM-Storage)
        STORAGE_KEY: 'shareableClaimerState',

        LOG_PREFIX: '[Shareables]',
    };

    const SCRIPT_VERSION = GM_info.script.version; // kommt aus dem Header (@version)

    const TEXT = {
        START: 'Shareables einlösen',
        STOP: 'Stopp',
        IDLE: 'Bereit',
        COLLECTING: 'Sammle Caches …',
        NO_CACHES: 'Keine Caches mit offenen Shareables gefunden.',
        DRY_RUN_TAG: ' (Testmodus)',
        LABEL_CLAIMED: 'Eingelöst',
        LABEL_FOUND: 'Button gefunden (nicht geklickt)',
        LABEL_SKIPPED: 'Kein Button vorhanden',
        SUMMARY: (claimed, found, skipped) =>
            `Letzter Lauf: ${claimed} eingelöst, ${found} gefunden, ${skipped} übersprungen`,
        COLLECT_PROGRESS: (caches, page) => `Sammle Caches … ${caches} (Seite ${page})`,
        COLLECT_ONLY_DONE: (caches, pages) => `${caches} Caches auf ${pages} Seite(n) gesammelt (nur Sammeln)`,
        MAX_PAGES_REACHED: 'Maximale Seitenzahl erreicht, Sammeln beendet.',
        NO_USERNAME: 'Username nicht gefunden. Bitte einloggen oder USERNAME_OVERRIDE setzen.',
    };
    // =============================================================

    const log = (...a) => console.log(CONFIG.LOG_PREFIX, ...a);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // ---------- State ----------
    const defaultState = () => ({
        running: false,
        collecting: false,
        collected: [],
        pages: 0,
        lastSignature: '',
        queue: [],
        claimed: [],
        found: [], // Testmodus: Caches, bei denen ein Button gefunden wurde
        skipped: [], // Caches ohne Button
        attempts: {},
    });
    const loadState = () => ({ ...defaultState(), ...(GM_getValue(CONFIG.STORAGE_KEY, {}) || {}) });
    const saveState = (s) => GM_setValue(CONFIG.STORAGE_KEY, s);
    const resetState = () => GM_deleteValue(CONFIG.STORAGE_KEY);

    // ---------- UI ----------
    let panelEl, statusEl, buttonEl, headerButtonEl;
    let currentStatus = '';
    let currentLabel = '';
    let currentHandler = null;
    let hasSummary = false;

    function buildPanel() {
        const box = document.createElement('div');
        box.style.cssText =
            'position:fixed;bottom:16px;right:16px;z-index:99999;background:#fff;color:#222;' +
            'border:1px solid #02874D;border-radius:8px;padding:10px 12px;font:13px sans-serif;' +
            'box-shadow:0 2px 8px rgba(0,0,0,.25);min-width:200px;';
        statusEl = document.createElement('div');
        statusEl.style.marginBottom = '6px';
        buttonEl = document.createElement('button');
        buttonEl.type = 'button';
        buttonEl.style.cssText =
            'padding:4px 12px;border:1px solid #02874D;border-radius:4px;background:#02874D;' +
            'color:#fff;cursor:pointer;font-weight:600;';
        box.append(statusEl, buttonEl);
        document.body.appendChild(box);
        panelEl = box;
    }

    // Panel unten rechts: im Leerlauf ausgeblendet, sobald der Header-Button existiert
    function refreshPanel() {
        if (!panelEl) return;
        const hideIdle = headerButtonEl && currentStatus === TEXT.IDLE && !hasSummary;
        panelEl.style.display = hideIdle ? 'none' : '';
        buttonEl.style.display = headerButtonEl ? 'none' : '';
    }

    function setStatus(text) {
        currentStatus = text;
        if (statusEl) statusEl.textContent = text + (CONFIG.DRY_RUN ? TEXT.DRY_RUN_TAG : '');
        refreshPanel();
    }

    function setButton(label, handler) {
        currentLabel = label;
        currentHandler = handler;
        buttonEl.textContent = label;
        buttonEl.onclick = handler;
        updateHeaderButton(label, handler);
    }

    // Header-Button zeigt nur das Icon; der Text steht im Tooltip. Aktiver Lauf = Rahmen
    function updateHeaderButton(label, handler) {
        if (!headerButtonEl) return;
        headerButtonEl.title = label;
        headerButtonEl.setAttribute('aria-label', label);
        headerButtonEl.onclick = handler;
        headerButtonEl.style.cssText =
            CONFIG.STYLE_HEADER_BUTTON + (label === TEXT.STOP ? CONFIG.STYLE_HEADER_BUTTON_ACTIVE : '');
    }

    function findHeaderAnchor() {
        for (const { selector, position } of CONFIG.HEADER_ANCHORS) {
            const el = document.querySelector(selector);
            if (el) return { el, position, selector };
        }
        return null;
    }

    function insertHeaderItem(item, { el, position }) {
        if (position === 'prepend') el.prepend(item);
        else el.parentNode.insertBefore(item, el);
    }

    async function attachHeaderButton() {
        const anchor = await waitFor(findHeaderAnchor, CONFIG.WAIT_FOR_HEADER_MS);
        if (!anchor) {
            log('Header-Element nicht gefunden, verwende das Panel unten rechts. Gesucht:',
                CONFIG.HEADER_ANCHORS.map((a) => a.selector));
            return;
        }
        const item = document.createElement('li');
        item.className = CONFIG.HEADER_BUTTON_CLASS;
        item.style.cssText = CONFIG.STYLE_HEADER_ITEM;
        headerButtonEl = document.createElement('button');
        headerButtonEl.type = 'button';
        const icon = document.createElement('img');
        icon.src = CONFIG.HEADER_ICON_URL;
        icon.alt = '';
        icon.style.cssText = CONFIG.STYLE_HEADER_ICON;
        icon.onerror = () => icon.replaceWith(document.createTextNode(CONFIG.HEADER_ICON_FALLBACK));
        headerButtonEl.appendChild(icon);
        item.appendChild(headerButtonEl);
        insertHeaderItem(item, anchor);
        log('Header-Button eingefügt (Anker:', anchor.selector + ')');
        setButton(currentLabel, currentHandler);
        refreshPanel();

        // Falls die Seite (oder ein anderes Script wie GClh II) den Header neu aufbaut: erneut einfügen
        new MutationObserver(() => {
            if (item.isConnected) return;
            const again = findHeaderAnchor();
            if (again) insertHeaderItem(item, again);
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ---------- Hilfsfunktionen ----------
    async function waitFor(fn, timeoutMs, intervalMs = 300) {
        const end = Date.now() + timeoutMs;
        while (Date.now() < end) {
            const r = fn();
            if (r && (!('length' in Object(r)) || r.length > 0)) return r;
            await sleep(intervalMs);
        }
        return null;
    }

    const getResultCodes = () => {
        const codes = new Set();
        document.querySelectorAll(CONFIG.SELECTOR_RESULT_LINKS).forEach((a) => {
            const m = a.getAttribute('href').match(CONFIG.GC_CODE_REGEX);
            if (m) codes.add(m[1].toUpperCase());
        });
        return codes;
    };

    const pageSignature = () => [...getResultCodes()].sort().join(',');

    function getCurrentGcCode() {
        const m = location.pathname.match(CONFIG.GC_CODE_REGEX);
        if (m) return m[1].toUpperCase();
        const t = document.title.match(CONFIG.GC_CODE_FROM_PAGE_REGEX);
        return t ? t[1].toUpperCase() : null;
    }

    const listingUrl = (gc) => CONFIG.LISTING_URL_TEMPLATE.replace('{GC}', gc);

    // Username: Override > Header (eingeloggt) > zuletzt gespeicherter Wert
    function getUsername() {
        if (CONFIG.USERNAME_OVERRIDE) return CONFIG.USERNAME_OVERRIDE;
        const el = document.querySelector(CONFIG.SELECTOR_USERNAME);
        const name = el ? el.textContent.trim() : '';
        if (name) {
            GM_setValue(CONFIG.USERNAME_CACHE_KEY, name);
            return name;
        }
        return GM_getValue(CONFIG.USERNAME_CACHE_KEY, '');
    }

    function getResultsUrl() {
        const username = getUsername();
        if (!username) return null;
        return CONFIG.RESULTS_URL_TEMPLATE.replace('{USER}', encodeURIComponent(username));
    }
    const isResultsPage = () => location.pathname.startsWith('/play/results');
    const isFinishPage = () => location.pathname === new URL(CONFIG.FINISH_URL).pathname;

    function isDisabled(el) {
        return el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled');
    }

    function findNextButton() {
        for (const selector of CONFIG.SELECTORS_NEXT_PAGE) {
            const el = [...document.querySelectorAll(selector)].find((e) => !isDisabled(e));
            if (el) return el;
        }
        return null;
    }

    // ---------- Ergebnisliste (Pagination) ----------
    async function startRun() {
        const url = getResultsUrl();
        if (!url) {
            log(TEXT.NO_USERNAME);
            setStatus(TEXT.NO_USERNAME);
            return;
        }
        const state = defaultState();
        state.running = true;
        state.collecting = true;
        saveState(state);
        log('Starte mit Suche:', url);
        // Suche immer über die konfigurierte URL aufrufen; das Sammeln startet nach dem Laden (init)
        location.href = url;
    }

    async function collectLoop() {
        const state = loadState();
        setButton(TEXT.STOP, stopRun);
        setStatus(TEXT.COLLECTING);

        for (;;) {
            const codes = await waitFor(
                () => (getResultCodes().size ? [...getResultCodes()] : null),
                CONFIG.WAIT_FOR_RESULTS_TIMEOUT_MS
            );
            if (!codes) break;

            const signature = pageSignature();
            if (signature === state.lastSignature) break; // gleiche Seite wie zuvor -> Ende

            codes.forEach((c) => {
                if (!state.collected.includes(c)) state.collected.push(c);
            });
            state.pages += 1;
            state.lastSignature = signature;
            saveState(state);
            setStatus(TEXT.COLLECT_PROGRESS(state.collected.length, state.pages));
            log(`Seite ${state.pages}: ${codes.length} Caches`);

            if (state.pages >= CONFIG.PAGINATION_MAX_PAGES) {
                log(TEXT.MAX_PAGES_REACHED);
                break;
            }
            const next = findNextButton();
            if (!next) {
                log('Kein "Nächste Seite"-Element gefunden -> letzte Seite');
                break;
            }

            await sleep(CONFIG.DELAY_BETWEEN_PAGES_MS);
            next.click(); // bei kompletter Navigation startet das Script auf der neuen Seite neu

            const changed = await waitFor(
                () => (pageSignature() && pageSignature() !== signature ? [1] : null),
                CONFIG.WAIT_FOR_PAGE_CHANGE_MS
            );
            if (!changed) {
                log('Seite hat sich nach Klick nicht geändert -> Ende');
                break;
            }
        }
        finishCollecting(loadState());
    }

    function finishCollecting(state) {
        state.collecting = false;
        state.queue = state.collected.slice();
        log(`Gesammelt: ${state.queue.length} Caches auf ${state.pages} Seite(n)`, state.queue);

        if (!state.queue.length) {
            state.running = false;
            saveState(state);
            setStatus(TEXT.NO_CACHES);
            setButton(TEXT.START, startRun);
            return;
        }
        if (CONFIG.TEST_COLLECT_ONLY) {
            state.running = false;
            saveState(state);
            setStatus(TEXT.COLLECT_ONLY_DONE(state.queue.length, state.pages));
            setButton(TEXT.START, startRun);
            return;
        }
        saveState(state);
        goToNext(state);
    }

    function stopRun() {
        const s = loadState();
        s.running = false;
        s.collecting = false;
        saveState(s);
        setStatus(TEXT.IDLE);
        setButton(TEXT.START, startRun);
    }

    async function goToNext(state) {
        await sleep(CONFIG.DELAY_BETWEEN_LISTINGS_MS);
        if (!state.queue.length) {
            finishRun(state);
            return;
        }
        location.href = listingUrl(state.queue[0]);
    }

    function finishRun(state) {
        state.running = false;
        saveState(state);
        log('Fertig. Eingelöst:', state.claimed, 'Übersprungen:', state.skipped);
        location.href = CONFIG.FINISH_URL;
    }

    // ---------- Listing ----------
    async function handleListing() {
        const state = loadState();
        const gc = getCurrentGcCode();
        if (!state.running || !gc || state.queue[0] !== gc) return;

        setButton(TEXT.STOP, stopRun);
        setStatus(`${gc}: prüfe … (noch ${state.queue.length})`);

        const btn = await waitFor(
            () => document.querySelector(CONFIG.SELECTOR_CLAIM_BUTTON),
            CONFIG.WAIT_FOR_BUTTON_MS
        );

        // Kein Button (mehr) -> erledigt bzw. nichts abzuholen
        if (!btn) {
            const wasClicked = (state.attempts[gc] || 0) > 0;
            (wasClicked ? state.claimed : state.skipped).push(gc);
            state.queue.shift();
            saveState(state);
            log(gc, wasClicked ? 'eingelöst' : 'kein Button vorhanden');
            return goToNext(state);
        }

        state.attempts[gc] = (state.attempts[gc] || 0) + 1;

        if (CONFIG.DRY_RUN) {
            btn.style.outline = '3px solid orange';
            log(gc, 'Button gefunden (Testmodus, kein Klick)');
            state.found.push(gc);
            state.queue.shift();
            saveState(state);
            return goToNext(state);
        }

        if (state.attempts[gc] > CONFIG.MAX_ATTEMPTS_PER_LISTING) {
            log(gc, 'zu viele Versuche, überspringe');
            state.skipped.push(gc);
            state.queue.shift();
            saveState(state);
            return goToNext(state);
        }

        saveState(state); // Versuch merken, bevor die Seite neu lädt
        await sleep(CONFIG.DELAY_BEFORE_CLICK_MS);
        log(gc, 'klicke auf Shareable-Button');
        btn.click(); // löst __doPostBack aus -> Seite lädt neu
    }

    // ---------- Zusammenfassung des letzten Laufs ----------
    function showLastSummary(state) {
        const total = state.claimed.length + state.found.length + state.skipped.length;
        if (state.running || !total) return;
        const summary = TEXT.SUMMARY(state.claimed.length, state.found.length, state.skipped.length);
        log(summary);
        console.table({
            [TEXT.LABEL_CLAIMED]: state.claimed,
            [TEXT.LABEL_FOUND]: state.found,
            [TEXT.LABEL_SKIPPED]: state.skipped,
        });
        const info = document.createElement('div');
        info.style.cssText = 'margin-bottom:6px;font-size:12px;color:#555;';
        info.textContent = summary;
        hasSummary = true;
        refreshPanel();
        if (state.found.length) info.title = `${TEXT.LABEL_FOUND}: ${state.found.join(', ')}`;
        statusEl.after(info);
    }

    // ---------- Start ----------
    async function init() {
        log(`Script gestartet (v${SCRIPT_VERSION}) auf`, location.href);
        buildPanel();
        setStatus(TEXT.IDLE);
        setButton(TEXT.START, startRun);
        attachHeaderButton(); // bewusst nicht awaited, damit der Ablauf nicht blockiert

        if (!isResultsPage()) {
            if (isFinishPage()) showLastSummary(loadState());
            await handleListing();
            return;
        }

        const state = loadState();
        if (state.running && state.collecting) {
            collectLoop(); // Fortsetzung nach Seitenwechsel in der Pagination
            return;
        }
        if (state.running && !state.queue.length) resetState();
        showLastSummary(state);
        if (CONFIG.AUTO_START_ON_RESULTS) startRun();
    }

    init();
})();
