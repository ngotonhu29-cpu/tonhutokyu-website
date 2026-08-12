/*
 * Dữ liệu 6 dự án Becamex Tokyu — nguồn duy nhất cho bảng so sánh và gợi ý "Tìm căn phù hợp".
 * Chỉ chứa số liệu đã xác minh (xem CLAUDE.md và từng trang dự án trong 05_Content/).
 * Trường nào chưa có nguồn chính thức thì để null — UI sẽ tự hiển thị "Đang cập nhật".
 * Cập nhật giá / diện tích / tình trạng ở đây — không sửa trực tiếp trong HTML.
 */
window.TN_PROJECTS = [
  {
    slug: "the-nest",
    name: "The NEST",
    fullName: "MIDORI PARK The NEST",
    url: "05_Content/to-nhu-the-nest.html",
    image: "image-web/The%20NEST/The-NEST-BUILDING-DAY-scaled.jpg",
    statusLabel: "Đang mở bán (tòa EAST)",
    statusTone: "selling",
    units: "972 căn · 2 tòa",
    area: "34,2 – 142,4 m²",
    priceFrom: "Từ 1,879 tỷ",
    priceNote: "Studio, tòa EAST, chưa VAT",
    highlight: "Hồ bơi rooftop đầu tiên Bắc TP.HCM, 79+ tiện ích, trung tâm TOD Phường Bình Dương.",
    suitableFor: ["an-cu", "dau-tu", "vua", "tim-hieu"],
    bedroomTypes: ["studio", "1pn", "2pn", "3pn", "duplex"]
  },
  {
    slug: "the-ten",
    name: "The TEN",
    fullName: "The TEN",
    url: "05_Content/the-ten.html",
    image: "image-web/The%20TEN/dc236771a6f627a87ee7.jpg",
    statusLabel: "Đã bàn giao",
    statusTone: "done",
    units: "300 căn cao cấp",
    area: "44 – 161 m²",
    priceFrom: null,
    priceNote: null,
    highlight: "Onsen chuẩn Nhật đầu tiên tại khu vực — không gian riêng tư, sống chậm.",
    suitableFor: ["an-cu", "dau-tu"],
    bedroomTypes: ["1pn", "2pn", "3pn"]
  },
  {
    slug: "the-glory",
    name: "The GLORY",
    fullName: "The GLORY",
    url: "05_Content/the-glory.html",
    image: "image-web/The%20GLORY/My%20Documents%20%5B22-07-2026%2009_58%5D/f59c0d0cd68b57d50e9a11.jpg",
    statusLabel: "Đã bàn giao",
    statusTone: "done",
    units: "992 căn home-resort",
    area: null,
    priceFrom: null,
    priceNote: null,
    highlight: "Hồ bơi tràn, thác nước 12m — thiết kế nghỉ dưỡng \"Symphony of Nature\".",
    suitableFor: ["an-cu", "dau-tu", "tim-hieu"],
    bedroomTypes: null
  },
  {
    slug: "haruka",
    name: "HARUKA",
    fullName: "HARUKA Terrace / Residence",
    url: "05_Content/haruka.html",
    image: "image-web/HARUKA/ANH%20BIA%20HARUKA/6fd7c2500cd78d89d4c6.jpg",
    statusLabel: "Đã bàn giao",
    statusTone: "done",
    units: "219 căn biệt thự · nhà phố",
    area: null,
    priceFrom: null,
    priceNote: null,
    highlight: "Sản phẩm thấp tầng đầu tiên của MIDORI PARK — đón cư dân từ tháng 7/2017.",
    suitableFor: ["an-cu", "dau-tu"],
    bedroomTypes: ["duplex"]
  },
  {
    slug: "sora",
    name: "SORA gardens",
    fullName: "SORA gardens I · II · III",
    url: "05_Content/sora.html",
    image: "image-web/SORA/ANH%20BIA%20SORA/8e3846658be20abc53f3.jpg",
    statusLabel: "I · II đã bàn giao — III dự kiến 2028",
    statusTone: "mixed",
    units: "~2.037 căn hộ",
    area: null,
    priceFrom: null,
    priceNote: null,
    highlight: "Cửa ngõ Thành phố Mới Bình Dương, thiết kế theo tinh thần \"Center of FUN\".",
    suitableFor: ["an-cu", "dau-tu", "tim-hieu"],
    bedroomTypes: null
  },
  {
    slug: "the-view",
    name: "The VIEW",
    fullName: "The VIEW",
    url: "05_Content/the-view.html",
    image: "image-web/The%20VIEW/8b5508f69771162f4f603.jpg",
    statusLabel: "Đã bàn giao",
    statusTone: "done",
    units: "604 căn hộ · 24 tầng",
    area: "35 – 102 m²",
    priceFrom: null,
    priceNote: null,
    highlight: "Mật độ xây dựng chỉ 37% — nhiều khoảng trống hơn cho không gian chung.",
    suitableFor: ["an-cu", "dau-tu"],
    bedroomTypes: ["studio", "1pn", "2pn"]
  }
];

/*
 * Gợi ý dự án theo câu trả lời quiz "Tìm căn phù hợp" (nền tảng Phase 1).
 * purpose: 'an-cu' | 'dau-tu' | 'vua' | 'tim-hieu'
 * bedroom: 'studio' | '1pn' | '2pn' | '3pn' | 'duplex' | null (chưa xác định)
 * Trả về danh sách dự án đã sắp xếp theo độ phù hợp — không loại bỏ hoàn toàn dự án nào,
 * vì dữ liệu hiện tại chưa đủ chi tiết để loại trừ tuyệt đối (xem ghi chú "Đang cập nhật").
 */
window.TN_RECOMMEND = function (answers) {
  var purpose = answers.purpose;
  var bedroom = answers.bedroom;
  return window.TN_PROJECTS
    .map(function (p) {
      var score = 0;
      if (purpose && p.suitableFor.indexOf(purpose) !== -1) score += 2;
      if (bedroom && p.bedroomTypes && p.bedroomTypes.indexOf(bedroom) !== -1) score += 3;
      if (p.statusTone === "selling") score += 1; // dự án đang mở bán primary — luôn có căn để giới thiệu
      return { project: p, score: score };
    })
    .sort(function (a, b) { return b.score - a.score; })
    .map(function (r) { return r.project; });
};
