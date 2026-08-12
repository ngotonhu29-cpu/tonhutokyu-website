/*
 * Logic riêng cho trang chủ: bảng so sánh 6 dự án, quiz "Tìm căn phù hợp", form lead tối giản.
 * Phụ thuộc window.TN_PROJECTS / window.TN_RECOMMEND từ assets/projects-data.js (load trước file này).
 */
(function () {
  var PURPOSE_LABEL = { "an-cu": "An cư", "dau-tu": "Đầu tư", "vua": "Vừa ở vừa đầu tư", "tim-hieu": "Tìm hiểu thêm" };
  var STATUS_CLASS = { selling: "is-selling", done: "is-done", mixed: "is-mixed" };

  function fmt(value) { return value === null || value === undefined || value === "" ? "Đang cập nhật" : value; }

  function purposeText(list) {
    if (!list || !list.length) return "Đang cập nhật";
    return list.slice(0, 2).map(function (k) { return PURPOSE_LABEL[k] || k; }).join(" · ");
  }

  function cardHTML(p, variant) {
    var lightClass = variant === "light" ? " light" : "";
    var statusClass = STATUS_CLASS[p.statusTone] || "is-done";
    var price = p.priceFrom ? p.priceFrom + (p.priceNote ? " <span style=\"opacity:.7;font-size:11.5px;\">(" + p.priceNote + ")</span>" : "") : "Đang cập nhật";
    return (
      '<div class="compare-card' + lightClass + '">' +
        '<div class="cc-name">' + p.name + '</div>' +
        '<span class="status ' + statusClass + '"><span class="pip"></span>' + p.statusLabel + '</span>' +
        '<div class="cc-row"><span class="cc-label">Phù hợp</span><span class="cc-value">' + purposeText(p.suitableFor) + '</span></div>' +
        '<div class="cc-row"><span class="cc-label">Diện tích</span><span class="cc-value">' + fmt(p.area) + '</span></div>' +
        '<div class="cc-row"><span class="cc-label">Giá tham khảo</span><span class="cc-value">' + price + '</span></div>' +
        '<p class="cc-highlight">' + p.highlight + '</p>' +
        '<a class="cc-cta" href="' + p.url + '" data-tn-event="compare_view_project" data-tn-project="' + p.slug + '">Xem dự án →</a>' +
      '</div>'
    );
  }

  function renderGrid(containerId, projects, variant) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = projects.map(function (p) { return cardHTML(p, variant); }).join("");
    el.querySelectorAll("[data-tn-event]").forEach(function (a) {
      a.addEventListener("click", function () {
        window.TN_TRACK && window.TN_TRACK(a.getAttribute("data-tn-event"), { project: a.getAttribute("data-tn-project") });
      });
    });
  }

  function initCompareGrid() {
    if (!window.TN_PROJECTS) return;
    renderGrid("compareGrid", window.TN_PROJECTS, "dark");
  }

  function initProjectSelect() {
    var select = document.getElementById("lf-project");
    if (!select || !window.TN_PROJECTS) return;
    window.TN_PROJECTS.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      select.insertBefore(opt, select.lastElementChild);
    });
  }

  function initQuiz() {
    var startBtn = document.getElementById("quizStartBtn");
    var form = document.getElementById("quizForm");
    var results = document.getElementById("quizResults");
    if (!startBtn || !form) return;

    startBtn.addEventListener("click", function (e) {
      e.preventDefault();
      form.hidden = false;
      startBtn.style.display = "none";
      window.TN_TRACK && window.TN_TRACK("quiz_started");
      form.querySelector("input")?.focus();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var answers = {
        purpose: data.get("purpose"),
        budget: data.get("budget"),
        bedroom: data.get("bedroom") || null,
        timeline: data.get("timeline")
      };
      var ranked = window.TN_RECOMMEND ? window.TN_RECOMMEND(answers) : window.TN_PROJECTS;
      renderGrid("quizResultGrid", ranked, "light");
      results.hidden = false;
      window.TN_TRACK && window.TN_TRACK("quiz_completed", answers);
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function initLeadForm() {
    var form = document.getElementById("leadForm");
    if (!form) return;
    var submitBtn = document.getElementById("lfSubmitBtn");
    var successEl = document.getElementById("lfSuccess");
    var errorEl = document.getElementById("lfError");
    var defaultLabel = submitBtn.textContent;

    /*
     * Nguồn nhận lead thật: Google Sheet của Như, qua Google Apps Script Web App (miễn phí, Như tự sở hữu dữ liệu).
     * Xem hướng dẫn deploy trong assets/google-apps-script-lead-capture.txt.
     * Dán URL Web App vào LEAD_FORM_ENDPOINT bên dưới để kích hoạt — để trống thì form tự
     * dùng lại cách cũ (mở email soạn sẵn qua mailto) để không có gì bị hỏng trong lúc chờ deploy.
     */
    var LEAD_FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbyx1-QKsEDlncdE6iG5YdcFtSo85QnORYKzLaqKj6SCsGHNzdLjE-_XvIRjDEPWpVN3/exec";
    var LEAD_EMAIL = "ngo.to.nhu@becamex-tokyu.com";

    function submitViaAppsScript(payload) {
      return fetch(LEAD_FORM_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      // Lưu ý: chế độ "no-cors" khiến trình duyệt không cho đọc nội dung phản hồi từ Apps Script —
      // đây là giới hạn kỹ thuật bắt buộc khi gọi Apps Script Web App từ một domain khác (nhutokyu.com).
      // fetch() chỉ báo lỗi khi mất kết nối mạng hoàn toàn; nếu cần xác nhận chắc chắn từng lead
      // đã vào Sheet, cách đáng tin cậy nhất vẫn là mở Google Sheet kiểm tra trực tiếp.
    }

    function submitViaMailto(payload) {
      var subject = "Yêu cầu tư vấn từ website — " + payload.name;
      var body =
        "Họ và tên: " + payload.name + "\n" +
        "Số điện thoại: " + payload.phone + "\n" +
        "Dự án quan tâm: " + payload.project + "\n" +
        "Mục đích: " + payload.goal;
      var mailto = "mailto:" + LEAD_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      window.location.href = mailto;
      return Promise.resolve();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      successEl.classList.remove("is-visible");
      errorEl.classList.remove("is-visible");

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var payload = {
        name: form.elements["name"].value.trim(),
        phone: form.elements["phone"].value.trim(),
        project: form.elements["project"].value,
        goal: form.elements["goal"].value
      };

      submitBtn.disabled = true;
      submitBtn.textContent = "Đang gửi…";

      var send = LEAD_FORM_ENDPOINT ? submitViaAppsScript(payload) : submitViaMailto(payload);

      send
        .then(function () {
          window.TN_TRACK && window.TN_TRACK("lead_form_submit", { project: payload.project, goal: payload.goal, via: LEAD_FORM_ENDPOINT ? "apps_script" : "mailto" });
          successEl.classList.add("is-visible");
          form.reset();
        })
        .catch(function () {
          errorEl.classList.add("is-visible");
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = defaultLabel;
        });
    });
  }

  function init() {
    initCompareGrid();
    initProjectSelect();
    initQuiz();
    initLeadForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
