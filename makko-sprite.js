/**
 * Plays MAKKO Sprite Studio JSON + WebP atlases (same format as sector-scavengers/sprites-manifest.json).
 * Use: <canvas data-makko-json="…json" data-makko-image="…webp" width="200" height="234"></canvas>
 */
(function () {
  function sortedFrameKeys(framesObj) {
    return Object.keys(framesObj).sort(function (a, b) {
      var ma = /_(\d+)\.png$/i.exec(a);
      var mb = /_(\d+)\.png$/i.exec(b);
      return (ma ? parseInt(ma[1], 10) : 0) - (mb ? parseInt(mb[1], 10) : 0);
    });
  }

  function buildFrameList(data) {
    var keys = sortedFrameKeys(data.frames);
    var tags = data.meta && data.meta.frameTags;
    if (tags && tags.length && tags[0]) {
      var t = tags[0];
      var from = typeof t.from === "number" ? t.from : 0;
      var to = typeof t.to === "number" ? t.to : keys.length - 1;
      keys = keys.slice(from, to + 1);
    }
    return keys.map(function (k) {
      var f = data.frames[k];
      var dur = f.duration != null ? f.duration : 33;
      return {
        sx: f.frame.x,
        sy: f.frame.y,
        sw: f.frame.w,
        sh: f.frame.h,
        durationSec: dur / 1000,
      };
    });
  }

  function drawFrame(canvas, ctx, img, frame, anchor, cssW, cssH, dpr) {
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    var sw = frame.sw;
    var sh = frame.sh;
    var scale = Math.min(cssW / sw, cssH / sh);
    var dw = sw * scale;
    var dh = sh * scale;
    var footX = cssW / 2;
    var footY = cssH - 2;
    var dx = footX - anchor.x * scale;
    var dy = footY - anchor.y * scale;
    ctx.drawImage(img, frame.sx, frame.sy, sw, sh, dx, dy, dw, dh);
  }

  function boot(canvas) {
    var jsonUrl = canvas.getAttribute("data-makko-json");
    var imgUrl = canvas.getAttribute("data-makko-image");
    if (!jsonUrl || !imgUrl) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    fetch(jsonUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("json");
        return r.json();
      })
      .then(function (data) {
        var frames = buildFrameList(data);
        if (!frames.length) return;
        var anchor = (data.meta && data.meta.anchor) || { x: 0, y: 0 };

        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
          function cssSize() {
            var r = canvas.getBoundingClientRect();
            var w = r.width || parseInt(canvas.getAttribute("width"), 10) || 200;
            var h = r.height || parseInt(canvas.getAttribute("height"), 10) || 234;
            if (w < 8) w = parseInt(canvas.getAttribute("width"), 10) || 200;
            if (h < 8) h = parseInt(canvas.getAttribute("height"), 10) || 234;
            return { w: w, h: h };
          }

          function paint(i) {
            var s = cssSize();
            drawFrame(canvas, ctx, img, frames[i], anchor, s.w, s.h, Math.min(window.devicePixelRatio || 1, 2));
          }

          if (reduceMotion) {
            paint(0);
            return;
          }

          var i = 0;
          var acc = 0;
          var last = performance.now();

          function tick(now) {
            var dt = (now - last) / 1000;
            last = now;
            acc += dt;
            if (acc >= frames[i].durationSec) {
              acc = 0;
              i = (i + 1) % frames.length;
            }
            paint(i);
            requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        };
        img.onerror = function () {
          canvas.classList.add("makko-sprite-canvas--failed");
        };
        img.src = imgUrl;
      })
      .catch(function () {
        canvas.classList.add("makko-sprite-canvas--failed");
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("canvas[data-makko-json][data-makko-image]").forEach(boot);
  });
})();
