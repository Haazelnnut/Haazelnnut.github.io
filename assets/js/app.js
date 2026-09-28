(function () {
  "use strict";

  /* ---------- theme ---------- */
  var root = document.body;
  var themeBtn = document.getElementById("theme-toggle");
  var STORAGE_THEME = "haazelnnut:theme";

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeBtn.querySelector(".icon").textContent = theme === "dark" ? "☀️" : "🌙";
    themeBtn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    themeBtn.setAttribute("aria-pressed", theme === "dark");
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem(STORAGE_THEME); } catch (e) { /* storage unavailable */ }
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(STORAGE_THEME, next); } catch (e) { /* storage unavailable */ }
  });

  /* ---------- background music ---------- */
  var musicBtn = document.getElementById("music-toggle");
  var bgm = document.getElementById("bgm");
  var musicReady = true;

  bgm.addEventListener("error", function () {
    musicReady = false;
    musicBtn.disabled = true;
    musicBtn.title = "No music track found — drop an mp3 at /assets/audio/bgm.mp3";
  });

  musicBtn.addEventListener("click", function () {
    if (!musicReady) return;
    if (bgm.paused) {
      bgm.volume = 0.5;
      bgm.play().then(function () {
        musicBtn.querySelector(".icon").textContent = "🔊";
        musicBtn.title = "Pause background music";
        musicBtn.setAttribute("aria-pressed", "true");
      }).catch(function () {
        musicReady = false;
        musicBtn.disabled = true;
        musicBtn.title = "No music track found — drop an mp3 at /assets/audio/bgm.mp3";
      });
    } else {
      bgm.pause();
      musicBtn.querySelector(".icon").textContent = "🔈";
      musicBtn.title = "Play background music";
      musicBtn.setAttribute("aria-pressed", "false");
    }
  });

  /* ---------- floating bubbles ---------- */
  var bubbleLayer = document.getElementById("bubbles");
  var BUBBLE_COUNT = 14;
  for (var i = 0; i < BUBBLE_COUNT; i++) {
    var b = document.createElement("span");
    b.className = "bubble";
    var size = 6 + Math.random() * 14;
    b.style.setProperty("--size", size + "px");
    b.style.setProperty("--duration", (6 + Math.random() * 8) + "s");
    b.style.setProperty("--delay", (-Math.random() * 14) + "s");
    b.style.left = Math.random() * 100 + "%";
    bubbleLayer.appendChild(b);
  }

  /* ---------- click ripples on the water ---------- */
  var rippleLayer = document.getElementById("ripple-layer");
  document.getElementById("water-bg").addEventListener("click", function (e) {
    var ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = e.clientX + "px";
    ripple.style.top = e.clientY + "px";
    rippleLayer.appendChild(ripple);
    ripple.addEventListener("animationend", function () { ripple.remove(); });
  });

  /* ---------- window manager ---------- */
  var desktop = document.getElementById("desktop");
  var windows = Array.prototype.slice.call(document.querySelectorAll(".window"));
  var zTop = 10;
  var openedBefore = {};
  var CASCADE_STEP = 32;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isDraggable() {
    return window.matchMedia("(min-width: 641px)").matches;
  }

  function bringToFront(win) {
    zTop += 1;
    win.style.zIndex = zTop;
  }

  function openWindow(win, index, sourceEl) {
    if (!openedBefore[win.id]) {
      openedBefore[win.id] = true;
      var offset = index * CASCADE_STEP;
      win.style.top = (140 + offset) + "px";
      win.style.left = (40 + offset) + "px";
    }
    win.hidden = false;
    bringToFront(win);
    if (reduceMotion) return;

    // Pop the window in from the icon that opened it, like a genie effect.
    var winRect = win.getBoundingClientRect();
    var originX = winRect.width / 2;
    var originY = winRect.height / 2;
    if (sourceEl) {
      var srcRect = sourceEl.getBoundingClientRect();
      originX = (srcRect.left + srcRect.width / 2) - winRect.left;
      originY = (srcRect.top + srcRect.height / 2) - winRect.top;
    }
    win.style.transformOrigin = originX + "px " + originY + "px";
    win.classList.remove("popping-out");
    void win.offsetWidth; // restart the animation even if it was already run once
    win.classList.add("popping-in");
  }

  function closeWindow(win) {
    if (win.hidden || win.classList.contains("popping-out")) return;
    if (reduceMotion) {
      win.hidden = true;
      return;
    }
    win.classList.remove("popping-in");
    void win.offsetWidth;
    win.classList.add("popping-out");
  }

  windows.forEach(function (win, index) {
    var titlebar = win.querySelector(".window-titlebar");
    var closeBtn = win.querySelector(".window-close");

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeWindow(win);
    });

    win.addEventListener("animationend", function (e) {
      if (e.target !== win) return;
      if (e.animationName === "window-pop-out") {
        win.hidden = true;
        win.classList.remove("popping-out");
      } else if (e.animationName === "window-pop-in") {
        win.classList.remove("popping-in");
      }
    });

    win.addEventListener("mousedown", function () { bringToFront(win); });
    win.addEventListener("touchstart", function () { bringToFront(win); }, { passive: true });

    var dragState = null;

    titlebar.addEventListener("pointerdown", function (e) {
      if (!isDraggable() || e.target === closeBtn) return;
      bringToFront(win);
      var rect = win.getBoundingClientRect();
      dragState = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
      titlebar.setPointerCapture(e.pointerId);
    });

    titlebar.addEventListener("pointermove", function (e) {
      if (!dragState) return;
      var maxX = window.innerWidth - win.offsetWidth - 8;
      var maxY = window.innerHeight - win.offsetHeight - 8;
      var x = Math.min(Math.max(8, e.clientX - dragState.offsetX), Math.max(8, maxX));
      var y = Math.min(Math.max(8, e.clientY - dragState.offsetY), Math.max(8, maxY));
      win.style.left = x + "px";
      win.style.top = y + "px";
    });

    function endDrag(e) {
      dragState = null;
      if (titlebar.hasPointerCapture && e && titlebar.hasPointerCapture(e.pointerId)) {
        titlebar.releasePointerCapture(e.pointerId);
      }
    }
    titlebar.addEventListener("pointerup", endDrag);
    titlebar.addEventListener("pointercancel", endDrag);
  });

  var dockIcons = Array.prototype.slice.call(document.querySelectorAll(".dock-icon"));
  dockIcons.forEach(function (icon, index) {
    icon.addEventListener("click", function () {
      var win = document.getElementById(icon.getAttribute("data-target"));
      if (!win) return;
      if (win.hidden) {
        openWindow(win, index, icon);
      } else {
        bringToFront(win);
      }
    });
  });
})();
