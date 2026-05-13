/**
 * Generic comic-strip slideshow engine for social recording.
 *
 * Pages: lore/origin-story-slideshow.html, lore/beer-friday-slideshow.html
 *
 * Each page provides its slides via a global object set BEFORE this script
 * loads, e.g.:
 *   window.LORE_SLIDESHOW = {
 *     slides: [{ src, tag, caption }, ...],
 *     altLabelPrefix: "Wake into ledger",
 *   };
 *
 * Defaults:
 *   - intervalMs: from URL ?interval=, then root [data-interval], then 6300.
 *   - cleanStart: URL ?record=1 or ?clean=1.
 */
(function () {
  var root = document.getElementById("origin-ss-root");
  if (!root) return;

  var SLIDES = (window.LORE_SLIDESHOW && window.LORE_SLIDESHOW.slides) || [];
  var altPrefix = (window.LORE_SLIDESHOW && window.LORE_SLIDESHOW.altLabelPrefix) || "Strip";
  if (!SLIDES.length) return;

  var params = new URLSearchParams(window.location.search);
  var intervalMs = parseInt(params.get("interval") || root.getAttribute("data-interval") || "6300", 10);
  if (intervalMs < 1200) intervalMs = 1200;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cleanStart = params.get("record") === "1" || params.get("clean") === "1";

  var elImg = root.querySelector("[data-origin-ss-img]");
  var elTag = root.querySelector("[data-origin-ss-tag]");
  var elCaption = root.querySelector("[data-origin-ss-caption]");
  var elIndex = root.querySelector("[data-origin-ss-index]");
  var elTotal = root.querySelector("[data-origin-ss-total]");
  var elProgress = root.querySelector("[data-origin-ss-progress]");
  var btnPrev = root.querySelector("[data-origin-ss-prev]");
  var btnNext = root.querySelector("[data-origin-ss-next]");
  var btnPlay = root.querySelector("[data-origin-ss-play]");
  var btnFs = root.querySelector("[data-origin-ss-fs]");

  var idx = 0;
  var timer = null;
  var progressTimer = null;
  var progressStart = 0;
  var autoOn = !reduceMotion;

  function setClean(on) {
    document.body.classList.toggle("origin-ss--clean", Boolean(on));
  }

  if (cleanStart) setClean(true);

  function show(i) {
    idx = ((i % SLIDES.length) + SLIDES.length) % SLIDES.length;
    var s = SLIDES[idx];
    elImg.src = s.src;
    elImg.alt = altPrefix + ", frame " + String(idx + 1) + " of " + String(SLIDES.length) + ": " + s.caption;
    elTag.textContent = s.tag;
    elCaption.textContent = s.caption;
    if (elIndex) elIndex.textContent = String(idx + 1);
    if (elTotal) elTotal.textContent = String(SLIDES.length);
    restartProgressAnimation();
  }

  function clearTimers() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (progressTimer) {
      cancelAnimationFrame(progressTimer);
      progressTimer = null;
    }
    if (elProgress) elProgress.style.transform = "scaleX(0)";
  }

  function tickProgress() {
    if (!elProgress || !autoOn || reduceMotion) return;
    var elapsed = Date.now() - progressStart;
    var t = Math.min(1, elapsed / intervalMs);
    elProgress.style.transform = "scaleX(" + String(t) + ")";
    if (t < 1) progressTimer = requestAnimationFrame(tickProgress);
  }

  function restartProgressAnimation() {
    if (progressTimer) cancelAnimationFrame(progressTimer);
    progressStart = Date.now();
    if (elProgress) elProgress.style.transform = "scaleX(0)";
    if (autoOn && !reduceMotion && SLIDES.length > 1) progressTimer = requestAnimationFrame(tickProgress);
  }

  function syncPlayLabel() {
    if (!btnPlay) return;
    btnPlay.setAttribute("aria-pressed", autoOn ? "true" : "false");
    btnPlay.textContent = autoOn ? "Pause" : "Play";
  }

  function startAdvanceTimer() {
    clearTimers();
    if (reduceMotion || SLIDES.length < 2 || !autoOn) return;
    restartProgressAnimation();
    timer = setInterval(function () {
      show(idx + 1);
    }, intervalMs);
  }

  function go(delta) {
    show(idx + delta);
    startAdvanceTimer();
  }

  show(0);
  syncPlayLabel();
  startAdvanceTimer();

  if (btnPrev) btnPrev.addEventListener("click", function () { go(-1); });
  if (btnNext) btnNext.addEventListener("click", function () { go(1); });
  if (btnPlay) {
    btnPlay.addEventListener("click", function () {
      autoOn = !autoOn;
      syncPlayLabel();
      startAdvanceTimer();
    });
  }

  if (btnFs) {
    btnFs.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "h" || e.key === "H") {
      setClean(!document.body.classList.contains("origin-ss--clean"));
    } else if (e.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) clearTimers();
    else startAdvanceTimer();
  });

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) startAdvanceTimer();
  });
})();
