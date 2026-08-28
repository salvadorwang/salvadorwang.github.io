#!/usr/bin/env python3
"""
把 RSVK 词汇记录 Excel 转成网站用的 data/aoa.json。

用法:
    python3 scripts/build_aoa.py [xlsx路径]
    默认读取 /Users/SalvadorX/Desktop/RSVK-WXY.xlsx

数据更新流程: 改完 Excel 后跑一次本脚本，然后 git add data/aoa.json && commit && push。
依赖: pip install openpyxl pykakasi
"""

import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import openpyxl

try:
    import pykakasi
    _kks = pykakasi.kakasi()
    def to_kana(s):
        """日语词 -> 平假名读音（用于前端汉字/假名双向搜索匹配）。"""
        return "".join(x["hira"] for x in _kks.convert(s))
except ImportError:
    print("警告: 未安装 pykakasi，日语假名读音字段将缺失", file=sys.stderr)
    def to_kana(s):
        return None

PAREN_RE = re.compile(r"[（(]([^）)]*)[）)]")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_XLSX = "/Users/SalvadorX/Desktop/RSVK-WXY.xlsx"
OUTPUT = ROOT / "data" / "aoa.json"
BIRTHDAY = date(2024, 3, 16)


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    wb = openpyxl.load_workbook(xlsx, read_only=True)
    ws = wb["List"]

    words = []
    for row in ws.iter_rows(min_row=4, values_only=True):
        r = (list(row) + [None] * 11)[:11]
        _, d, _aoa, zh, _noc, ja, _noj, _en, meaning, pos, _note = r
        if not isinstance(d, (datetime, date)):
            continue
        if isinstance(d, datetime):
            d = d.date()
        if not zh and not ja:
            continue
        ja_s = str(ja).strip() if ja else None
        kana = None
        if ja_s:
            main = PAREN_RE.sub("", ja_s).strip()  # 去掉括号注音后的主形式
            kana = to_kana(main) if main else None
        words.append({
            "date": d.isoformat(),
            "zh": str(zh).strip() if zh else None,
            "ja": ja_s,
            "kana": kana,
            "meaning": str(meaning).strip() if meaning else "",
            "pos": str(pos).strip() if pos else "",
        })

    words.sort(key=lambda w: w["date"])
    out = {
        "birthday": BIRTHDAY.isoformat(),
        "updated": date.today().isoformat(),
        "words": words,
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    n_zh = sum(1 for w in words if w["zh"])
    n_ja = sum(1 for w in words if w["ja"])
    print(f"写出 {OUTPUT.relative_to(ROOT)}: 共 {len(words)} 条记录 "
          f"(Chinese {n_zh}, Japanese {n_ja})")


if __name__ == "__main__":
    main()
