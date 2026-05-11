(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
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
  }

  document.querySelectorAll(".hero__video[data-hero-videos]").forEach(function (heroVideo) {
    var raw = heroVideo.getAttribute("data-hero-videos");
    var sources = raw
      ? raw
          .split(",")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
      : [];
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var idx = 0;
    var frame = heroVideo.closest(".hero__video-frame");
    var toolbar = frame ? frame.querySelector("[data-hero-toolbar]") : null;
    var elIndex = toolbar ? toolbar.querySelector("[data-hero-index]") : null;
    var elTotal = toolbar ? toolbar.querySelector("[data-hero-total]") : null;
    var btnPrev = toolbar ? toolbar.querySelector("[data-hero-prev]") : null;
    var btnNext = toolbar ? toolbar.querySelector("[data-hero-next]") : null;
    var btnMute = toolbar ? toolbar.querySelector("[data-hero-mute]") : null;
    var txtMute = toolbar ? toolbar.querySelector("[data-hero-mute-text]") : null;

    function syncMuteUi() {
      if (!btnMute) return;
      var m = heroVideo.muted;
      btnMute.setAttribute("aria-pressed", m ? "true" : "false");
      btnMute.setAttribute("aria-label", m ? "Unmute video" : "Mute video");
      if (txtMute) txtMute.textContent = m ? "Unmute" : "Mute";
    }

    function syncHeroToolbar() {
      if (!toolbar) return;
      if (reduceMotion || !sources.length) {
        toolbar.hidden = true;
        return;
      }
      toolbar.hidden = false;
      if (elIndex) elIndex.textContent = String(idx + 1);
      if (elTotal) elTotal.textContent = String(sources.length);
      var multi = sources.length > 1;
      if (btnPrev) btnPrev.disabled = !multi;
      if (btnNext) btnNext.disabled = !multi;
    }

    function playAt(i) {
      if (!sources.length) return;
      idx = ((i % sources.length) + sources.length) % sources.length;
      heroVideo.src = sources[idx];
      heroVideo.load();
      if (!reduceMotion) {
        heroVideo.play().catch(function () {});
      }
      syncHeroToolbar();
      syncMuteUi();
    }

    if (!sources.length) return;

    if (reduceMotion) {
      heroVideo.removeAttribute("src");
      heroVideo.load();
      syncHeroToolbar();
      return;
    }

    if (sources.length > 1) {
      heroVideo.removeAttribute("loop");
      heroVideo.addEventListener("ended", function () {
        playAt(idx + 1);
      });
    } else {
      heroVideo.setAttribute("loop", "");
    }
    playAt(0);

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
        heroVideo.muted = !heroVideo.muted;
        syncMuteUi();
      });
    }
    heroVideo.addEventListener("volumechange", syncMuteUi);

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
})();
