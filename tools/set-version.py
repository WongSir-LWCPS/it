#!/usr/bin/env python3
"""
為所有 JS／CSS 的引用加上版本號，令瀏覽器在更新後一定讀取新檔案。
每次修改程式後、上載到 GitHub 前執行一次：
    python3 tools/set-version.py
（不帶參數時以目前時間作版本號；亦可自訂：python3 tools/set-version.py 2026-10-06a）
"""
import pathlib, re, sys, datetime

ver = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime("%Y%m%d%H%M")
root = pathlib.Path(__file__).resolve().parent.parent

js_import = re.compile(r'(from\s+"|import\(")(\.{1,2}/[^"?]+\.js)(\?v=[^"]*)?"')
html_ref = re.compile(r'((?:src|href)=")((?!https?:|//)[^"?]+\.(?:js|css))(\?v=[^"]*)?"')

changed = 0
for path in list(root.rglob("*.js")) + list(root.rglob("*.html")):
    if "tools" in path.parts:
        continue
    s = path.read_text(encoding="utf-8")
    n = js_import.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={ver}"', s)
    if path.suffix == ".html":
        n = html_ref.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={ver}"', n)
    if n != s:
        path.write_text(n, encoding="utf-8")
        changed += 1
print(f"版本號 {ver}，已更新 {changed} 個檔案")
