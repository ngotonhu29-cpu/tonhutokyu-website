/*
 * Widget "Tìm căn phù hợp" — lọc căn hộ THỰC TẾ từ window.TN_UNITS (assets/units-data.js)
 * theo Dự án / Số phòng ngủ / Ngân sách tối đa. Không tự tạo dữ liệu — chỉ đọc và lọc.
 * Áp dụng cho mọi <section data-tn-unit-finder> trên trang (index.html, the-ten.html, to-nhu-the-nest.html).
 * Cập nhật giỏ hàng: thay file xlsx nguồn rồi chạy lại tools/build-units-data.py để tạo lại units-data.js —
 * file này không cần sửa.
 */
(function () {
  var PAGE_SIZE = 9;

  function tyToVnd(ty) { return Math.round(ty * 1e9); }

  function bedroomSortKey(unit) {
    if (unit.bedroomCount !== null && unit.bedroomCount !== undefined) return unit.bedroomCount;
    return 90; // Duplex/Penthouse/loại không xác định số PN — xếp sau cùng
  }

  function deriveProjectOptions(units) {
    var seen = {};
    var out = [];
    units.forEach(function (u) {
      if (!seen[u.project]) {
        seen[u.project] = true;
        out.push({ value: u.project, label: u.projectName });
      }
    });
    out.sort(function (a, b) { return a.label.localeCompare(b.label); });
    return out;
  }

  function deriveBedroomOptions(units, projectFilter) {
    var seen = {};
    var out = [];
    units.forEach(function (u) {
      if (projectFilter && u.project !== projectFilter) return;
      var key = u.bedroomLabel || "Khác";
      if (!seen[key]) {
        seen[key] = true;
        out.push({ value: key, label: key, sortKey: bedroomSortKey(u) });
      }
    });
    out.sort(function (a, b) { return a.sortKey - b.sortKey; });
    return out;
  }

  function assetPrefix() {
    return window.location.pathname.indexOf('/05_Content/') !== -1 ? '../' : '';
  }

  function findLayoutFile(tower, typeCode) {
    if (!typeCode || !window.NEST_UNIT_LAYOUT_FILES) return null;
    var prefix = tower === 'EAST' ? 'H5' : 'H7';
    var codeForFile = String(typeCode).replace(/'/g, '_');
    var base = 'assets/nest-unit-layouts/' + prefix + '-' + codeForFile;
    return window.NEST_UNIT_LAYOUT_FILES.find(function (f) { return f === base + '.jpg' || f === base + '.png'; }) || null;
  }

  function fmtArea(a) {
    if (a === null || a === undefined) return "Đang cập nhật";
    var s = a % 1 === 0 ? String(a) : String(a).replace(".", ",");
    return s + " m²";
  }

  function filterUnits(units, criteria) {
    return units.filter(function (u) {
      if (u.priceVN === null || u.priceVN === undefined) return false; // an toàn: không giá thì không hiển thị
      if (criteria.project && u.project !== criteria.project) return false;
      if (criteria.bedroomLabel && u.bedroomLabel !== criteria.bedroomLabel) return false;
      if (criteria.maxBudgetTy !== null && criteria.maxBudgetTy !== undefined && !isNaN(criteria.maxBudgetTy)) {
        if (u.priceVN > tyToVnd(criteria.maxBudgetTy)) return false;
      }
      return true;
    });
  }

  function sortUnits(list, criteria) {
    var hasBudget = criteria.maxBudgetTy !== null && criteria.maxBudgetTy !== undefined && !isNaN(criteria.maxBudgetTy);
    return list.slice().sort(function (a, b) {
      if (hasBudget) {
        if (b.priceVN !== a.priceVN) return b.priceVN - a.priceVN; // gần ngân sách nhất (không vượt) lên trước
      } else {
        if (a.priceVN !== b.priceVN) return a.priceVN - b.priceVN; // chưa có ngân sách: giá thấp trước
      }
      var fa = parseInt(a.floor, 10); var fb = parseInt(b.floor, 10);
      fa = isNaN(fa) ? 0 : fa; fb = isNaN(fb) ? 0 : fb;
      if (fb !== fa) return fb - fa; // tầng cao hơn ưu tiên (dữ liệu thực, không suy đoán)
      var aa = a.area || 0, ab = b.area || 0;
      return aa - ab;
    });
  }

  function cardHTML(u) {
    var subParts = [];
    if (u.floor) subParts.push("Tầng " + u.floor);
    if (u.direction) subParts.push("Hướng " + u.direction);
    var subLine = subParts.join(" · ");
    var viewLine = u.view ? "View: " + u.view : "";
    var frNote = u.priceDisplayFR ? '<span class="fr-note">Khách nước ngoài (SPA FR): ' + u.priceDisplayFR + '</span>' : "";
    var ref = u.projectName + " – " + u.unitCode;
    var layoutLink = "";
    var layoutFile = findLayoutFile(u.tower, u.typeCode);
    if (layoutFile) {
      var layoutSrc = assetPrefix() + layoutFile;
      layoutLink = '<button type="button" class="uf-card-layout-link" data-uf-layout data-layout-src="' + layoutSrc + '" data-layout-title="' + ref.replace(/"/g, "&quot;") + '">Xem layout căn hộ →</button>';
    }
    return (
      '<article class="uf-card" data-unit-ref="' + ref.replace(/"/g, "&quot;") + '">' +
        '<div class="uf-card-top">' +
          '<div class="uf-card-code">' + u.unitCode + '</div>' +
          '<div class="uf-card-tag">' + u.projectName + '</div>' +
        '</div>' +
        '<div class="uf-card-meta">' + (u.bedroomLabel || "Đang cập nhật") + ' · ' + fmtArea(u.area) + '</div>' +
        '<div class="uf-card-sub">' + subLine + '</div>' +
        (viewLine ? '<div class="uf-card-view">' + viewLine + '</div>' : '') +
        '<div class="uf-card-price">' + u.priceDisplay + frNote + '</div>' +
        layoutLink +
        '<button type="button" class="uf-card-cta" data-uf-cta>Xem căn này →</button>' +
      '</article>'
    );
  }

  function showToast(root, msg) {
    var toast = root.querySelector('[data-uf-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'uf-toast';
      toast.setAttribute('data-uf-toast', '');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-visible');
    window.clearTimeout(toast._ufTimer);
    toast._ufTimer = window.setTimeout(function () { toast.classList.remove('is-visible'); }, 3200);
  }

  function wireCardActions(root, grid) {
    grid.querySelectorAll('[data-uf-cta]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.uf-card');
        var ref = card.getAttribute('data-unit-ref');
        var text = "Chào Như, mình quan tâm căn " + ref + ". Mình muốn hỏi thêm thông tin.";
        var copied = false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { copied = true; }).catch(function () {});
        }
        window.TN_TRACK && window.TN_TRACK("unit_finder_cta_click", { unit: ref });
        showToast(root, "Đã copy lời nhắn về căn " + ref + " — dán vào Zalo để gửi cho Như nhé.");
        window.setTimeout(function () {
          window.open("https://zalo.me/0918602249", "_blank", "noopener");
        }, 250);
      });
    });
    grid.querySelectorAll('[data-uf-layout]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openLayoutLightbox(btn.getAttribute('data-layout-src'), btn.getAttribute('data-layout-title'));
        window.TN_TRACK && window.TN_TRACK("unit_finder_layout_view", { unit: btn.getAttribute('data-layout-title') });
      });
    });
  }

  function getLightbox() {
    var lb = document.querySelector('[data-uf-lightbox]');
    if (lb) return lb;
    lb = document.createElement('div');
    lb.className = 'uf-lightbox';
    lb.setAttribute('data-uf-lightbox', '');
    lb.innerHTML =
      '<div class="uf-lightbox-backdrop" data-uf-lightbox-close></div>' +
      '<div class="uf-lightbox-body">' +
        '<button type="button" class="uf-lightbox-close" data-uf-lightbox-close aria-label="Đóng">✕</button>' +
        '<div class="uf-lightbox-title" data-uf-lightbox-title></div>' +
        '<img class="uf-lightbox-img" data-uf-lightbox-img alt="Layout căn hộ">' +
      '</div>';
    document.body.appendChild(lb);
    lb.querySelectorAll('[data-uf-lightbox-close]').forEach(function (el) {
      el.addEventListener('click', function () { lb.classList.remove('is-show'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lb.classList.remove('is-show');
    });
    return lb;
  }

  function openLayoutLightbox(src, title) {
    var lb = getLightbox();
    lb.querySelector('[data-uf-lightbox-img]').setAttribute('src', src);
    lb.querySelector('[data-uf-lightbox-title]').textContent = title + ' — mặt bằng layout';
    lb.classList.add('is-show');
  }

  function renderEmpty(resultsEl, root, criteria, units) {
    resultsEl.classList.add('is-empty-state');
    var near = filterUnits(units, { project: criteria.project }).filter(function (u) {
      return !criteria.bedroomLabel || u.bedroomLabel === criteria.bedroomLabel;
    });
    near = sortUnits(near, {});
    var nearHTML = "";
    if (near.length) {
      nearHTML =
        '<div class="uf-near-label">Một vài căn gần với nhu cầu của bạn (ngoài ngân sách đã chọn):</div>' +
        '<div class="uf-grid">' + near.slice(0, 3).map(cardHTML).join("") + '</div>';
    }
    resultsEl.innerHTML =
      '<div class="uf-empty reveal in">' +
        '<p class="uf-empty-lead">"Hiện Như chưa tìm thấy căn đúng hoàn toàn với nhu cầu này."</p>' +
        '<p class="uf-empty-sub">Bạn có thể điều chỉnh ngân sách, xem thêm các căn khác, hoặc để Như tư vấn trực tiếp — giỏ hàng thay đổi liên tục nên có thể có căn phù hợp chưa cập nhật kịp trên đây.</p>' +
        '<div class="uf-empty-actions">' +
          '<button type="button" class="uf-btn-ghost" data-uf-reset-budget>Điều chỉnh ngân sách</button>' +
          '<a class="uf-btn-solid" href="https://zalo.me/0918602249" target="_blank" rel="noopener" data-tn-event="unit_finder_empty_zalo">Nhận tư vấn trực tiếp từ Như</a>' +
        '</div>' +
      '</div>' +
      nearHTML;
    var resetBtn = resultsEl.querySelector('[data-uf-reset-budget]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        var budgetInput = root.querySelector('[data-uf-budget-input]');
        if (budgetInput) { budgetInput.value = ""; budgetInput.focus(); }
        root.querySelectorAll('[data-uf-budget-chip]').forEach(function (c) { c.classList.remove('is-active'); });
      });
    }
    wireCardActions(root, resultsEl);
  }

  function renderResults(root, resultsEl, list, criteria) {
    if (!list.length) {
      renderEmpty(resultsEl, root, criteria, root._ufAllUnits);
      return;
    }
    resultsEl.classList.remove('is-empty-state');
    var shown = list.slice(0, PAGE_SIZE);
    var meta = '<div class="uf-results-meta">Tìm thấy <strong>' + list.length + '</strong> căn đang có sẵn phù hợp</div>';
    var grid = '<div class="uf-grid">' + shown.map(cardHTML).join("") + '</div>';
    var more = "";
    if (list.length > PAGE_SIZE) {
      more = '<div class="uf-loadmore"><button type="button" data-uf-more>Xem thêm ' + (list.length - PAGE_SIZE) + ' căn →</button></div>';
    }
    resultsEl.innerHTML = meta + grid + more;
    wireCardActions(root, resultsEl);

    var moreBtn = resultsEl.querySelector('[data-uf-more]');
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        var gridEl = resultsEl.querySelector('.uf-grid');
        gridEl.insertAdjacentHTML('beforeend', list.slice(PAGE_SIZE).map(cardHTML).join(""));
        wireCardActions(root, resultsEl);
        moreBtn.parentElement.remove();
      });
    }
  }

  function buildChipGroup(container, options, opts) {
    container.innerHTML = "";
    options.forEach(function (opt) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'uf-chip';
      chip.textContent = opt.label;
      chip.setAttribute('data-value', opt.value);
      if (opts.attr) chip.setAttribute(opts.attr, '');
      container.appendChild(chip);
    });
  }

  function initWidget(root) {
    var allUnits = (window.TN_UNITS || []).filter(function (u) { return u.priceVN !== null && u.priceVN !== undefined; });
    root._ufAllUnits = allUnits;
    var lockProject = root.getAttribute('data-tn-default-project') || "";

    var projectField = root.querySelector('[data-uf-project-field]');
    var projectGroup = root.querySelector('[data-uf-project]');
    var bedroomGroup = root.querySelector('[data-uf-bedroom]');
    var budgetGroup = root.querySelector('[data-uf-budget]');
    var budgetInput = root.querySelector('[data-uf-budget-input]');
    var resultsEl = root.querySelector('[data-uf-results]');
    var form = root.querySelector('[data-uf-form]');

    var state = { project: lockProject, bedroomLabel: "", maxBudgetTy: null };

    if (lockProject && projectField) {
      projectField.classList.add('is-hidden');
    } else if (projectGroup) {
      var projectOptions = [{ value: "", label: "Tất cả" }].concat(deriveProjectOptions(allUnits));
      buildChipGroup(projectGroup, projectOptions, { attr: 'data-uf-project-chip' });
      projectGroup.querySelector('[data-value=""]').classList.add('is-active');
      projectGroup.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-uf-project-chip]');
        if (!chip) return;
        projectGroup.querySelectorAll('.uf-chip').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        state.project = chip.getAttribute('data-value');
        refreshBedroomOptions();
      });
    }

    function refreshBedroomOptions() {
      var opts = [{ value: "", label: "Tất cả" }].concat(deriveBedroomOptions(allUnits, state.project || null));
      var currentValue = state.bedroomLabel;
      buildChipGroup(bedroomGroup, opts, { attr: 'data-uf-bedroom-chip' });
      var stillValid = opts.some(function (o) { return o.value === currentValue; });
      if (!stillValid) { state.bedroomLabel = ""; currentValue = ""; }
      var match = bedroomGroup.querySelector('[data-value="' + currentValue.replace(/"/g, '\\"') + '"]') || bedroomGroup.querySelector('[data-value=""]');
      if (match) match.classList.add('is-active');
    }

    if (bedroomGroup) {
      refreshBedroomOptions();
      bedroomGroup.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-uf-bedroom-chip]');
        if (!chip) return;
        bedroomGroup.querySelectorAll('.uf-chip').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        state.bedroomLabel = chip.getAttribute('data-value');
      });
    }

    if (budgetGroup) {
      budgetGroup.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-uf-budget-chip]');
        if (!chip) return;
        budgetGroup.querySelectorAll('.uf-chip').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        var v = chip.getAttribute('data-value');
        state.maxBudgetTy = v === "" ? null : parseFloat(v);
        if (budgetInput) budgetInput.value = v === "" ? "" : v;
      });
    }

    if (budgetInput) {
      budgetInput.addEventListener('input', function () {
        var v = budgetInput.value.trim();
        state.maxBudgetTy = v === "" ? null : parseFloat(v.replace(",", "."));
        if (budgetGroup) budgetGroup.querySelectorAll('.uf-chip').forEach(function (c) { c.classList.remove('is-active'); });
      });
    }

    function runSearch() {
      var filtered = filterUnits(allUnits, state);
      var sorted = sortUnits(filtered, state);
      renderResults(root, resultsEl, sorted, state);
      window.TN_TRACK && window.TN_TRACK("unit_finder_search", {
        project: state.project || "tat-ca",
        bedroom: state.bedroomLabel || "tat-ca",
        maxBudgetTy: state.maxBudgetTy || null,
        results: sorted.length
      });
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        runSearch();
      });
    }

    // Kết quả mặc định: hiển thị ngay khi tải trang (không bắt khách phải bấm mới thấy có căn).
    runSearch();
  }

  function init() {
    document.querySelectorAll('[data-tn-unit-finder]').forEach(initWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
