/*
 * Sticky contact bar — tiêm vào cuối <body> của mọi trang.
 * Yêu cầu <link rel="stylesheet" href=".../sticky-bar.css"> đã có trên trang.
 * Số điện thoại / Zalo lấy từ thông tin liên hệ thật đã dùng trong nav & footer của site (không tự bịa).
 */
(function () {
  var PHONE_DISPLAY = "0918 602 249";
  var PHONE_TEL = "+84918602249";
  var ZALO_URL = "https://zalo.me/0918602249";

  /*
   * Điểm nối tracking (Phase 2 sẽ gắn GA4 / Meta Pixel thật vào đây).
   * Hiện tại chỉ ghi console để không tạo tracking ID giả.
   */
  window.TN_TRACK = window.TN_TRACK || function (eventName, detail) {
    if (window.console && console.debug) console.debug("[tn-track]", eventName, detail || "");
  };

  function injectBar() {
    var bar = document.createElement("div");
    bar.className = "tn-sticky-bar";
    bar.id = "tnStickyBar";
    bar.innerHTML =
      '<div class="tn-sticky-inner">' +
        '<a class="tn-sticky-btn tel" href="tel:' + PHONE_TEL + '" data-tn-event="sticky_call">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.2 1L6.6 10.8z"/></svg>' +
          '<span class="tn-label-full">Gọi cho Như</span><span class="tn-label-short">Gọi</span>' +
        '</a>' +
        '<a class="tn-sticky-btn zalo" href="' + ZALO_URL + '" target="_blank" rel="noopener" data-tn-event="sticky_zalo">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.42 3.85 7.08-.13.98-.5 2.28-1.15 3.42-.1.18.05.4.25.36 1.6-.3 3.15-1 4.15-1.55.9.25 1.87.39 2.9.39 5.52 0 10-4.03 10-9s-4.48-9-10-9z"/></svg>' +
          '<span class="tn-label-full">Nhắn Như trên Zalo</span><span class="tn-label-short">Zalo</span>' +
        '</a>' +
      '</div>';
    document.body.appendChild(bar);

    bar.querySelectorAll("[data-tn-event]").forEach(function (el) {
      el.addEventListener("click", function () {
        window.TN_TRACK(el.getAttribute("data-tn-event"), { phone: PHONE_DISPLAY });
      });
    });

    return bar;
  }

  function initVisibilityToggle(bar) {
    var showAfter = 480;
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop;
      var nearBottom = (window.innerHeight + y) > (document.documentElement.scrollHeight - 40);
      if (y > showAfter && !nearBottom) {
        bar.classList.add("is-visible");
      } else {
        bar.classList.remove("is-visible");
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initVisibilityToggle(injectBar()); });
  } else {
    initVisibilityToggle(injectBar());
  }
})();
