/**
 * Sector Scavengers — client-side i18n (EN / JA / TR / ES).
 * Persists choice in localStorage; applies to nav, footer, [data-i18n], and phrase map.
 */
(function () {
  var STORAGE_KEY = "ss-lang";
  var SUPPORTED = ["en", "ja", "tr", "es"];
  var DEFAULT_LANG = "en";

  function scriptBase() {
    var s = document.currentScript;
    if (!s || !s.src) return "i18n/";
    var u = s.src.replace(/\/i18n\.js.*$/, "/");
    return u.endsWith("/") ? u : u + "/";
  }

  var BASE = scriptBase();
  var state = {
    lang: DEFAULT_LANG,
    dict: null,
    applying: false,
  };

  function normalizeLang(code) {
    if (!code) return DEFAULT_LANG;
    var c = String(code).toLowerCase().split("-")[0];
    return SUPPORTED.indexOf(c) >= 0 ? c : DEFAULT_LANG;
  }

  function getLang() {
    return normalizeLang(localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG);
  }

  function setLang(lang) {
    var next = normalizeLang(lang);
    localStorage.setItem(STORAGE_KEY, next);
    state.lang = next;
    return applyLang(next);
  }

  function t(key) {
    if (!state.dict) return key;
    var parts = key.split(".");
    var cur = state.dict;
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== "object") return key;
      cur = cur[parts[i]];
    }
    return typeof cur === "string" ? cur : key;
  }

  function fetchLocale(lang) {
    return fetch(BASE + "locales/" + lang + ".json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("locale " + lang);
      return r.json();
    });
  }

  function applyDataI18n(root) {
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      var val = t(key);
      if (val === key) return;
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
      else el.textContent = val;
    });
    root.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      var spec = el.getAttribute("data-i18n-attr");
      spec.split(";").forEach(function (pair) {
        var p = pair.trim().split(":");
        if (p.length !== 2) return;
        var attr = p[0].trim();
        var key = p[1].trim();
        var val = t(key);
        if (val !== key) el.setAttribute(attr, val);
      });
    });
  }

  function navKeyFromHref(href) {
    if (!href) return null;
    if (href.indexOf("#how") >= 0) return "nav.howItPlays";
    if (href.indexOf("crew") >= 0) return "nav.crew";
    if (href.indexOf("lore/index") >= 0 || /\/lore\/["']?$/.test(href)) return "nav.lore";
    if (href.indexOf("origin-story") >= 0) return "nav.origin";
    if (href.indexOf("beer-friday") >= 0) return "nav.beerFriday";
    if (href.indexOf("novel") >= 0) return "nav.novel";
    if (href.indexOf("#videos") >= 0) return "nav.videos";
    if (href.indexOf("#makko") >= 0) return "nav.makko";
    if (href.indexOf("steampowered.com") >= 0) return "nav.wishlist";
    return null;
  }

  function applyNav(root) {
    root.querySelectorAll(".nav a").forEach(function (a) {
      var key = navKeyFromHref(a.getAttribute("href") || "");
      if (key) {
        var val = t(key);
        if (val !== key) a.textContent = val;
      }
    });
    var nav = root.querySelector("#site-nav, .nav");
    if (nav) nav.setAttribute("aria-label", t("aria.primaryNav"));
  }

  function applyFooter(root) {
    var foot = root.querySelector(".site-footer");
    if (!foot) return;
    foot.querySelectorAll("a").forEach(function (a) {
      var key = navKeyFromHref(a.getAttribute("href") || "");
      if (key) {
        var val = t(key);
        if (val !== key) a.textContent = val;
      }
    });
    var copy = foot.querySelector(".site-footer__copy");
    if (copy && !copy.querySelector("a")) {
      var year = copy.textContent.match(/\d{4}/);
      copy.innerHTML = t("footer.copy").replace("{year}", year ? year[0] : String(new Date().getFullYear()));
    }
  }

  function applySkipLink(root) {
    root.querySelectorAll(".skip-link").forEach(function (el) {
      el.textContent = t("common.skipToContent");
    });
  }

  function applyPhrases(root) {
    var phrases = state.dict && state.dict.phrases;
    if (!phrases || state.lang === "en") return;
    var entries = Object.keys(phrases)
      .filter(function (k) {
        return k && phrases[k] && k.length > 2;
      })
      .sort(function (a, b) {
        return b.length - a.length;
      });

    var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, TEXTAREA: 1 };
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (skip[p.tagName]) return NodeFilter.FILTER_REJECT;
        if (p.closest("[data-i18n-skip]")) return NodeFilter.FILTER_REJECT;
        if (p.closest(".lang-switch")) return NodeFilter.FILTER_REJECT;
        var txt = node.nodeValue;
        if (!txt || !txt.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    var node;
    while ((node = walker.nextNode())) {
      var original = node.nodeValue;
      var next = original;
      for (var i = 0; i < entries.length; i++) {
        var en = entries[i];
        if (next.indexOf(en) !== -1) {
          next = next.split(en).join(phrases[en]);
        }
      }
      if (next !== original) {
        if (!node.__ssEn) node.__ssEn = original;
        node.nodeValue = next;
      }
    }
  }

  function restoreEnglishPhrases(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (node.__ssEn) {
        node.nodeValue = node.__ssEn;
        delete node.__ssEn;
      }
    }
  }

  function injectLangSwitch() {
    if (document.querySelector(".lang-switch")) return;
    var header = document.querySelector(".site-header__inner");
    if (!header) return;

    var wrap = document.createElement("div");
    wrap.className = "lang-switch";
    wrap.setAttribute("aria-label", t("ui.languageLabel"));

    var select = document.createElement("select");
    select.id = "ss-lang-select";
    select.className = "lang-switch__select";
    select.setAttribute("aria-label", t("ui.languageLabel"));

    SUPPORTED.forEach(function (code) {
      var opt = document.createElement("option");
      opt.value = code;
      opt.textContent = t("ui.lang." + code);
      if (code === state.lang) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", function () {
      setLang(select.value);
    });

    wrap.appendChild(select);
    var toggle = header.querySelector(".nav-toggle");
    if (toggle) header.insertBefore(wrap, toggle);
    else header.appendChild(wrap);
  }

  function applyLang(lang) {
    state.applying = true;
    return fetchLocale(lang)
      .then(function (dict) {
        state.dict = dict;
        state.lang = lang;
        document.documentElement.lang = lang === "en" ? "en" : lang;

        var root = document.body;
        if (lang === "en") restoreEnglishPhrases(root);
        applySkipLink(root);
        applyNav(root);
        applyFooter(root);
        applyDataI18n(root);
        if (lang !== "en") applyPhrases(root);

        var sel = document.getElementById("ss-lang-select");
        if (sel) sel.value = lang;
        var sw = document.querySelector(".lang-switch");
        if (sw) sw.setAttribute("aria-label", t("ui.languageLabel"));

        window.SS_I18N = {
          lang: lang,
          t: t,
          setLang: setLang,
        };
        document.dispatchEvent(new CustomEvent("ss:i18n-ready", { detail: { lang: lang } }));
        state.applying = false;
      })
      .catch(function () {
        state.applying = false;
        if (lang !== DEFAULT_LANG) return applyLang(DEFAULT_LANG);
      });
  }

  function init() {
    state.lang = getLang();
    injectLangSwitchPlaceholder();
    applyLang(state.lang).then(function () {
      var loading = document.querySelector(".lang-switch--loading");
      if (loading) loading.remove();
      injectLangSwitch();
    });
  }

  function injectLangSwitchPlaceholder() {
    var header = document.querySelector(".site-header__inner");
    if (!header || header.querySelector(".lang-switch")) return;
    var wrap = document.createElement("div");
    wrap.className = "lang-switch lang-switch--loading";
    var select = document.createElement("select");
    select.className = "lang-switch__select";
    select.disabled = true;
    select.innerHTML = "<option>…</option>";
    wrap.appendChild(select);
    var toggle = header.querySelector(".nav-toggle");
    if (toggle) header.insertBefore(wrap, toggle);
    else header.appendChild(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
