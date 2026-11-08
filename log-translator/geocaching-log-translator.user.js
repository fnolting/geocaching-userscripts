// ==UserScript==
// @name         Geocaching Log Translator
// @name:de      Geocaching – Logs übersetzen
// @namespace    https://www.muggelfrei.at
// @author       SpeedCore
// @version      1.0.0
// @description  Adds a button to each log entry on geocaching.com that translates the log text to the browser language.
// @description:de Fügt jedem Log auf geocaching.com einen Button hinzu, der den Logtext in die Browsersprache übersetzt.
// @license      MIT
// @homepageURL  https://github.com/fnolting/geocaching-userscripts/tree/main/log-translator
// @supportURL   https://github.com/fnolting/geocaching-userscripts/issues
// @updateURL    https://raw.githubusercontent.com/fnolting/geocaching-userscripts/main/log-translator/geocaching-log-translator.user.js
// @downloadURL  https://raw.githubusercontent.com/fnolting/geocaching-userscripts/main/log-translator/geocaching-log-translator.user.js
// @match        https://www.geocaching.com/geocache/*
// @grant        none
// @icon         https://upload.wikimedia.org/wikipedia/commons/5/50/Antu_google-translate.svg
// @icon64       https://upload.wikimedia.org/wikipedia/commons/5/50/Antu_google-translate.svg
// ==/UserScript==

(function () {
  'use strict';

  // ======================= KONFIGURATION =======================
  const CONFIG = {
    // Zielsprache, z. B. 'de' oder 'en'. Leer = Sprache des Browsers (navigator.language)
    TARGET_LANG_OVERRIDE: '',

    // Inoffizieller Google-Translate-Endpunkt (kein API-Key nötig, kann sich jederzeit ändern)
    TRANSLATE_API_URL: 'https://translate.googleapis.com/translate_a/single',
    TRANSLATE_API_PARAMS: { client: 'gtx', sl: 'auto', dt: 't' },

    // Selektoren auf der Cache-Seite
    SELECTOR_LOG_CONTENT: 'div.LogContent.markdown-output',
    SELECTOR_ACTIONS_BAR: '.log-cta .AlignRight',

    BUTTON_CLASS: 'translate-log-btn',
    STYLE_BUTTON:
      'background:none;border:none;color:#3d76c5;cursor:pointer;font-size:0.9em;margin-left:6px;',
    STYLE_BUTTON_LOCKED:
      'color:#888;cursor:default;text-decoration:none;pointer-events:none;',
    STYLE_BUTTON_HOVER_ON: 'underline',
    STYLE_BUTTON_HOVER_OFF: 'none',

    LOG_PREFIX: '[Log Translator]',
  };

  const TEXT = {
    BUTTON: 'Übersetzen',
    BUSY: 'Übersetze...',
    DONE: 'Übersetzt',
    ERROR: 'Fehler ❌',
    HTTP_ERROR: (status) => `Übersetzungsdienst antwortete mit Status ${status}`,
  };
  // =============================================================

  const targetLang =
    CONFIG.TARGET_LANG_OVERRIDE ||
    (navigator.language || navigator.userLanguage).split('-')[0];

  // --- Google Translate (inoffizieller Endpunkt) ---
  async function translateText(text, lang) {
    const params = new URLSearchParams({ ...CONFIG.TRANSLATE_API_PARAMS, tl: lang, q: text });
    const response = await fetch(`${CONFIG.TRANSLATE_API_URL}?${params}`);
    if (!response.ok) throw new Error(TEXT.HTTP_ERROR(response.status));
    const data = await response.json();
    return data[0].map((part) => part[0]).join('');
  }

  // --- Übersetzten Text sicher anzeigen (ausschließlich als Text, nie als HTML) ---
  function renderTranslation(container, text) {
    const p = document.createElement('p');
    text.split('\n').forEach((line, i) => {
      if (i > 0) p.appendChild(document.createElement('br'));
      p.appendChild(document.createTextNode(line));
    });
    container.replaceChildren(p);
  }

  function lockButton(btn, label) {
    btn.textContent = label;
    btn.disabled = true;
    btn.style.cssText = CONFIG.STYLE_BUTTON + CONFIG.STYLE_BUTTON_LOCKED;
  }

  function createButton(logTextContainer) {
    const btn = document.createElement('button');
    btn.textContent = TEXT.BUTTON;
    btn.className = CONFIG.BUTTON_CLASS;
    btn.style.cssText = CONFIG.STYLE_BUTTON;

    btn.addEventListener('mouseenter', () => (btn.style.textDecoration = CONFIG.STYLE_BUTTON_HOVER_ON));
    btn.addEventListener('mouseleave', () => (btn.style.textDecoration = CONFIG.STYLE_BUTTON_HOVER_OFF));

    btn.addEventListener('click', async () => {
      lockButton(btn, TEXT.BUSY);
      const plainText = logTextContainer.innerText.trim();
      try {
        const translated = await translateText(plainText, targetLang);
        renderTranslation(logTextContainer, translated);
        lockButton(btn, TEXT.DONE);
      } catch (err) {
        console.error(CONFIG.LOG_PREFIX, err);
        btn.textContent = TEXT.ERROR;
      }
    });
    return btn;
  }

  // --- Logs finden und Buttons hinzufügen ---
  function addTranslateButtons() {
    document.querySelectorAll(CONFIG.SELECTOR_LOG_CONTENT).forEach((logTextContainer) => {
      const logRoot = logTextContainer.parentElement;
      if (logRoot.querySelector(`.${CONFIG.BUTTON_CLASS}`)) return; // Button existiert bereits

      const actionsBar = logRoot.querySelector(CONFIG.SELECTOR_ACTIONS_BAR);
      if (!actionsBar) return;

      actionsBar.appendChild(createButton(logTextContainer));
    });
  }

  // --- Nachgeladene Logs (Infinite Scroll) beobachten ---
  new MutationObserver(addTranslateButtons).observe(document.body, { childList: true, subtree: true });

  addTranslateButtons();
})();
