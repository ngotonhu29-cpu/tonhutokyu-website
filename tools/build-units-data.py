# -*- coding: utf-8 -*-
"""
Convert the-ten & the-nest cart xlsx files into assets/units-data.js (window.TN_UNITS).
Uses stdlib only (zipfile + xml) since openpyxl/pandas are not installable offline here.

CACH CHAY LAI KHI CAP NHAT GIO HANG (tu thu muc tonhutokyu-website):

  python tools/build-units-data.py "../../The TEN/The TEN- Gio hang chung.xlsx 12.08.xlsx" "../The NEST - H5 & H7 - Gio hang chung.xlsx 12.08.xlsx" assets/units-data.js tools/units-report.json

Doi ten file xlsx trong lenh tren cho dung ten file moi nhat ban da thay.
Sau khi chay xong, mo tools/units-report.json de kiem tra so can + canh bao (neu co can thieu gia/dien tich).
Khong can sua gi trong assets/unit-finder.js hay cac trang HTML.
"""
import sys, zipfile, re, json
from xml.etree import ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def col_to_idx(col):
    idx = 0
    for c in col:
        idx = idx * 26 + (ord(c) - ord('A') + 1)
    return idx - 1

def cell_ref_split(ref):
    m = re.match(r'([A-Z]+)(\d+)', ref)
    return m.group(1), int(m.group(2))

def load_shared_strings(z):
    try:
        data = z.read('xl/sharedStrings.xml')
    except KeyError:
        return []
    root = ET.fromstring(data)
    strings = []
    for si in root.findall('m:si', NS):
        texts = si.findall('.//m:t', NS)
        strings.append(''.join(t.text or '' for t in texts))
    return strings

