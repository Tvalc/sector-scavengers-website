(function () {
  if (!document.body.classList.contains("origin-story-page")) return;

  var dots = document.querySelectorAll(".b-rail__dot");
  var chapters = document.querySelectorAll("[data-origin-ch]");
  if (!dots.length || !chapters.length) return;

  function activeIndex() {
    var mid = window.innerHeight * 0.38;
    var best = -1;
    var bestD = Infinity;
    chapters.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 80 || r.top > window.innerHeight - 80) return;
      var c = r.top + r.height * 0.35;
      var d = Math.abs(c - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function paintRail() {
    var i = activeIndex();
    dots.forEach(function (d, j) {
      d.classList.toggle("is-active", j === i);
    });
  }

  window.addEventListener("scroll", paintRail, { passive: true });
  window.addEventListener("resize", paintRail, { passive: true });
  paintRail();
})();
