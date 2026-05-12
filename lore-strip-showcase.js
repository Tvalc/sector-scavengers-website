(function () {
  document.querySelectorAll("[data-lore-slideshow]").forEach(function (root) {
    var raw = root.getAttribute("data-lore-slideshow");
    var sources = raw
      ? raw.split(",").map(function (s) {
          return s.trim();
        }).filter(Boolean)
      : [];
    var img = root.querySelector(".lore-showcase__img");
    var toolbar = root.querySelector("[data-lore-ss-toolbar]");
    var elIndex = toolbar ? toolbar.querySelector("[data-lore-ss-index]") : null;
    var elTotal = toolbar ? toolbar.querySelector("[data-lore-ss-total]") : null;
    var btnPrev = toolbar ? toolbar.querySelector("[data-lore-ss-prev]") : null;
    var btnNext = toolbar ? toolbar.querySelector("[data-lore-ss-next]") : null;
    var btnAuto = toolbar ? toolbar.querySelector("[data-lore-ss-autoplay]") : null;
    var txtAuto = toolbar ? toolbar.querySelector("[data-lore-ss-autoplay-text]") : null;

    if (!img || !sources.length || !toolbar) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var intervalMs = parseInt(root.getAttribute("data-lore-slideshow-interval") || "4200", 10);
    if (intervalMs < 1200) intervalMs = 1200;

    var idx = 0;
    var timer = null;
    var autoOn = true;
    var inView = true;

    function syncToolbar() {
      var multi = sources.length > 1;
      if (elIndex) elIndex.textContent = String(idx + 1);
      if (elTotal) elTotal.textContent = String(sources.length);
      if (btnPrev) btnPrev.disabled = !multi;
      if (btnNext) btnNext.disabled = !multi;
      if (btnAuto) {
        btnAuto.hidden = reduceMotion || !multi;
        btnAuto.setAttribute("aria-pressed", autoOn ? "true" : "false");
        btnAuto.setAttribute("aria-label", autoOn ? "Pause slideshow" : "Play slideshow");
      }
      if (txtAuto && !reduceMotion && multi) {
        txtAuto.textContent = autoOn ? "Pause" : "Play";
      }
    }

    function show(i) {
      idx = ((i % sources.length) + sources.length) % sources.length;
      img.src = sources[idx];
      img.setAttribute("aria-label", "Strip replay, frame " + String(idx + 1) + " of " + String(sources.length));
      syncToolbar();
    }

    function clearTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function startTimer() {
      clearTimer();
      if (reduceMotion || sources.length < 2 || !autoOn || !inView) return;
      timer = setInterval(function () {
        show(idx + 1);
      }, intervalMs);
    }

    function syncPlayback() {
      clearTimer();
      if (!reduceMotion && sources.length > 1 && autoOn && inView) startTimer();
    }

    if (reduceMotion) {
      if (btnAuto) btnAuto.hidden = true;
      if (txtAuto) txtAuto.textContent = "";
      show(0);
      syncToolbar();
      if (btnPrev)
        btnPrev.addEventListener("click", function () {
          show(idx - 1);
        });
      if (btnNext)
        btnNext.addEventListener("click", function () {
          show(idx + 1);
        });
      return;
    }

    if (sources.length < 2) {
      toolbar.hidden = true;
      show(0);
      return;
    }

    toolbar.hidden = false;
    show(0);
    startTimer();

    if (btnPrev) {
      btnPrev.addEventListener("click", function () {
        show(idx - 1);
        syncPlayback();
      });
    }
    if (btnNext) {
      btnNext.addEventListener("click", function () {
        show(idx + 1);
        syncPlayback();
      });
    }
    if (btnAuto) {
      btnAuto.addEventListener("click", function () {
        autoOn = !autoOn;
        syncToolbar();
        syncPlayback();
      });
    }

    if ("IntersectionObserver" in window) {
      var vis = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            inView = e.isIntersecting;
          });
          syncPlayback();
        },
        { rootMargin: "80px 0px", threshold: 0.08 },
      );
      vis.observe(root);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearTimer();
      else syncPlayback();
    });
  });
})();
