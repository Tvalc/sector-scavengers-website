(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    function menuLabel(open) {
      if (window.SS_I18N && window.SS_I18N.t) {
        return open ? window.SS_I18N.t("aria.closeMenu") : window.SS_I18N.t("aria.openMenu");
      }
      return open ? "Close menu" : "Open menu";
    }

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", menuLabel(open));
      nav.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 768px)").matches) setOpen(false);
      });
    });

    document.addEventListener("ss:i18n-ready", function () {
      setOpen(nav.classList.contains("is-open"));
    });
  }

  document.querySelectorAll(".hero__video[data-hero-videos]").forEach(function (heroVideo) {
    var raw = heroVideo.getAttribute("data-hero-videos");
    var mp4Sources = raw
      ? raw
          .split(",")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
      : [];
    var ytRaw = heroVideo.getAttribute("data-hero-yt");
    var ytSources = ytRaw
      ? ytRaw
          .split(",")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
      : [];
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var idx = 0;
    var useYoutube = false;
    var frame = heroVideo.closest(".hero__video-frame");
    var figureInner = heroVideo.closest(".hero__figure-inner");
    var heroIframe = figureInner ? figureInner.querySelector(".hero__youtube") : null;
    var toolbar = frame ? frame.querySelector("[data-hero-toolbar]") : null;
    var elIndex = toolbar ? toolbar.querySelector("[data-hero-index]") : null;
    var elTotal = toolbar ? toolbar.querySelector("[data-hero-total]") : null;
    var btnPrev = toolbar ? toolbar.querySelector("[data-hero-prev]") : null;
    var btnNext = toolbar ? toolbar.querySelector("[data-hero-next]") : null;
    var btnMute = toolbar ? toolbar.querySelector("[data-hero-mute]") : null;
    var txtMute = toolbar ? toolbar.querySelector("[data-hero-mute-text]") : null;
    var clipCount = 0;

    function activeSources() {
      return useYoutube ? ytSources : mp4Sources;
    }

    function syncMuteUi() {
      if (!btnMute || useYoutube) return;
      var m = heroVideo.muted;
      var t = window.SS_I18N && window.SS_I18N.t ? window.SS_I18N.t.bind(window.SS_I18N) : function (k, fb) {
        return fb;
      };
      btnMute.setAttribute("aria-pressed", m ? "true" : "false");
      btnMute.setAttribute("aria-label", m ? t("aria.unmuteVideo", "Unmute video") : t("aria.muteVideo", "Mute video"));
      if (txtMute) txtMute.textContent = m ? t("aria.unmute", "Unmute") : t("aria.mute", "Mute");
    }

    function syncHeroToolbar() {
      if (!toolbar) return;
      var sources = activeSources();
      if (reduceMotion || !sources.length) {
        toolbar.hidden = true;
        return;
      }
      toolbar.hidden = false;
      if (btnMute) btnMute.hidden = useYoutube;
      if (elIndex) elIndex.textContent = String(idx + 1);
      if (elTotal) elTotal.textContent = String(sources.length);
      var multi = sources.length > 1;
      if (btnPrev) btnPrev.disabled = !multi;
      if (btnNext) btnNext.disabled = !multi;
    }

    function youtubeEmbedUrl(id) {
      return (
        "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(id) +
        "?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1"
      );
    }

    function enableYoutubeMode() {
      if (!heroIframe || !ytSources.length) return;
      useYoutube = true;
      clipCount = ytSources.length;
      heroVideo.hidden = true;
      heroVideo.removeAttribute("src");
      heroIframe.hidden = false;
      syncHeroToolbar();
    }

    function playAt(i) {
      var sources = activeSources();
      if (!sources.length) return;
      idx = ((i % sources.length) + sources.length) % sources.length;
      if (useYoutube && heroIframe) {
        heroIframe.src = youtubeEmbedUrl(sources[idx]);
      } else {
        heroVideo.src = sources[idx];
        heroVideo.load();
        if (!reduceMotion) {
          heroVideo.play().catch(function () {});
        }
      }
      syncHeroToolbar();
      syncMuteUi();
    }

    function bindHeroControls() {
      if (btnPrev) {
        btnPrev.addEventListener("click", function () {
          playAt(idx - 1);
        });
      }
      if (btnNext) {
        btnNext.addEventListener("click", function () {
          playAt(idx + 1);
        });
      }
      if (btnMute) {
        btnMute.addEventListener("click", function () {
          if (useYoutube) return;
          heroVideo.muted = !heroVideo.muted;
          syncMuteUi();
        });
      }
      heroVideo.addEventListener("volumechange", syncMuteUi);
      if (!useYoutube && mp4Sources.length > 1) {
        heroVideo.removeAttribute("loop");
        heroVideo.addEventListener("ended", function () {
          playAt(idx + 1);
        });
      } else if (!useYoutube) {
        heroVideo.setAttribute("loop", "");
      }
    }

    function startHeroPlayback() {
      clipCount = activeSources().length;
      if (!clipCount) return;
      if (reduceMotion) {
        syncHeroToolbar();
        return;
      }
      playAt(0);
      bindHeroControls();

      if (useYoutube) return;

      var heroSection = heroVideo.closest("section.hero, section.crew-visual, section");
      var heroInView = true;
      function syncHeroPlayback() {
        if (!heroVideo.getAttribute("src")) return;
        if (document.hidden || !heroInView) heroVideo.pause();
        else heroVideo.play().catch(function () {});
      }
      document.addEventListener("visibilitychange", syncHeroPlayback);
      if (heroSection && "IntersectionObserver" in window) {
        var heroVis = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              heroInView = e.isIntersecting;
            });
            syncHeroPlayback();
          },
          { rootMargin: "120px 0px", threshold: 0.01 },
        );
        heroVis.observe(heroSection);
      }
    }

    function mp4LooksValid(url) {
      return fetch(url, { method: "HEAD", cache: "no-store" })
        .then(function (res) {
          if (!res.ok) return false;
          var len = Number(res.headers.get("content-length") || 0);
          return len > 2000;
        })
        .catch(function () {
          return false;
        });
    }

    if (!mp4Sources.length && !ytSources.length) return;

    (mp4Sources.length ? mp4LooksValid(mp4Sources[0]) : Promise.resolve(false)).then(function (ok) {
      if (!ok) {
        if (!ytSources.length) return;
        enableYoutubeMode();
      }
      startHeroPlayback();
    });
  });

  /** Crew dossier loops: prefer MP4 over GIF (smaller decode cost, `preload="none"`, lazy src). */
  document.querySelectorAll("video.crew-card__loop[data-src]").forEach(function (crewVideo) {
    var dataSrc = crewVideo.getAttribute("data-src");
    if (!dataSrc) return;
    var crewReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (crewReduce) {
      crewVideo.hidden = true;
      crewVideo.removeAttribute("data-src");
      return;
    }
    var card = crewVideo.closest(".crew-card");
    var inView = false;
    var loaded = false;
    function bindPlayPause() {
      if (!loaded || !crewVideo.getAttribute("src")) return;
      if (document.hidden || !inView) crewVideo.pause();
      else crewVideo.play().catch(function () {});
    }
    function loadAndPlay() {
      if (!loaded) {
        loaded = true;
        crewVideo.src = dataSrc;
        crewVideo.removeAttribute("data-src");
        crewVideo.load();
      }
      bindPlayPause();
    }
    document.addEventListener("visibilitychange", bindPlayPause);
    if ("IntersectionObserver" in window && card) {
      var vis = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            inView = e.isIntersecting;
          });
          if (inView) loadAndPlay();
          else bindPlayPause();
        },
        { rootMargin: "100px 0px", threshold: 0.08 },
      );
      vis.observe(card);
    } else {
      loadAndPlay();
    }
  });


  document.querySelectorAll(".promo-img").forEach(function (img) {
    img.addEventListener("error", function () {
      const slot =
        img.closest(".gallery__card") ||
        img.closest(".gallery__mini") ||
        img.closest(".intel__cell");
      if (slot) slot.classList.add("promo-slot--missing");
    });
  });

  /** Comic strip: load `lore/origin/*.png` when present; otherwise one swap to `generated/*.webp`. */
  document.querySelectorAll("img[data-comic-fallback]").forEach(function (img) {
    var fb = img.getAttribute("data-comic-fallback");
    if (!fb) return;
    img.addEventListener("error", function onComicArtErr() {
      if (img.getAttribute("data-comic-fallback-used") === "1") {
        img.removeEventListener("error", onComicArtErr);
        return;
      }
      img.setAttribute("data-comic-fallback-used", "1");
      img.src = fb;
    });
  });

  const revealEls = document.querySelectorAll("[data-reveal]");
  const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  if (!motionOk || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  const io = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-visible");
        obs.unobserve(e.target);
      });
    },
    { rootMargin: "0px 0px -42px 0px", threshold: 0.05 },
  );
  revealEls.forEach(function (el) {
    io.observe(el);
  });

  document.addEventListener("ss:i18n-ready", function () {
    document.querySelectorAll(".hero__video[data-hero-videos]").forEach(function (heroVideo) {
      var frame = heroVideo.closest(".hero__video-frame");
      var toolbar = frame ? frame.querySelector("[data-hero-toolbar]") : null;
      var btnMute = toolbar ? toolbar.querySelector("[data-hero-mute]") : null;
      var txtMute = toolbar ? toolbar.querySelector("[data-hero-mute-text]") : null;
      if (btnMute && heroVideo) {
        var m = heroVideo.muted;
        var t = window.SS_I18N.t;
        btnMute.setAttribute("aria-label", m ? t("aria.unmuteVideo") : t("aria.muteVideo"));
        if (txtMute) txtMute.textContent = m ? t("aria.unmute") : t("aria.mute");
      }
    });
  });
})();
