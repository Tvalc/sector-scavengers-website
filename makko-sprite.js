/**
 * Plays MAKKO Sprite Studio JSON + WebP atlases (same format as sector-scavengers/sprites-manifest.json).
 * Use: <canvas data-makko-json="…json" data-makko-image="…webp" width="200" height="234"></canvas>
 * Optional: data-makko-frame-tag="Idle" — pick that frame tag by name (case-insensitive); default is first tag.
 */
(function () {
  function frameSortIndex(key) {
    var m = /(\d+)(?=\.(png|webp)$)/i.exec(key);
    return m ? parseInt(m[1], 10) : -1;
  }

  function sortedFrameKeys(framesObj) {
    var keys = Object.keys(framesObj);
    return keys.sort(function (a, b) {
      var ia = frameSortIndex(a);
      var ib = frameSortIndex(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b);
    });
  }

  function pickFrameTag(tags, preferredName) {
    if (!tags || !tags.length) return null;
    if (!preferredName) return tags[0];
    var want = String(preferredName).trim().toLowerCase();
    if (!want) return tags[0];
    for (var i = 0; i < tags.length; i++) {
      var n = tags[i] && tags[i].name;
      if (n && String(n).toLowerCase() === want) return tags[i];
    }
    return tags[0];
  }

  function buildFrameList(data, preferredTagName) {
    var keys = sortedFrameKeys(data.frames);
    var tags = data.meta && data.meta.frameTags;
    if (tags && tags.length) {
      var t = pickFrameTag(tags, preferredTagName);
      if (t) {
        var from = typeof t.from === "number" ? t.from : 0;
        var to = typeof t.to === "number" ? t.to : keys.length - 1;
        from = Math.max(0, Math.min(from, keys.length - 1));
        to = Math.max(from, Math.min(to, keys.length - 1));
        keys = keys.slice(from, to + 1);
      }
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
    var sw0 = frame.sw;
    var sh0 = frame.sh;
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var sx = Math.max(0, Math.min(frame.sx, Math.max(0, iw - 1)));
    var sy = Math.max(0, Math.min(frame.sy, Math.max(0, ih - 1)));
    var sw = Math.max(1, Math.min(sw0, iw - sx));
    var sh = Math.max(1, Math.min(sh0, ih - sy));
    var scale = Math.min(cssW / sw, cssH / sh);
    var dw = sw * scale;
    var dh = sh * scale;
    var footX = cssW / 2;
    var footY = cssH - 2;
    var dx = footX - anchor.x * scale;
    var dy = footY - anchor.y * scale;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function shouldUseCrossOrigin(imgUrl) {
    try {
      if (!/^https?:\/\//i.test(imgUrl)) return false;
      var u = new URL(imgUrl, window.location.href);
      return u.origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function boot(canvas) {
    var jsonUrl = canvas.getAttribute("data-makko-json");
    var imgUrl = canvas.getAttribute("data-makko-image");
    if (!jsonUrl || !imgUrl) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var preferredTag = canvas.getAttribute("data-makko-frame-tag") || canvas.getAttribute("data-makko-tag");

    fetch(jsonUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("json");
        return r.json();
      })
      .then(function (data) {
        var frames = buildFrameList(data, preferredTag);
        if (!frames.length) return;
        var fpsAttr = canvas.getAttribute("data-makko-fps");
        var fps = fpsAttr ? parseFloat(fpsAttr, 10) : NaN;
        if (fps > 0 && isFinite(fps)) {
          var frameSec = 1 / fps;
          for (var fi = 0; fi < frames.length; fi++) {
            frames[fi].durationSec = frameSec;
          }
        }
        var anchor = (data.meta && data.meta.anchor) || { x: 0, y: 0 };

        var img = new Image();
        if (shouldUseCrossOrigin(imgUrl)) img.crossOrigin = "anonymous";
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

  function bootWhenVisible(canvas) {
    if (canvas.getAttribute("data-makko-booted") === "1") return;
    if (canvas.getAttribute("data-makko-boot") === "immediate") {
      canvas.setAttribute("data-makko-booted", "1");
      boot(canvas);
      return;
    }
    if (!("IntersectionObserver" in window)) {
      canvas.setAttribute("data-makko-booted", "1");
      boot(canvas);
      return;
    }
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          obs.unobserve(canvas);
          canvas.setAttribute("data-makko-booted", "1");
          boot(canvas);
        });
      },
      { rootMargin: "80px 0px", threshold: 0.05 },
    );
    io.observe(canvas);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("canvas[data-makko-json][data-makko-image]").forEach(bootWhenVisible);
  });
})();
