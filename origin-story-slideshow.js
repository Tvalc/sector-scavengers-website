/**
 * Full-screen origin strip slideshow for social recording.
 * Page: lore/origin-story-slideshow.html
 */
(function () {
  var root = document.getElementById("origin-ss-root");
  if (!root) return;

  var SLIDES = [
    {
      src: "../media/origin-story/SS-Background-Origin-Story-Panel-1.png",
      tag: "01 · Layoffs",
      caption: "In 2026 the layoffs stop pretending to be temporary.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Story-Panel-2.png",
      tag: "02 · Exit path",
      caption: "HR calls the packet an exit path.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Panel-3.png",
      tag: "03 · Vaults as spectacle",
      caption: "The vaults turn into something you photograph.",
    },
    {
      src: "../media/origin-story/SS-Background-BudgetCryo-Origin-Panel-4.png",
      tag: "04 · New paperwork",
      caption: "Scarcity does not vanish. It only learns new paperwork.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Warehouse-Panel-5.png",
      tag: "05 · Warehouse",
      caption: "Someone notices a shelf can hold a person the same way it holds a crate.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Warehouse-Panel-6.png",
      tag: "06 · Bad inventory",
      caption: "The count goes wrong slowly, then all at once.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Warehouse-Panel-6b.png",
      tag: "06 · Bad inventory",
      caption: "The count goes wrong slowly, then all at once.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-ShipLoad-Panel-7.png",
      tag: "07 · Sold to salvage",
      caption: "A broker prints a lot that includes warm bodies still under contract.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-ShipLoad-Panel-7b.png",
      tag: "07 · Sold to salvage",
      caption: "A broker prints a lot that includes warm bodies still under contract.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-ShipLoad-Panel-7c.png",
      tag: "07 · Sold to salvage",
      caption: "A broker prints a lot that includes warm bodies still under contract.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-ShipLoad-Panel-7d.png",
      tag: "07 · Sold to salvage",
      caption: "A broker prints a lot that includes warm bodies still under contract.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Wakeup-Panel-8.png",
      tag: "08 · Thaw",
      caption:
        "Thaw alarms go off in batches. Millions sit up into the same bright UI, same total, same due date.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-ShipLoad-Panel-8b.png",
      tag: "08 · Thaw",
      caption:
        "Thaw alarms go off in batches. Millions sit up into the same bright UI, same total, same due date.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-SalvageRun-Panel-9.png",
      tag: "09 · Debris field",
      caption: "The bus run drops them at the junk tide line. The first wreck is a wall of bent metal and old paint.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-SalvageRun-Panel-9b.png",
      tag: "09 · Debris field",
      caption: "The bus run drops them at the junk tide line. The first wreck is a wall of bent metal and old paint.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-SalvageRun-Panel-9c.png",
      tag: "09 · Debris field",
      caption: "The bus run drops them at the junk tide line. The first wreck is a wall of bent metal and old paint.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Boarding-Panel-10.png",
      tag: "10 · Boarding",
      caption:
        "The derelict's mouth is a dark rectangle cut into a hull that used to belong to someone proud.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Boarding-Panel-10b.png",
      tag: "10 · Boarding",
      caption:
        "The derelict's mouth is a dark rectangle cut into a hull that used to belong to someone proud.",
    },
    {
      src: "../media/origin-story/SS-Background-Origin-Boarding-Panel-10c.png",
      tag: "10 · Boarding",
      caption:
        "The derelict's mouth is a dark rectangle cut into a hull that used to belong to someone proud.",
    },
    {
      src: "../media/origin-story/SS-Website-Explore-Panel.png",
      tag: "11 · Explore",
      caption: "The map lies until you pay it in actions.",
    },
  ];

  var params = new URLSearchParams(window.location.search);
  var intervalMs = parseInt(params.get("interval") || root.getAttribute("data-interval") || "4200", 10);
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
  var elHud = root.querySelector("[data-origin-ss-hud]");
  var elHelp = root.querySelector("[data-origin-ss-help]");

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
    elImg.alt = "Wake into ledger, frame " + String(idx + 1) + " of " + String(SLIDES.length) + ": " + s.caption;
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