def load_sheet_names(z):
    data = z.read('xl/workbook.xml')
    root = ET.fromstring(data)
    sheets = []
    for sh in root.findall('.//m:sheets/m:sheet', NS):
        sheets.append((sh.get('name'), sh.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')))
    rels_data = z.read('xl/_rels/workbook.xml.rels')
    rroot = ET.fromstring(rels_data)
    rels = {}
    for rel in rroot:
        rels[rel.get('Id')] = rel.get('Target')
    result = []
    for name, rid in sheets:
        target = rels.get(rid)
        if target and not target.startswith('/'):
            target = 'xl/' + target
        result.append((name, target))
    return result

def dump_sheet(z, path, shared):
    data = z.read(path)
    root = ET.fromstring(data)
    rows_out = []
    sheet_data = root.find('m:sheetData', NS)
    if sheet_data is None:
        return rows_out
    for row in sheet_data.findall('m:row', NS):
        row_cells = {}
        max_col = 0
        for c in row.findall('m:c', NS):
            ref = c.get('r')
            col_letters, row_num = cell_ref_split(ref)
            col_idx = col_to_idx(col_letters)
            max_col = max(max_col, col_idx)
            t = c.get('t')
            v = c.find('m:v', NS)
            is_ = c.find('m:is', NS)
            val = None
            if t == 's' and v is not None:
                val = shared[int(v.text)]
            elif t == 'inlineStr' and is_ is not None:
                texts = is_.findall('.//m:t', NS)
                val = ''.join(tt.text or '' for tt in texts)
            elif v is not None:
                val = v.text
            row_cells[col_idx] = val
        line = [row_cells.get(i) for i in range(max_col + 1)]
        rows_out.append(line)
    return rows_out

def get_sheets(path):
    z = zipfile.ZipFile(path)
    shared = load_shared_strings(z)
    sheets = load_sheet_names(z)
    out = {}
    for name, target in sheets:
        out[name] = dump_sheet(z, target, shared)
    return out

def to_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None

def to_int_money(v):
    f = to_float(v)
    if f is None:
        return None
    return int(round(f))

def fmt_area(v):
    f = to_float(v)
    if f is None:
        return None
    return round(f, 1)

def fmt_ty(price):
    """VND -> 'X,XXX tỷ' Vietnamese-style string, trimmed trailing zeros."""
    if price is None:
        return None
    ty = price / 1e9
    s = ("%.3f" % ty).rstrip('0').rstrip('.')
    s = s.replace('.', ',')
    return s + " tỷ"

def parse_bedroom(raw):
    """Return (bedroomCount:int|None, bedroomLabel:str) from raw SỐ PN field."""
    if raw is None:
        return None, None
    raw = str(raw).strip()
    if raw == '' :
        return None, None
    if raw.upper() == 'S':
        return 0, 'Studio'
    m = re.match(r'^(\d+)\s*BR', raw, re.IGNORECASE)
    if m:
        n = int(m.group(1))
        return n, str(n) + ' phòng ngủ'
    if raw.upper() == 'DL':
        return None, 'Duplex (DL)'
    if raw.upper() == 'PH':
        return None, 'Penthouse (PH)'
    return None, raw

def is_data_row(row, min_len):
    if row is None or len(row) < min_len:
        return False
    stt = row[0]
    unit_code = row[4] if len(row) > 4 else None
    if stt is None or unit_code is None or str(unit_code).strip() == '':
        return False
    try:
        int(float(stt))
    except (ValueError, TypeError):
        return False
    return True

def build_ten_units(path):
    sheets = get_sheets(path)
    units = []
    warnings = []
    for sheet_name, rows in sheets.items():
        for row in rows:
            if not is_data_row(row, 12):
                continue
            unit_code = str(row[4]).strip()
            tower = row[1]
            floor = row[2]
            location = row[3]
            type_code = row[5]
            area = fmt_area(row[6])
            bedroom_raw = row[7]
            view = row[8]
            direction = row[9]
            price = to_int_money(row[10])
            unit_price = to_float(row[11])
            bedroom_count, bedroom_label = parse_bedroom(bedroom_raw)

            if price is None:
                warnings.append("The TEN — %s: KHONG CO GIA, bi loai khoi ket qua." % unit_code)
                continue
            if area is None:
                warnings.append("The TEN — %s: KHONG CO DIEN TICH (van giu, khong loc)." % unit_code)

            units.append({
                "id": "the-ten-" + unit_code,
                "project": "the-ten",
                "projectName": "The TEN",
                "unitCode": unit_code,
                "tower": tower,
                "floor": floor,
                "location": location,
                "typeCode": type_code,
                "area": area,
                "bedroomRaw": bedroom_raw,
                "bedroomCount": bedroom_count,
                "bedroomLabel": bedroom_label,
                "view": view,
                "direction": direction,
                "note": None,
                "priceVN": price,
                "priceFR": None,
                "unitPriceVN": unit_price,
                "priceDisplay": fmt_ty(price),
            })
    return units, warnings

def build_nest_units(path):
    sheets = get_sheets(path)
    units = []
    warnings = []
    tower_name_map = {}
    for sheet_name in sheets:
        if 'EAST' in sheet_name.upper():
            tower_key = 'E'
            tower_name_map['E'] = 'EAST'
        elif 'WEST' in sheet_name.upper():
            tower_key = 'W'
            tower_name_map['W'] = 'WEST'
    for sheet_name, rows in sheets.items():
        sheet_upper = sheet_name.upper()
        default_tower_name = 'EAST' if 'EAST' in sheet_upper else ('WEST' if 'WEST' in sheet_upper else None)
        for row in rows:
            if not is_data_row(row, 15):
                continue
            unit_code = str(row[4]).strip()
            tower = row[1]
            floor = row[2]
            location = row[3]
            type_code = row[5]
            area = fmt_area(row[6])
            bedroom_raw = row[7]
            price_vn = to_int_money(row[8])
            unit_price_vn = to_float(row[9])
            price_fr = to_int_money(row[10])
            unit_price_fr = to_float(row[11])
            view = row[12]
            direction = row[13]
            note = row[14] if len(row) > 14 else None
            bedroom_count, bedroom_label = parse_bedroom(bedroom_raw)

            if price_vn is None:
                warnings.append("The NEST — %s: KHONG CO GIA (SPA VN/LTL), bi loai khoi ket qua." % unit_code)
                continue
            if area is None:
                warnings.append("The NEST — %s: KHONG CO DIEN TICH (van giu, khong loc)." % unit_code)

            tower_full = default_tower_name or tower_name_map.get(tower) or tower

            units.append({
                "id": "the-nest-" + unit_code,
                "project": "the-nest",
                "projectName": "The NEST",
                "unitCode": unit_code,
                "tower": tower_full,
                "floor": floor,
                "location": location,
                "typeCode": type_code,
                "area": area,
                "bedroomRaw": bedroom_raw,
                "bedroomCount": bedroom_count,
                "bedroomLabel": bedroom_label,
                "view": view,
                "direction": direction,
                "note": (note if note not in (None, '') else None),
                "priceVN": price_vn,
                "priceFR": price_fr,
                "unitPriceVN": unit_price_vn,
                "unitPriceFR": unit_price_fr,
                "priceDisplay": fmt_ty(price_vn),
                "priceDisplayFR": fmt_ty(price_fr),
            })
    return units, warnings

def main():
    ten_path = sys.argv[1]
    nest_path = sys.argv[2]
    out_js = sys.argv[3]
    out_report = sys.argv[4]

    ten_units, ten_warn = build_ten_units(ten_path)
    nest_units, nest_warn = build_nest_units(nest_path)

    all_units = ten_units + nest_units

    js = []
    js.append("/*")
    js.append(" * Du lieu can ho THUC TE tu gio hang chung The TEN & The NEST.")
    js.append(" * Nguon: file xlsx 'Gio hang chung' do Nhu upload — KHONG tu tao/doan du lieu.")
    js.append(" * Cap nhat gio hang: thay file xlsx nguon roi chay lai script build_units.py de tao lai file nay.")
    js.append(" * Chi cac can CO GIA duoc dua vao day (can khong co gia bi loai truoc khi xuat file).")
    js.append(" */")
    js.append("window.TN_UNITS = " + json.dumps(all_units, ensure_ascii=False, indent=2) + ";")
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write("\n".join(js) + "\n")

    report = {
        "the_ten_total_rows_in_cart": len(ten_units) + len([w for w in ten_warn if 'KHONG CO GIA' in w]),
        "the_ten_units_with_price": len(ten_units),
        "the_ten_warnings": ten_warn,
        "the_nest_total_rows_in_cart": len(nest_units) + len([w for w in nest_warn if 'KHONG CO GIA' in w]),
        "the_nest_units_with_price": len(nest_units),
        "the_nest_warnings": nest_warn,
        "total_units_in_system": len(all_units),
    }
    with open(out_report, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("OK. TEN=%d NEST=%d TOTAL=%d" % (len(ten_units), len(nest_units), len(all_units)))

if __name__ == '__main__':
    main()
